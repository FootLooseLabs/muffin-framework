# WebRequestSdk

Core WebSocket client. Available as `Muffin.WebRequestSdk`. Used directly or wrapped in a `Service` subclass.

```js
const sdk = new Muffin.WebRequestSdk(config)
await sdk.connect()
```

## Interface address syntax

| Separator | Type | Description |
|---|---|---|
| `host:::Name` | Receptive | Request → Response |
| `host\|\|\|Name` | Expressive | Subscription / push |

## Methods

### `connect()`
Establish the WebSocket connection. Returns a Promise. Auto-reconnects on disconnect with cooldown. Keep-alive ping every 59s.

### `request(lexemeLabel, message, opLabel?, opts?)`
Send a request and await a matching response.

```js
const res = await Muffin.WebInterface.request(
    '@host/app:::ServiceName',
    { subject: 'getData', params: { id: 1 } },
    { MAX_RESPONSE_TIME: 10000 }
)
```

### `websubscribe(interface, socketName, msgLabel, opts?)`
Register a persistent subscription. Routes incoming messages to a named PostOffice socket.

```js
await sdk.websubscribe(
    '@host/app|||BroadcastEvent',
    'global',
    'local-broadcast',
    { MAX_RESPONSE_TIME: 5000 }
)

Muffin.PostOffice.sockets.global.on('local-broadcast', (msg) => {
    // handle push
})
```

### `communicate(message)`
Fire-and-forget. No response expected.

### `webrequest(interface, requestMsg, opts?)`
High-level request shorthand.

## Muffin.WebInterface

In projects, `Muffin.WebInterface` is the shared singleton `WebRequestSdk` instance, initialized at boot in `3_app.js`:

```js
Muffin.WebInterface = new Muffin.WebRequestSdk({ label: 'sandbox', ... })
await Muffin.WebInterface.connect()
```

Service classes reference `Muffin.WebInterface` directly rather than creating their own SDK instance.
