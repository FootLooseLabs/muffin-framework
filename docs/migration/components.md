# Component Migration: v2 → v3

This guide covers component-level coding patterns that change between v2 and v3. It is a self-contained reference for migrating individual component files — consult [Upgrading to v3.0.0](/migration/v3) for project-level changes (CDN URL, polyfill removal, etc.).

Every pattern here is derived from real migration bugs. Read it before touching a component.

---

## 1. Reactive `uiVars` — what triggers a render now

In v2, `uiVars` is a plain object. Setting a property does nothing on its own; you must call `this.render()` (or `this.renderSelectively()`) explicitly to update the DOM.

In v3, `uiVars` is a Proxy. Assigning any **top-level property** automatically schedules a re-render (batched via `queueMicrotask`). Multiple assignments in the same call produce one render.

```js
// v2 — render() required
this.uiVars.loading = false
this.render()

// v3 — render() is optional; the assignment schedules it
this.uiVars.loading = false
```

**Explicit `render()` still works** — it cancels the pending microtask and fires immediately. Leaving existing `render()` calls in place is safe. Remove them incrementally.

---

## 2. Nested `uiVars` mutations — the most common v3 bug

The Proxy watches **top-level property assignments only**. Mutating a nested property goes through the inner object, not the Proxy, so no render is scheduled.

```js
// BUG — nested mutation, Proxy never fires, no render
this.uiVars.authState.isLoggedIn = true
this.uiVars.authState.user = { name: 'Ana' }

// CORRECT — replace the whole top-level property
this.uiVars.authState = {
    isLoggedIn: true,
    user: { name: 'Ana', email: user.email, picture: user.picture },
    userCredit: this.uiVars.authState.userCredit,  // preserve fields you're not changing
}
```

**Rule:** if `uiVars.x` is an object or array, always replace it with a new value, never mutate it in-place.

---

## 3. `renderSelectively()` — when it does nothing

`renderSelectively()` only updates DOM nodes that carry a `data-uivar` attribute. If your markup has no such nodes, calling it is a no-op — the DOM will not update.

```js
// v2 — renderSelectively() was paired with data-uivar attributes
// <span data-uivar="count">${uiVars.count}</span>
this.uiVars.count++
this.renderSelectively()

// v3 — if your markup has no data-uivar nodes, drop the call entirely.
// The uiVars assignment already schedules a full re-render.
this.uiVars.count++
```

**Rule:** after any `uiVars` assignment in v3, do not call `renderSelectively()` unless you intentionally have `data-uivar` nodes and need a targeted DOM update only. Dead `renderSelectively()` calls are harmless but misleading — remove them.

---

## 4. Do not store non-template state in `uiVars`

Because `uiVars` assignments trigger renders, storing anything that is not needed by `markupFunc` in `uiVars` causes unnecessary re-renders.

```js
// BAD — DOM node references, intermediate values, event payloads
this.uiVars.allLinkElms = document.querySelectorAll('a')  // triggers render

// CORRECT — use a plain instance property
this.allLinkElms = document.querySelectorAll('a')

// CORRECT — or a local variable if only needed in one method
const linkElms = document.querySelectorAll('a')
```

**Typical offenders:** cached DOM queries, computed values only used in JS logic, flags used between methods but not in markup.

---

## 5. Child component preservation — `childscope` is required

When a parent component re-renders, Muffin tries to preserve existing child component instances in the DOM rather than destroying and recreating them. In v3 this preservation is **scoped by `childscope` attribute**.

A child component without a `childscope` attribute is not preserved — it is destroyed and recreated on every parent render. This is intentional for leaf/presentational components that are cheap to recreate (e.g. `lucide-icon`).

For stateful child components that must persist across parent renders (open state, subscriptions, internal timers, etc.), add a unique `childscope` per instance:

```html
<!-- markupFunc template — parent component -->

<!-- Stateful child: needs childscope so it survives parent re-renders -->
<account-panel childscope="account"></account-panel>
<nav-panel childscope="nav-primary"></nav-panel>

<!-- Multiple instances of same type — each needs a distinct scope -->
<tab-panel childscope="tab-overview"></tab-panel>
<tab-panel childscope="tab-settings"></tab-panel>

<!-- Leaf/presentational — no childscope needed, cheap to recreate -->
<lucide-icon icon="home" size="18"></lucide-icon>
```

**Rule:** any child component with internal state, active subscriptions, or event listeners that must survive parent re-renders needs a unique `childscope`. Two instances of the same component type must have different `childscope` values.

---

## 6. `getParent()` timing — only valid after ancestry is resolved

`getParent()` traverses the composed ancestry chain, which is built asynchronously when the component connects to the DOM. Calling it in the `constructor` will return `undefined`.

```js
// BUG — called in constructor, ancestry not yet resolved
constructor() {
    super()
    const parent = this.getParent()  // undefined
    parent.someMethod()              // throws
}

// CORRECT — call in onConnect() or postRender()
onConnect() {
    const parent = this.getParent()  // resolved
    parent.someMethod()
}
```

**`onConnect()`** fires after the element connects to the DOM and ancestry resolves. **`postRender()`** fires after every render cycle. Both are safe.

---

## 7. `compose()` pattern — always call `super.compose()`

When overriding `compose()`, call `super.compose()` first. Skipping it prevents the framework from wiring up reactivity, stores, and ancestry.

```js
// CORRECT
compose() {
    super.compose()
    this.mySetup()
}
```

If you need child component setup, call the child's `compose()` after:

```js
compose() {
    super.compose()
    this.childPanel?.compose()
}
```

---

## 8. Route wrapper height — `h-full` requires an explicit parent height

`height: 100%` resolves against the parent's `height` CSS property. It does **not** inherit from `min-height`. If a `<render-at-route>` wrapper uses `min-height` instead of `height`, any child component that reads `clientHeight` at init time will see `0`.

```html
<!-- WRONG — render-at-route sets min-height, child gets clientHeight=0 -->
<render-at-route min-height="100%" class="w-full">
    <div class="flex flex-col w-full" route="my-route">
        <!-- component reads clientHeight → 0 -->
        <my-canvas-component></my-canvas-component>
    </div>
</render-at-route>

<!-- CORRECT — add h-full to the route wrapper div so height chain is complete -->
<render-at-route min-height="100%" class="w-full h-full">
    <div class="flex flex-col w-full h-full" route="my-route">
        <my-canvas-component></my-canvas-component>
    </div>
</render-at-route>
```

This matters most for components that initialize viewport/canvas dimensions on connect (pan-zoom, canvas, chart libraries).

---

## 9. No Shadow DOM

v3 components do not use Shadow DOM. All markup is rendered into the regular DOM. Do not call `this.attachShadow()` or reference `this.shadowRoot`.

---

## Component migration checklist

Work through this list for each component file you migrate:

- [ ] **Nested `uiVars` mutations** — replace `this.uiVars.obj.prop = x` with a full object assignment
- [ ] **Dead `renderSelectively()` calls** — remove any call not paired with `data-uivar` nodes
- [ ] **Non-template state in `uiVars`** — move DOM refs, flags, and intermediate values to plain instance properties
- [ ] **Child components with state** — add unique `childscope` attributes in markup
- [ ] **`getParent()` in constructor** — move to `onConnect()` or `postRender()`
- [ ] **`compose()` override** — confirm `super.compose()` is the first call
- [ ] **Route wrapper divs** — add `h-full` if any child reads dimensions at init time
- [ ] **Explicit `render()` calls after `uiVars` assignments** — safe to leave, remove when touching the file
