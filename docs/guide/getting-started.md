# Getting Started

Muffin is a client-side platform built on Web Components. It has two layers:

| Package | Purpose |
|---|---|
| `@muffin/element` | Core — DOMComponent, PostOffice, createStore, Router, Lexeme |
| `@muffin/atom-websdk` | Network layer — WebRequestSdk, Service, DOM extensions |

Both ship as a single CDN bundle (`sdk.min.js`) or as separate ES modules.

## CDN

```html
<script src="https://cdn.footloose.io/atom-websdk/2.0.6/sdk.min.js"></script>
```

After loading, `window.Muffin` is available with everything:

```js
const { DOMComponent, PostOffice, createStore, Router, WebRequestSdk } = window.Muffin
```

## Vite project (ESM)

```bash
pnpm add @muffin/element @muffin/atom-websdk
```

## Defining a component

```js
class MyCard extends Muffin.DOMComponent {
    static domElName = 'my-card'

    static markupFunc(_data, uid, uiVars) {
        return `
            <div class="card">
                <h2>${uiVars.title}</h2>
                <p>Count: ${uiVars.count}</p>
                <button on-click="increment">+</button>
            </div>
        `
    }

    constructor() {
        super()
        this.uiVars.title = 'Hello'
        this.uiVars.count = 0
    }

    increment(srcEl, ev) {
        this.uiVars.count++   // triggers re-render automatically
    }
}

MyCard.compose()
```

```html
<my-card></my-card>
```

## Bootstrap

Projects initialize Muffin in a numbered script sequence:

```js
// main.js
import './scripts/1_touchpoint.js'     // CDN load
import './scripts/2_utilities.js'
import './scripts/3_app.js'            // Router setup, root component
import './scripts/4_polyfills.js'      // DOM extensions (until migrated to atom-websdk)
import './components/index.js'         // all .compose() calls
```

```js
// 3_app.js
Muffin._router = new Muffin.Router({ routeDelimiter: '?', basePath: '/app/' })
Muffin._router.addRouteConfig([
    { name: 'home', defaultRoute: true },
    { name: 'detail' }
])
```

```html
<script type="module">import('/src/main.js')</script>
<app-ui></app-ui>
```
