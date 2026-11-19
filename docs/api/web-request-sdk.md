# WebRequestSdk

The WebSocket client for the web interface: requests to services, and subscriptions to their events. Available as
`Muffin.WebRequestSdk`; apps keep one instance, `Muffin.WebInterface`, and their services use it.

```js
Muffin.WebInterface = new Muffin.WebRequestSdk({
    name: 'app',                       // the PostOffice socket's name
    client_id, token,                  // who connects (the gateway checks the token)
    config: { api_protocol: 'wss://', hostName: 'api.example.com', path: 'wsapi' },
})
await Muffin.WebInterface.connect()
```

Instead of `config`, `label` picks a preset: `'sandbox'` or `'sandbox_local'` (localhost:8877).

## Interface addresses

| Address | Kind | |
|---|---|---|
| `host:::Name` | Receptive | a request, answered by one reply |
| `host\|\|\|Name` | Expressive | a subscription: the service's events, until it ends |

## Requests and replies

Any number of requests can be in flight at once, to any interface, answered in any order: each carries a `ref`, and
the gateway sends it back on the reply to that request, so every request gets its own reply. On a connection whose
gateway does not send `ref` back (an older gateway), the SDK sends one request per interface at a time — it learns
which from the connection's first reply — so replies are never crossed either way.

A request **resolves** with its reply (`{ op, result, statusCode, … }`; `result` may be `null`). It **rejects**:

- with the reply, when the reply carries an `error` (the service failed, timed out, was not allowed, …);
- with `{ message }` when no reply came within `MAX_RESPONSE_TIME`, the connection closed while it waited, or the
  connection was not open.

## Methods

### `connect()`
Opens the connection; resolves when it is open, rejects if it cannot be made. Calls made while it is opening share
that one attempt. It does not reconnect by itself: on a close the SDK dispatches `close` (below), every request
waiting is rejected, and the app calls `connect()` again. While open, the SDK sends `ping` every `keepAliveTimeout` ms
(default 60000).

### `disconnect()`
Closes the connection; requests still waiting are rejected.

### `webrequest(address, message, options?)`
A request (`host:::Name`), or a subscription (`host|||Name`, message `null`).

```js
const reply = await Muffin.WebInterface.webrequest(
    '@vritti/ideator:::AgentDevelopmentService',
    { subject: 'getDetails', object: { slug } },
    { MAX_RESPONSE_TIME: 10000 }
)
reply.result
```

`options.MAX_RESPONSE_TIME` (ms, default 5000): how long the reply is waited for — and, sent as the request's `ttl`,
how long the gateway waits for the service.

### `request(address, message, options?)`
The same as `webrequest`. Its older form `request(lexemeLabel, frame, opLabel?, options?)` still works (without
`opLabel` it only sends the frame) and is deprecated.

### `websubscribe(address, socketName = 'global', label?, options?)`
Subscribes, and delivers each of the subscription's events on the PostOffice socket `socketName` as `label` (default:
the event's `op`). Each event is delivered once per socket and label, however often this is called.

```js
await Muffin.WebInterface.websubscribe('@vritti/ideator|||AgentBroadcast', 'global', 'agent-broadcast')
Muffin.PostOffice.sockets.global.on('agent-broadcast', (msg) => { /* … */ })
```

Subscribing again to one subscription makes it anew at the gateway (its events still arrive once).

### `webunsubscribe(address, options?)`
Ends a subscription: its events are no longer delivered, and the gateway stops them. Resolves with the gateway's
acknowledgement; rejects with the reply when it had no such subscription (`statusCode: 404`). Closing the connection
ends all of its subscriptions.

### `communicate(lexemeLabel, frame)`
Sends a lexicon frame and expects nothing back. Low level; requests use `webrequest`.

## Events

On `sdk.eventInterface` (a PostOffice interface):

| Event | When |
|---|---|
| `connect` | the connection opened |
| `close` | the connection closed |
| `error` | the connection failed, or a message could not be read |
| `incoming-msg` | any message without an `error` |
| `incoming-response` | a reply |
| `incoming-event` | a subscription's event (`op: "EVENT:::<address>"`) |
| `agent-error` | a message with an `error` |

## In Node

The request protocol is the same for MCP servers and CLIs: `@muffin/atom-websdk/core` exports `RequestChannel`, which
this SDK is built on. It has no DOM and needs no Muffin. See the
[atom-websdk README](https://github.com/FootLooseLabs/atom-websdk#node-requestchannel).
