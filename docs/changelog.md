# Changelog

Release history for `@muffin/atom-websdk`. Each release bundles the corresponding `@muffin/element` version.

---

## 3.1.9 — element 0.9.5
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.9/dist/sdk.min.js`

### Fixed
- **Imperatively-set attributes stripped on re-render (regression in 3.1.8)** — 3.1.8's stale-attribute removal deleted every live attribute absent from the new render, including attributes set imperatively via `toggleRootAttr` or app code. Components that open by setting a root attribute and then re-render (e.g. a modal whose `show()` updates a store and calls `toggleRootAttr('is-open', true)`) closed immediately. Each render now records which attributes `markupFunc` produced; the patcher removes only those the new render dropped. Conditionally rendered attributes (`disabled`, `readonly`, …) are still removed; imperatively-set ones are kept, as in 3.1.7. **Upgrade from 3.1.8.**

---

## 3.1.8 — element 0.9.4
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.1.8/dist/sdk.min.js`

### Fixed
- **Focused button grafted into a new view after re-render** — The reconciler refused to replace any subtree containing `document.activeElement`, and never replaced the focused node itself. A real mouse click focuses the clicked button, so when that click switched views (e.g. "← Back" from a paste view to a choice view) the old subtree was patched index-by-index into unrelated new markup and the focused button survived inside it — showing "← Back" as the title of a different button. Focus protection now applies only to editable fields (`input`, `textarea`, `select`, contenteditable) and only between nodes of the same tag; any other node is replaced and focus returns to the replacement when it is the same control (same tag, and for non-editables the same `on-click`). Full DOM swaps use the same logic, so keyboard focus on buttons now also survives re-renders. Behaviour changes: a subtree containing a just-clicked button and a stateful child component is now replaced (the child is recreated) instead of accidentally preserved; programmatic focus restoration fires `on-focus` handlers; changing the tag of an input's wrapper mid-typing replaces the wrapper and restores value and caret (an in-progress IME composition is interrupted).
- **Boolean attribute removal on re-render** — Boolean attributes (`disabled`, `readonly`, `checked`, etc.) set conditionally in `markupFunc` were never removed from the live DOM when the condition flipped, because `__patchUnequalAttributes` only applied/updated attributes from the new render but never called `removeAttribute` for attributes absent in the new render. Now iterates the live node's attributes and removes any that are not present in the rendered fragment. `data-state` is explicitly skipped — it is set by the framework, not by `markupFunc`, and must persist across renders.
- **`on-load` not firing for cached images** — For cached resources the browser sets `img.complete = true` synchronously at fragment creation time, before `__processRenderedFragEventListeners` runs. The `load` event had already fired with no handler attached. The binder now checks `el.complete === true` immediately after attaching the `onload` handler and fires a synthetic `load` event if so. Safe for non-image elements (`complete` is `undefined`, which is falsy).
- **`webrequest` token always `[object Promise]`** — `_generateToken()` is async but was called without `await` inside the synchronous `Promise` constructor, so the token sent to the server was always an unresolved `Promise` object. Moved the `await` outside the `Promise` constructor so the resolved hex token is sent correctly.
- **`webrequest` / `request` ignoring caller-provided `MAX_RESPONSE_TIME`** — The default parameter `options = { MAX_RESPONSE_TIME: 5000 }` is entirely replaced when any options object is passed (e.g. `{ MAX_RESPONSE_TIME: 300000 }`), but a bare `{}` or `{ opLabel }` would leave `options.MAX_RESPONSE_TIME` as `undefined`, causing the client-side timeout to fire instantly. Changed to `options = {}` with `const maxResponseTime = options.MAX_RESPONSE_TIME ?? 5000` so the fallback only applies when the key is genuinely absent.
- **`disconnect()` not implemented** — `disconnect()` was declared in TypeScript types but absent at runtime, causing a crash (`sdkcon.disconnect is not a function`) in projects that call it on cleanup. Implemented: cancels the keep-alive interval, nulls `onclose`/`onerror` handlers (preventing spurious reconnect/error events from a voluntary close), closes the socket with code 1000, and nulls `_connection`.

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
