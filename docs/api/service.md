# Service

Base class for SDK service layers. Extends with TTL caching, interface locking, and subscription locking.

```js
class MyService extends Muffin.Service {
    static name = 'MyService'

    static Interfaces = {
        Main: '@host/app:::ServiceInterface'
    }

    static async getData(id) {
        const res = await Muffin.WebInterface.request(
            this.Interfaces.Main,
            { subject: 'getData', params: { id } },
            { MAX_RESPONSE_TIME: 10000 }
        )
        return res.result
    }
}

// Usage
const data = await MyService.getData('abc')
```

Services are static classes — no instantiation. There is no `this.interface` in a service; `this` in a static method refers to the class itself, not a component instance.

## Subscribing from a static service

Because services have no component instance, there is no `this.interface` to dispatch or subscribe on. To subscribe to a WebSocket message and forward it to a consumer component, pass the consumer's interface name directly to `Muffin.WebInterface.subscribe()`:

```js
class WalletService extends Muffin.Service {
    static name = 'WalletService'

    static Interfaces = {
        Main: '@host/app:::WalletService'
    }

    // Called once from the consumer component's onConnect()
    static subscribeToBalance(consumerInterfaceName) {
        Muffin.WebInterface.subscribe(
            this.Interfaces.Main,
            consumerInterfaceName,   // ← consumer's interface name as a string
            { subject: 'balance-update' }
        )
    }
}
```

The consumer component then listens on its own interface:

```js
async onConnect() {
    WalletService.subscribeToBalance(this.interface.name)
    this.interface.on('balance-update', (msg) => {
        this.uiVars.balance = msg.balance
    })
}
```

`this.interface` is only available on **component instances**, never inside static service methods.

## Built-in behaviour

### TTL cache
```js
static getCached(key)           // → value or null
static setCached(key, value, ttl?)   // default ttl = 60s
static clearCache(key)
```

Repeated calls with the same key return cached result without hitting the socket.

### Interface locking
```js
static async lockInterface(name, throttle?)    // default throttle = 500ms
static unlockInterface(name)
```

Prevents duplicate simultaneous requests for the same operation. Second call waits for first to resolve.

### Subscription locking
```js
static async lockSubscription(name, throttle?) // default throttle = 200ms
static unlockSubscription(name)
```

Prevents duplicate listeners accumulating across component reconnects.

## Full example

```js
class AgentService extends Muffin.Service {
    static name = 'AgentService'

    static Interfaces = {
        Dev: '@vritti/ideator:::AgentDevelopmentService'
    }

    static async getDetails(slug) {
        const cached = this.getCached(`details-${slug}`)
        if (cached) return cached

        await this.lockInterface('getDetails')
        try {
            const res = await Muffin.WebInterface.request(
                this.Interfaces.Dev,
                { subject: 'getDetails', params: { slug } },
                { MAX_RESPONSE_TIME: 10000 }
            )
            this.setCached(`details-${slug}`, res.result)
            return res.result
        } finally {
            this.unlockInterface('getDetails')
        }
    }
}
```
