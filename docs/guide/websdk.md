# WebSocket SDK

`atom-websdk` extends element with `WebRequestSdk` — a structured layer over WebSocket for request/response and subscription patterns against remote microservices.

## Interface address syntax

Two interface types, distinguished by separator:

| Type | Address | Pattern |
|---|---|---|
| Receptive | `host:::ServiceName` | Request → Response (client asks, server answers) |
| Expressive | `host\|\|\|EventName` | Subscription (server pushes, client listens) |

## Setup

`applyAtomWebSDK(Muffin)` bootstraps everything. Call it once at app startup, before composing components:

```js
import { applyAtomWebSDK } from '@muffin/atom-websdk'
applyAtomWebSDK(window.Muffin)
```

When loaded via CDN, this runs automatically if `window.Muffin` exists.

## Making requests

```js
const result = await Muffin.WebInterface.request(
    '@host/app:::AgentService',
    { subject: 'getDetails', params: { id: 'abc123' } },
    { MAX_RESPONSE_TIME: 10000 }
)
```

## Subscriptions

```js
await sdk.websubscribe(
    '@host/app|||broadcast-event',  // expressive interface
    'global',                        // local PostOffice socket to route into
    'broadcast-label',               // message label in that socket
    { MAX_RESPONSE_TIME: 5000 }
)

Muffin.PostOffice.sockets.global.on('broadcast-label', (msg) => {
    this.uiVars.items = msg.items
})
```

## Service class

Wrap SDK calls in a static `Service` subclass. This is the standard pattern across projects:

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

    static async subscribe(handler) {
        await Muffin.sdk.websubscribe(
            '@vritti/ideator|||AgentBroadcast',
            'global',
            'agent-broadcast',
            { MAX_RESPONSE_TIME: 5000 }
        )
        Muffin.PostOffice.sockets.global.on('agent-broadcast', handler)
    }
}
```

Usage in a component:

```js
async onConnect() {
    const details = await AgentService.getDetails(this.uiVars.agentId)
    this.uiVars.agent = details

    AgentService.subscribe((msg) => {
        this.uiVars.status = msg.status
    })
}
```

`Service` base class provides TTL caching, interface locking (no duplicate in-flight requests), and subscription locking (no duplicate listeners).
