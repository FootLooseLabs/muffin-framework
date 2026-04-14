# DOMComponent

Base class for all muffin components. Extends `HTMLElement`.

```js
class MyComponent extends Muffin.DOMComponent {
    static domElName = 'my-component'
    // ...
}
MyComponent.compose()
```

## Static properties (declare on class)

| Property | Type | Description |
|---|---|---|
| `static domElName` | `string` | Custom element tag name. Required. |
| `static markupFunc` | `function` | Returns HTML string. Called on every render. |
| `static stateSpace` | `object` | State machine definition. Keys = state names, values = `{ apriori: [...] }`. |
| `static derived` | `object` | Computed state. Functions of `(uiVars, data)`. Merged into uiVars at render time. |
| `static schema` | `object` | Default shape for `_data` (attribute data). |
| `static advertiseAs` | `string` | Registers this component as a named PostOffice interface. |
| `static parent` | `string` | Tag name of expected parent component. |
| `static childscope` | `string` | Key under which this component registers in parent's `composedScope`. |
| `static styleMarkup` | `function` | Returns CSS string for dynamic per-state styles. |

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

### `awaitChildLoad(childscope, timeout?)`
Returns a Promise that resolves when the named child has rendered. Default timeout: 5000ms.

## composedScope

After composition, `this.composedScope` holds references to declared child components by `childscope` key:

```js
const child = this.composedScope.mainContent
```
