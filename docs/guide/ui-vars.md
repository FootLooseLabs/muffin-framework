# Reactive State (uiVars)

`uiVars` is a Proxy-wrapped object. Setting any property automatically schedules a batched re-render — no manual `render()` calls needed.

## Setting up uiVars

Declare in `constructor()`:

```js
constructor() {
    super()
    this.uiVars.count = 0
    this.uiVars.loading = false
    this.uiVars.items = []
}
```

## Auto-render on mutation

```js
increment(srcEl, ev) {
    this.uiVars.count++   // schedules render automatically
}
```

Multiple mutations in the same call produce one render (batched via `queueMicrotask`):

```js
async loadData() {
    this.uiVars.loading = false
    this.uiVars.data = result
    this.uiVars.error = null
    // → one render, not three
}
```

## Forcing an immediate render

`render()` cancels any pending microtask and fires synchronously. Useful when you need the DOM updated before continuing:

```js
async loadData() {
    this.uiVars.loading = true
    this.render()                    // show spinner now
    const data = await fetch(...)
    this.uiVars.loading = false
    this.uiVars.data = data
}
```

## Derived (computed) state

Declare computed values as a `static` property on the class. They are evaluated on every render and merged into `uiVars` for use in `markupFunc`:

```js
class OrderList extends Muffin.DOMComponent {
    static domElName = 'order-list'

    static derived = {
        isEmpty:      (uiVars, data) => uiVars.orders.length === 0,
        activeCount:  (uiVars, data) => uiVars.orders.filter(o => o.active).length,
        totalValue:   (uiVars, data) => uiVars.orders.reduce((sum, o) => sum + o.value, 0)
    }

    constructor() {
        super()
        this.uiVars.orders = []
    }

    static markupFunc(_data, uid, uiVars) {
        if (uiVars.isEmpty) return `<p>No orders</p>`
        return `
            <p>${uiVars.activeCount} active — $${uiVars.totalValue} total</p>
        `
    }
}
```

Derived values are read-only in `markupFunc`. Never set them directly on `uiVars`.

## Shallow proxy

The Proxy is shallow — mutating a nested property won't trigger a render. Reassign the top-level key:

```js
// Does NOT trigger render
this.uiVars.user.name = 'Ankur'

// Correct
this.uiVars.user = { ...this.uiVars.user, name: 'Ankur' }
```

## uiVars vs stores

| | `uiVars` | `createStore()` |
|---|---|---|
| Scope | Local to one component instance | Shared across any number of components |
| Persistence | No | Optional (IndexedDB via localforage) |
| Socket sync | No | Optional (PostOffice interface) |
| Use for | UI state, loading flags, form input, local view state | Session, domain data, anything shared |
