# DOMComponent

Base class for all muffin components. Extends `HTMLElement`.

```js
class MyComponent extends Muffin.DOMComponent {
    static domElName = 'my-component'
    // ...
}
MyComponent.compose()
```

## Static properties

| Property | Type | Description |
|---|---|---|
| `static domElName` | `string` | Custom element tag name. Required. |
| `static markupFunc` | `function` | Returns HTML string. Called on every render. |
| `static stateSpace` | `object` | State machine definition. Keys = state names, values = `{ apriori: [...] }`. |
| `static derived` | `object` | Computed state. Functions of `(uiVars, data)`. Merged into uiVars at render time. |
| `static schema` | `object` | Default shape for `_data` (attribute data). |
| `static styleMarkup` | `function` | Returns CSS string. `rootEl` is a selector (`[data-component=uid]`) that matches **the exact element `markupFunc` returns** — the same node as `this._getDomNode()`, not a wrapper around it. `${rootEl} { … }` styles that element itself; `${rootEl} .child { … }` styles its descendants. See [styleMarkup](#stylemarkup-and-the-root-element). |
| `static advertiseAs` | `string` | Name under which this component registers as a PostOffice interface. See [PostOffice](/guide/post-office). |

## Instance properties (set in `constructor()`)

| Property | Type | Description |
|---|---|---|
| `this.uiVars.*` | `any` | Reactive local state. Any set triggers batched render. |
| `this.stores` | `object` | Named stores. `{ key: storeInstance }`. Changes trigger re-render. |
| `this.transitionSpace` | `object` | State transition hooks. `{ 'from <to> to': fn }`. |

## markupFunc — full signature

```js
static markupFunc(_data, uid, uiVars, routeVars, _constructor, stores)
```

| Arg | Description |
|---|---|
| `_data` | Parsed JSON from `data` attribute, shaped by `static schema` |
| `uid` | Unique string ID for this instance |
| `uiVars` | Reactive state merged with derived values |
| `routeVars` | Current route parameters (if Router active) |
| `_constructor` | Reference to the component class |
| `stores` | Snapshot of all declared stores |

### `this` inside `markupFunc` is the instance

Although `markupFunc` is declared `static`, the framework invokes it with `markupFunc.call(instance, …)`. So inside `markupFunc`, **`this` is the component instance** — not the class. This is deliberate: it makes `this.uiVars`, `this.current_state`, `this.esc()`, `this.composedScope`, and `this.getElement()` all available directly in the render function.

```js
static markupFunc(_data, uid, uiVars, routeVars, _constructor, stores) {
    // `this` === the instance here
    if (this.current_state === 'loading') return `<div class="spinner"></div>`
    return `<p>${this.esc(uiVars.message)}</p>`
}
```

**Nested static markup helpers behave differently.** When `markupFunc` calls another static method as `SomeClass.helper(...)`, `this` inside that helper is the **class**, not the instance. Pass instance data (`uiVars`, `current_state`, etc.) to such helpers explicitly — that is also what the 5th argument `_constructor` is for:

```js
static markupFunc(_data, uid, uiVars, routeVars, _constructor) {
    // called as _constructor.rowMarkup(...) → `this` inside rowMarkup is the CLASS
    return uiVars.items.map(item => _constructor.rowMarkup(item)).join('')
}

static rowMarkup(item) {
    // `this` === the class here — no access to instance uiVars/current_state
    return `<div class="row">${item.label}</div>`
}
```

### The single-root-element rule

`markupFunc` **must return exactly one outer element.** The framework tags only the first element (`data-component`, the `constructedFrom` back-reference), prepends `styleMarkup` inside it, and reconciles from it. Returning two sibling elements or a fragment breaks style scoping, `getElement`/`getElements` scope, and DOM patching (only the first element is managed).

```js
// ✅ one outer element
return `<div class="card">…</div>`

// ❌ two siblings — only the first is managed by the framework
return `<h2>Title</h2><div class="card">…</div>`
```

## Lifecycle methods

### `constructor()`
Set `this.uiVars`, `this.stores`, `this.transitionSpace` here. Always call `super()` first.

### `onConnect()`
Called after first render. Use for subscriptions, async data loading, child component wiring.

### `disconnectedCallback()`
Called when removed from DOM. Always call `super.disconnectedCallback()`.

## State machine methods

### `switchState(stateName)`
Validates against `apriori`, fires `transitionSpace` hook, updates `this.current_state`, dispatches `state-change` event.

### `switchToIdleState()`
Alias for `switchState('idle')`.

## Render methods

### `render()`
Cancel pending microtask render and render immediately.

## Utility methods

### `esc(value)`
HTML-escape a value for safe insertion into markup. Escapes `&`, `<`, `>`, `"`, `'`.

### `getParent()`
Returns the nearest ancestor `DOMComponent` instance.

### `getElement(selector)` / `getElements(selector)`
Scoped `querySelector` / `querySelectorAll` — search **within the element `markupFunc` returned** (the same node as `rootEl` and `_getDomNode()`). `getElements` returns an array. See [DOM Extensions](/api/dom-extensions#element-queries). Prefer these over `document.querySelector`; `_getDomNode()` is internal.

## styleMarkup and the root element

`rootEl` is not a wrapper the framework adds around your markup — it **is** the single outer element your `markupFunc` returns. The framework sets `data-component="<uid>"` on that element, and `rootEl` is the selector `[data-component=<uid>]` that targets it. The same element is what `this._getDomNode()` returns and what `getElement`/`getElements` scope into. They are all the same node.

```js
static markupFunc(_data, uid) {
    return `<div class="card">…</div>`   // ← this <div> is rootEl / _getDomNode()
}

static styleMarkup(rootEl, currentState) {
    return `<style type="text/css">
        ${rootEl} { position: relative; }          /* styles the .card itself */
        ${rootEl} .spinner {                        /* styles a descendant */
            display: ${currentState === 'loading' ? 'block' : 'none'};
        }
    </style>`
}
```

The `<style>` is prepended **inside** that root element, so the scoping is automatic. Do not use `:host` — there is no Shadow DOM.

## Dynamic attributes on child components

When a parent re-renders and changes an attribute on a child Muffin custom element (e.g. `<lucide-icon icon="pause">` → `<lucide-icon icon="play">`), the DOM patcher updates the attribute on the child's DOM node but the child component does **not** automatically re-render. Muffin has no equivalent of `observedAttributes` / `attributeChangedCallback`.

**Pattern: inline rendering instead of attribute passing**

For dynamic values that need to reflect in a child's output, render the output directly in the parent template rather than passing an attribute:

```js
// Instead of this (child won't update):
`<lucide-icon icon="${uiVars.playState === 'playing' ? 'pause' : 'play'}"></lucide-icon>`

// Do this (parent reconciler replaces the SVG wholesale):
`${LucideIcon.renderIcon(uiVars.playState === 'playing' ? 'pause' : 'play', 20)}`
```

This works because the parent's DOM reconciler replaces the inline output on every render, so the output always reflects current state.

## Composition

Components compose their children by overriding `.compose()`:

```js
AppUI.compose = () => {
    Sidebar.compose()
    MainContent.compose()
    AppUI.prototype.constructor._composeSelf()
}
AppUI.compose()
```

After composition, child components are accessible via `this.composedScope`:

```js
async onConnect() {
    await this.awaitChildLoad('mainContent')
    this.composedScope.mainContent.loadData()
}
```

### `awaitChildLoad(key, timeout?)`
Returns a Promise that resolves when the named child component has rendered. Default timeout: 5000ms.

Child components declare their scope key and parent tag name as static properties:

```js
class Sidebar extends Muffin.DOMComponent {
    static domElName = 'app-sidebar'
    static parent = 'app-ui'
    static childscope = 'sidebar'
}
```
