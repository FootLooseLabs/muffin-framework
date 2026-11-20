# Service

The base class of an app's web services: static classes whose methods ask services through `Muffin.WebInterface`
([WebRequestSdk](/api/web-request-sdk)). It gives each service a TTL cache, and named locks.

```js
class AgentService extends Muffin.Service {
    static name = 'AgentService'

    static Interfaces = {
        Dev: '@vritti/ideator:::AgentDevelopmentService'
    }

    static async getDetails(slug) {
        const cached = this.getCached(`details-${slug}`)
        if (cached) return cached
        const res = await Muffin.WebInterface.request(
            this.Interfaces.Dev,
            { subject: 'getDetails', params: { slug } },
            { MAX_RESPONSE_TIME: 10000 }
        )
        this.setCached(`details-${slug}`, res.result)
        return res.result
    }
}

const details = await AgentService.getDetails('abc')
```

Services are static: never instantiated. In a static method `this` is the class, so there is no `this.interface`.

An app whose services are defined as its modules load (a bundled app, before the SDK script has run) extends the same
class as a module — `@muffin/atom-websdk/service`, installed from git (`npm i github:FootLooseLabs/atom-websdk#v3.5.0`):

```ts
import { Service } from '@muffin/atom-websdk/service'

export default class AgentService extends Service { /* … as above */ }
```

## Built-in behaviour

### TTL cache — each service its own
```js
static getCached(key)                // → value, or null when absent or expired
static setCached(key, value, ttl?)   // ttl in ms, default 60000
static clearCache(key?)              // one key, or all of this service's
```

Each service class has its own cache: two services may use the same key.

### Locks
```js
static async lockInterface(name)     // waits until `name` is free, then holds it
static unlockInterface(name)         // lets the next one waiting have it
static async lockSubscription(name)
static unlockSubscription(name)
```

One holder per name at a time; the others wait, and get it in the order they asked. Names are shared by every service.
Always release in a `finally`.

A lock is for not doing one thing twice at once — subscribing to the same thing from two places, or an operation that
must not overlap itself. It is **not** needed for requests: any number can be in flight to one interface, and each gets
its own reply.

## Subscribing from a service

A service has no component interface. Subscribe on a PostOffice socket, and let the component listen there:

```js
class WalletService extends Muffin.Service {
    static name = 'WalletService'

    static async watchBalance() {
        await this.lockSubscription('balance')
        try {
            await Muffin.WebInterface.websubscribe('@host/wallet|||BalanceChanged', 'global', 'balance-changed')
        } finally {
            this.unlockSubscription('balance')
        }
    }
}
```

```js
// once, where the app starts (a socket's listeners stay as long as the page)
async onConnect() {
    if (this.constructor._listening) return
    this.constructor._listening = true
    await WalletService.watchBalance()
    Muffin.PostOffice.sockets.global.on('balance-changed', (msg) => { this.uiVars.balance = msg.result.balance })
}
```

Each event is delivered once per socket and label, however many times `websubscribe` is called;
`Muffin.WebInterface.webunsubscribe(address)` ends it.