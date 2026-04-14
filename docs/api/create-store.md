# createStore()

Creates a named reactive store shared across components.

```js
const store = Muffin.createStore(name, initialState, options?)
```

## Parameters

| Parameter | Type | Description |
|---|---|---|
| `name` | `string` | Unique store name |
| `initialState` | `object` | Initial state values |
| `options.persist` | `boolean` | Persist to IndexedDB via localforage. Rehydrates on load. |
| `options.socket` | `string` | PostOffice interface name for socket sync |
| `options.socketLabel` | `string` | Message label to listen for on the socket |

## Return value

A frozen store object:

| Method | Description |
|---|---|
| `get()` | Returns current state snapshot |
| `set(partial)` | Merges partial state, notifies all subscribers |
| `reset()` | Resets to `initialState` |
| `subscribe(fn)` | Calls `fn(state)` on every change. Returns unsubscribe function. |

## Examples

### Basic

```js
const uiStore = Muffin.createStore('ui', { sidebarOpen: false })

uiStore.set({ sidebarOpen: true })
uiStore.get()  // → { sidebarOpen: true }
```

### With persistence

```js
const sessionStore = Muffin.createStore('session',
    { user: null, token: null },
    { persist: true }
)
```

### With socket sync

```js
const liveStore = Muffin.createStore('live-feed',
    { posts: [] },
    { socket: 'WebInterface', socketLabel: 'feed-update' }
)
```

### Declaring on a component

```js
constructor() {
    super()
    this.stores = { session: sessionStore, ui: uiStore }
}

static markupFunc(_data, uid, uiVars, routeVars, _constructor, stores) {
    return `
        <nav class="${stores.ui.sidebarOpen ? 'open' : 'closed'}">
            ${stores.session.user ? stores.session.user.name : 'Guest'}
        </nav>
    `
}
```

### Subscribing outside a component

```js
sessionStore.subscribe((state) => {
    if (!state.user) redirectToLogin()
})
```
