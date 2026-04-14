# Stores

`createStore()` creates a named reactive store. Any component that declares a store re-renders automatically when it changes. Stores are plain JS objects — defined once, imported wherever needed.

## Creating a store

```js
const sessionStore = Muffin.createStore('session', {
    user: null,
    token: null
})
```

With options:

```js
const sessionStore = Muffin.createStore('session',
    { user: null, token: null },
    {
        persist: true,            // save to IndexedDB via localforage, rehydrate on load
        socket: 'WebInterface',   // PostOffice interface to sync with
        socketLabel: 'session-update'
    }
)
```

## Using in a component

Declare stores in `constructor()`. They are passed as the 6th argument to `markupFunc` as a snapshot:

```js
class UserBadge extends Muffin.DOMComponent {
    static domElName = 'user-badge'

    constructor() {
        super()
        this.stores = { session: sessionStore }
    }

    static markupFunc(_data, uid, uiVars, routeVars, _constructor, stores) {
        if (!stores.session.user) return `<span>Not logged in</span>`
        return `<span>${stores.session.user.name}</span>`
    }
}
```

Store changes automatically trigger re-render on any component that has declared it.

## Store API

```js
sessionStore.get()                   // → current state snapshot
sessionStore.set({ user: userData }) // partial merge, notifies all subscribers
sessionStore.reset()                 // resets to initial state
const unsub = sessionStore.subscribe(state => { ... })  // returns unsubscribe fn
```

## Reading outside components

```js
sessionStore.subscribe((state) => {
    if (!state.user) redirectToLogin()
})

const current = sessionStore.get()
```

## Persistence

```js
const cartStore = Muffin.createStore('cart', { items: [] }, { persist: true })
```

State survives page refresh. Written to IndexedDB after every `set()`. Rehydrated before first render.

## Socket sync

```js
const liveStore = Muffin.createStore('live', { feed: [] }, {
    socket: 'WebInterface',
    socketLabel: 'feed-update'
})
```

Incoming messages on the named PostOffice interface update the store. Store `set()` calls publish back to the socket.

This gives you something React+Zustand cannot do out of the box: a store that auto-syncs from a WebSocket subscription and persists to IndexedDB, declared in a single line.
