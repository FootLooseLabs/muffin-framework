# WebSocket SDK

`atom-websdk` adds to element the client for the web interface: `WebRequestSdk` — requests to services and
subscriptions to their events, over one WebSocket to the gateway — and `Service`, the base class of an app's web
services. Reference: [WebRequestSdk](/api/web-request-sdk), [Service](/api/service).

## Interface addresses

| Kind | Address | |
|---|---|---|
| Receptive | `host:::ServiceName` | a request, answered by one reply |
| Expressive | `host\|\|\|EventName` | a subscription: the service's events |

## Setup

Loaded from the CDN, the SDK attaches itself to `window.Muffin`. With ESM, call `applyAtomWebSDK` once at start-up:

```js
import { applyAtomWebSDK } from '@muffin/atom-websdk'
applyAtomWebSDK(window.Muffin)
```

Then make the app's connection, once:

```js
Muffin.WebInterface = new Muffin.WebRequestSdk({ name: 'app', client_id, token, config })
await Muffin.WebInterface.connect()
```

## Requests

```js
const reply = await Muffin.WebInterface.request(
    '@host/app:::AgentService',
    { subject: 'getDetails', params: { id: 'abc123' } },
    { MAX_RESPONSE_TIME: 10000 }
)
reply.result
```

Requests can be made at once, to the same interface or others: each gets its own reply. A failure rejects with the
reply (its `error`), or with `{ message }` when no reply came in time or the connection closed.

## Subscriptions

```js
await Muffin.WebInterface.websubscribe('@host/app|||broadcast-event', 'global', 'broadcast-label')

Muffin.PostOffice.sockets.global.on('broadcast-label', (msg) => {
    this.uiVars.items = msg.result.items
})

// when no longer wanted
await Muffin.WebInterface.webunsubscribe('@host/app|||broadcast-event')
```

## Service class

The standard pattern: a static `Service` subclass per service.

```js
class AgentService extends Muffin.Service {
    static name = 'AgentService'

    static Interfaces = {
        Main: '@vritti/ideator:::AgentDevelopmentService'
    }

    static async getDetails(id) {
        const res = await Muffin.WebInterface.request(
            this.Interfaces.Main,
            { subject: 'getDetails', params: { slug: id } },
            { MAX_RESPONSE_TIME: 10000 }
        )
        return res.result
    }
}
```

```js
async onConnect() {
    this.uiVars.agent = await AgentService.getDetails(this.uiVars.agentId)
}
```

`Service` gives each service its own TTL cache, and named locks for what must not run twice at once — see
[Service](/api/service). Requests need no lock.

## Connection

The SDK does not reconnect by itself. On `close` (`Muffin.WebInterface.eventInterface`), everything waiting is
rejected, and so is a request made while it is closed. The app calls `connect()` again (calls made while it is
opening share one attempt) and asks once it resolves.
