# Getting Started

Muffin ships two packages:

| Package | Purpose |
|---|---|
| `@muffin/element` | Core — DOMComponent, PostOffice, createStore, Router |
| `@muffin/atom-websdk` | Extension — WebRequestSdk, Service, DOM helpers |

Both are available via CDN (IIFE bundle) or as ES modules via pnpm.

## CDN (script tag)

```html
<!-- element only -->
<script src="https://cdn.footloose.io/element/0.9.2/element.min.js"></script>

<!-- full SDK (element + atom-websdk bundled) -->
<script src="https://cdn.footloose.io/atom-websdk/2.0.6/sdk.min.js"></script>
```

After loading, the global `window.Muffin` is available:

```js
const { DOMComponent, PostOffice, createStore, Router, Lexeme } = window.Muffin
```

## Vite project (ESM)

```bash
pnpm add @muffin/element @muffin/atom-websdk
```

```js
import { DOMComponent, createStore } from '@muffin/element'
import { WebRequestSdk, Service } from '@muffin/atom-websdk'
```

## Defining a component

```js
class MyCard extends DOMComponent {
    __init__() {
        this.uiVars = { title: 'Hello', count: 0 }
    }

    markupFunc(data, uid, uiVars) {
        return `
            <div class="card">
                <h2>${uiVars.title}</h2>
                <p>Count: ${uiVars.count}</p>
                <button on-click="increment">+</button>
            </div>
        `
    }

    increment() {
        this.uiVars.count++   // triggers re-render automatically
    }
}

customElements.define('my-card', MyCard)
```

```html
<my-card></my-card>
```
