# Muffin Framework — Internal Reference

> Source-verified. Do NOT update docs without cross-checking against this file.
> Last reviewed: 2026-04-14 against element/src, atom-websdk/src, wity-agent-builder, wity-app, jity-dam.

---

## 1. Component Definition

Components are **static-method based**, not instance-method based. `markupFunc`, `stateSpace`, `derived`, `schema`, `interfaces` are ALL static.

```javascript
class MyComponent extends Muffin.DOMComponent {
    static domElName = "my-component";

    static markupFunc(_data, uid, uiVars, routeVars, _constructor, stores) {
        return `<div>${uiVars.someVar}</div>`
    }

    static stateSpace = {
        idle:    { apriori: ['loading'] },
        loading: { apriori: ['idle', 'error'] },
        error:   { apriori: ['loading'] }
    }

    static derived = {
        isEmpty: (uiVars, data) => uiVars.items.length === 0
    }
}
```

### Registration — `.compose()` NOT `customElements.define()`

```javascript
MyComponent.compose()
```

Batch composition pattern (parent composes children):

```javascript
AppUI.compose = () => {
    SideNav.compose()
    MainContent.compose()
    AppUI.prototype.constructor._composeSelf()
}
AppUI.compose()
```

---

## 2. markupFunc — Exact Signature

```javascript
static markupFunc(_data, uid, uiVars, routeVars, _constructor, stores)
```

| Position | Arg | Description |
|---|---|---|
| 0 | `_data` | Component schema / external attribute data |
| 1 | `uid` | Unique instance ID string |
| 2 | `uiVars` | Reactive local state (Proxy) — derived values merged in |
| 3 | `routeVars` | Current route parameters |
| 4 | `_constructor` | Reference to the component class |
| 5 | `stores` | Snapshot of all subscribed stores |

---

## 3. uiVars

Set on `this` in constructor (NOT in `__init__()`):

```javascript
constructor() {
    super()
    this.uiVars.count = 0
    this.uiVars.isLoading = false
    this.uiVars.items = []
}
```

Setting any property triggers batched render via `queueMicrotask`. Multiple mutations → one render.

**Proxy is shallow** — mutate nested objects by reassigning the top-level key.

---

## 4. Event Binding

Syntax in markup:
```html
<button on-click="methodName">Click</button>
<input on-input="methodName" />
<select on-change="methodName"></select>
<div on-scroll="methodName"></div>
<div on-keyup="methodName"></div>
<img on-load="methodName" />
<div on-contextmenu="methodName"></div>
```

Handler signature — **TWO arguments**, not one:
```javascript
methodName(srcEl, ev) {
    // srcEl = the element that triggered the event
    // ev = native event object
}
```

`on-contextmenu` automatically calls `ev.preventDefault()`.

---

## 5. render-if

```html
<div render-if="uiVars.isVisible">...</div>
<button render-if="uiVars.count > 5">...</button>
<span render-if="stores.user?.loggedIn">...</span>
```

- Scope: only `uiVars`, `data`, `stores` available in expression
- Elements with false render-if get `display: none` — remain in DOM
- Fail-open: expression errors show the element

---

## 6. State Machine

```javascript
static stateSpace = {
    idle:    { apriori: ['loading'] },
    loading: { apriori: ['idle', 'error'] },
    error:   { apriori: ['loading'] }
}

constructor() {
    super()
    this.transitionSpace = {
        'idle <to> loading': () => { /* hook before transition */ },
        'loading <to> loaded': () => { /* hook */ }
    }
}

// Switch states:
this.switchState('loading')
this.switchToIdleState()  // alias for switchState('idle')
```

`switchState` → validates apriori → fires transitionSpace callback → dispatches `state-change` CustomEvent → updates `this.current_state`.

---

## 7. Stores

```javascript
const userStore = Muffin.createStore('user',
    { name: '', email: '' },   // initial state
    {
        persist: true,           // IndexedDB via localforage
        socket: 'WebInterface',  // PostOffice interface to sync
        socketLabel: 'user-updated'
    }
)
```

Declare on component in constructor:
```javascript
constructor() {
    super()
    this.stores = {
        user: userStore,
        settings: settingsStore
    }
}
```

Read in markupFunc via 6th arg `stores` (snapshot, not live proxy).

Store API: `get()`, `set(partial)`, `reset()`, `subscribe(fn) → unsubscribe`.

---

## 8. PostOffice

```javascript
// Advertise an interface (component publishes events)
static advertiseAs = 'NotificationManager'

onConnect() {
    this.advertisedInterface = Muffin.PostOffice.getOrCreateInterface(
        'NotificationManager', this.constructor.interfaceSpecs
    )
    this.advertisedInterface.on('notify-foreground', (msg) => { ... })
}

// Use a published interface from anywhere
Muffin.NotificationManager('message text', { duration: 1500 })

// Global broadcast/listen
Muffin.PostOffice.sockets.global.dispatchMessage('custom-event', data)
this.interface.on('custom-event', (msg) => { ... })
```

---

## 9. WebRequestSdk & WebInterface

**Receptive interface** (request/response): `host:::interface`
**Expressive interface** (subscription/push): `host|||interface`

```javascript
// Request
const result = await Muffin.WebInterface.request(
    'host:::ServiceInterface',
    { subject: 'getDetails', params: { id: 123 } },
    { MAX_RESPONSE_TIME: 10000 }
)

// Subscription
await sdk.websubscribe(
    'host|||broadcast-event',
    'global',
    'local-event-label',
    { MAX_RESPONSE_TIME: 5000 }
)

Muffin.PostOffice.sockets.global.on('local-event-label', (msg) => { ... })
```

---

## 10. Service Pattern

Static class extending `Muffin.Service`:

```javascript
class AgentService extends Muffin.Service {
    static name = 'AgentService'

    static Interfaces = {
        AgentInterface: '@host/app:::AgentServiceInterface'
    }

    static async getDetails(id) {
        const res = await Muffin.WebInterface.request(
            this.Interfaces.AgentInterface,
            { subject: 'getDetails', params: { id } },
            { MAX_RESPONSE_TIME: 10000 }
        )
        return res.result
    }
}

// Usage in component
const details = await AgentService.getDetails(id)
```

Service base class provides: TTL cache (`getCached/setCached/clearCache`), interface locking (`lockInterface/unlockInterface`), subscription locking (`lockSubscription/unlockSubscription`).

---

## 11. Bootstrap / Entry Point

Projects import scripts in order (wity-agent-builder pattern):
```javascript
// main.js
import './styles/main.css'
import './scripts/1_touchpoint.js'     // CDN touchpoint
import './scripts/2_humanized_time.js' // utilities
import './scripts/3_app.js'            // Muffin.Router, root component
import './scripts/4_polyfills.js'      // extend Muffin with project helpers
import './components/index.js'         // all components composed here
```

`3_app.js` pattern:
```javascript
Muffin._router = new Muffin.Router({
    routeDelimiter: '?',
    basePath: '/tools/agent-builder/'
})
Muffin._router.addRouteConfig([
    { name: 'home', defaultRoute: true },
    { name: 'detail' }
])
```

HTML:
```html
<script type="module">import('/src/main.js')</script>
<app-ui></app-ui>
```

---

## 12. Parent-Child Communication

```javascript
// Child declares parent
static parent = 'app-ui'
static childscope = 'mainContent'

// Parent accesses child
await this.awaitChildLoad('mainContent', 3000)
const child = this.composedScope.mainContent

// Child calls parent
const parent = this.getParent()
parent.methodName(srcEl, ev, data, uiVars)

// Markup shorthand (uses callParent polyfill)
<button on-click="callParent" pass-data="save">Save</button>
```

---

## 13. Surface / Tab Pattern (from polyfills)

```html
<div surface="panel-a" class="_active">Content A</div>
<div surface="panel-b">Content B</div>
<button on-click="toggleTargetSurface" data-target="panel-b" data-state="switch">Switch</button>
```

```javascript
this.toggleSurface('panel-a', 'show')   // state: 'show' | 'hide' | 'switch'
this.isSurfaceActive('panel-a')          // → boolean
```

---

## 14. Polyfills Status

These are in project `4_polyfills.js` / `service-polyfill.ts`. They have been promoted to atom-websdk in the modernized version but projects haven't migrated yet.

| Polyfill | Promoted to |
|---|---|
| `Muffin.Service` | `atom-websdk/src/service.js` |
| `getElement/getElements` | `atom-websdk/src/dom_extensions.js` |
| `callParent/callGrandParent` | `atom-websdk/src/dom_extensions.js` |
| `awaitChildLoad` | `atom-websdk/src/dom_extensions.js` |
| `initSubscriptions` | `atom-websdk/src/dom_extensions.js` |
| `toggleSurface/isSurfaceActive` | `atom-websdk/src/dom_extensions.js` |
| `toggleBtnBusyState` | `atom-websdk/src/dom_extensions.js` |
| `notifyUser` | `atom-websdk/src/dom_extensions.js` |
| `copyToClipboard` | `atom-websdk/src/dom_extensions.js` |
| `Router.prototype.updateHistory` | `atom-websdk/src/dom_extensions.js` |
| `Array.splitIntoMultipleArrays` | `atom-websdk/src/dom_extensions.js` |
| `String.ellipsify` | `atom-websdk/src/dom_extensions.js` |

---

## 15. jity-dam (React + Muffin) Specifics

- TypeScript throughout
- React = primary UI. Muffin Web Components = islands (real-time widgets)
- Zustand used for React-side state — NOT Muffin stores
- Muffin SDK loaded via wrapper `muffin-sdk/` local module, not direct CDN
- Service polyfill is TypeScript class in `src/muffin-sdk/service-polyfill.ts`
- PostOffice bridge used for React↔muffin communication

---

## CRITICAL: Things the old docs got wrong

1. **`__init__()` is NOT how components set uiVars** — use constructor
2. **`customElements.define()` is NOT how components register** — use `.compose()`
3. **`markupFunc` is STATIC** — not an instance method
4. **Handler signature is `(srcEl, ev)`** — not `(event)`
5. **`stateSpace` is a STATIC property** — not set in constructor
6. **`derived` is a STATIC property** — not set in `__init__()`
7. **`Muffin.sdk.connect()`** does not exist as shown — it's `Muffin.WebInterface` or `new Muffin.WebRequestSdk(config)`
