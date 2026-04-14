# Stores

`createStore()` creates a named reactive store shared across components. Any component subscribed to a store re-renders automatically when it changes.

## Basic usage

```js
import { createStore } from '@muffin/element'

const cartStore = createStore('cart', {
    items: [],
    total: 0
})
```

## API

```js
createStore(name, initialState, options?)
```

| Option | Type | Description |
|---|---|---|
| `persist` | `boolean` | Persist state to IndexedDB via localforage. Rehydrates on next load. |
| `socket` | `string` | PostOffice interface name. Store changes sync over that socket. |

Returns a frozen store object:

| Method | Description |
|---|---|
| `store.get()` | Returns current state snapshot |
| `store.set(partial)` | Merges partial state, notifies all subscribers |
| `store.reset()` | Resets to initial state |
| `store.subscribe(fn)` | Calls `fn(state)` on every change. Returns unsubscribe function. |

## Using in a component

Declare stores on the component. They are passed as the 6th argument to `markupFunc` and trigger re-renders automatically.

```js
class CartWidget extends DOMComponent {
    __init__() {
        this.stores = { cart: cartStore }
        this.uiVars = { open: false }
    }

    markupFunc(data, uid, uiVars, routeVars, _c, stores) {
        const { items, total } = stores.cart
        return `
            <div class="cart">
                <span>${items.length} items — $${total}</span>
            </div>
        `
    }
}
```

## Persistence

```js
const sessionStore = createStore('session', { user: null }, { persist: true })
```

State is written to IndexedDB after every `set()` call and rehydrated automatically on page load. No extra code needed in components.

## Socket sync

```js
const liveStore = createStore('live-feed', { posts: [] }, {
    socket: 'main-socket'   // PostOffice interface name
})
```

Incoming messages on `main-socket` update the store. Store `set()` calls publish back to the socket.
