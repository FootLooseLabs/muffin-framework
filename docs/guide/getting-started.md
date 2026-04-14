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

