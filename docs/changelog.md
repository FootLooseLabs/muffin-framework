# Changelog

Release history for `@muffin/atom-websdk`. Each release bundles the corresponding `@muffin/element` version.

---

## 3.1.7 — element 0.9.3
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.7/dist/sdk.min.js`

### Fixed
- **`render()` called before `connectedCallback`** — `render()` now silently returns if the component has not yet initialised (no `markupFunc`). Previously this would throw or produce a blank render if something triggered a render call (e.g. a store subscription firing) before the component was fully connected.

---

## 3.1.6 — element 0.9.3
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.6/dist/sdk.min.js`

### Fixed
- **Store subscriptions not registering** — Components declaring `this.stores` in `constructor()` were not auto-re-rendering when the store changed externally. Root cause: `_subscribeToStores()` ran inside `super()` before the subclass constructor could assign `this.stores`, so the subscription was never set up. Fixed by moving the call to `connectedCallback()` where the full constructor chain has run. Manual `store.subscribe(() => this.render())` workarounds in `onConnect()` can be removed after upgrading.

---

## 3.1.5 — element 0.9.2
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.5/dist/sdk.min.js`

### Added
- **Expanded `on-*` event bindings** — `on-keydown`, `on-keyup`, `on-focus`, `on-blur`, and `on-dblclick` are now supported as declarative attribute bindings alongside the existing `on-click`, `on-change`, `on-input`, `on-scroll`, `on-load`, `on-contextmenu`. Imperative `addEventListener` workarounds for these events can be removed after upgrading.

---

## 3.1.4 — element 0.9.2
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.4/dist/sdk.min.js`

### Added
- **`disconnectedCallback` lifecycle** — When a child component with `childscope` is removed from the DOM, it now automatically cleans up its entry from the parent's `composedScope` and dispatches a `child-disconnected` event on the parent's interface. Completes the add-on-connect / remove-on-disconnect lifecycle for composed children. Components can also define `onDisconnect()` which fires on removal.

---

## 3.1.3 — element 0.9.2
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.3/dist/sdk.min.js`

### Fixed
- **Search / text input losing focus during re-render** — When a parent component re-rendered and the DOM reconciler determined that a subtree had structurally changed (e.g. a grid with a different number of child items), it was replacing the entire subtree including any focused `<input>` inside it, causing focus loss. The reconciler now recurses surgically into subtrees that contain the currently focused element rather than replacing them wholesale.

---

## 3.1.2 — element 0.9.2

### Fixed
- **Focused input value lost after full DOM replacement** — In cases where `__patchDOMCompletely` replaced a node, the previously focused element's value and selection position were not restored. Now captures focus state before replacement and restores it after.

---

## 3.1.1 — element 0.9.2

### Fixed
- **Focused element replaced during DOM reconciliation** — Added an `activeElement` guard at the leaf-node level of the DOM reconciler to prevent replacing a node that is currently focused.

---

## 3.1.0 — element 0.9.2

### Fixed
- **Parent re-renders destroying child component state** — Child Muffin components (`childscope`) were being torn down and recreated on every parent re-render. The reconciler now preserves existing child component DOM nodes across parent renders, maintaining child state, subscriptions, and event listeners.
- **Component registry race condition** — Fixed a race where `customElements.define` could be called before the registry entry was available, causing silent failures on first compose.
