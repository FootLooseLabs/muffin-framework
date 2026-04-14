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

Services are static classes — no instantiation.

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
