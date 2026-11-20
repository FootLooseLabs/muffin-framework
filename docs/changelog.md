# Changelog

Release history for `@muffin/atom-websdk`. Each release bundles the corresponding `@muffin/element` version.

---

## 3.5.0 — element 0.11.0
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.5.0/dist/sdk.min.js`

### The connection ([WebRequestSdk](/api/web-request-sdk#the-connection))
- **Kept open, when asked** (`reconnect: true`, or `{ backoff: [ms…] }`): once `connect()` is called, a connection
  that closes is opened again — at once when the page is shown again or the device is back online, else after a
  growing wait (1s … 30s) — until `disconnect()`. Offline, it waits for the device to be online, and a socket the
  network took away is closed at once. Each time it is open again its subscriptions are made again at the gateway,
  then `resumed` is dispatched, for whatever waited on events to read what it missed. Without the option nothing
  changes: a close leaves it closed.
- **Its state, public:** `state` (`idle`, `connecting`, `connected`, `reconnecting`, `offline`), dispatched as `state`
  on each change, and `connected`. Nothing outside the SDK needs `_socketState` or `_connection`.
- **`token` may be a function:** asked each time it connects, a reconnect too — for sign-ins that live minutes.
- **A connect whose socket closes before it opens rejects.** It used to wait forever when no error came first.

### Subscriptions
- **One route unsubscribed:** `webunsubscribe(address, { socketName, label })` ends that route only; the gateway is told
  when it was the last. Two parts of an app on one subscription no longer end each other's. Without them, as before:
  every route.

### Another SDK on the page
- **A connection keeps its own Muffin.** It looked up `window.Muffin` each time it opened a socket or routed an event,
  so another SDK loaded later on the page (a widget's, 2.x) took its sockets and events over. It now keeps the Muffin
  it was made in.

### Services and types
- **`@muffin/atom-websdk/service`:** `Service` as a module, runtime-neutral — for an app whose services are defined as
  its modules load, before the browser SDK is there (the same code as `Muffin.Service`). Installed from git
  (`npm i github:FootLooseLabs/atom-websdk#v3.5.0`). Replaces the `ElementWebService` an app copied in.
- `@muffin/atom-websdk` ships its browser types (`src/main.d.ts`): `WebRequestSdk`, `Service`, their options and
  events — apps no longer declare them by hand.

**Upgrading:** nothing to change. An app that reopened its connection and made its subscriptions again itself can
pass `reconnect` and drop that code.

---

## 3.4.2 — element 0.11.0
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.4.2/dist/sdk.min.js`

- **One socket at a time.** `connect()` called again while connecting (two parts of an app reconnecting at once) used
  to open a second socket: sends failed until the newer one opened, and the older stayed open, delivering events
  twice. Calls made while connecting now share that one attempt; a replaced socket no longer affects the connection.
  Calling `connect()` on an open connection still opens a fresh one.

**Upgrading:** nothing to change.

---

## 3.4.1 — element 0.11.0
Installable from git (`npm i github:FootLooseLabs/atom-websdk#v3.4.1`): the workspace link to `@muffin/element` moved to
the muffin-framework workspace root. Code identical to 3.4.0.

---

## 3.4.0 — element 0.11.0
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.4.0/dist/sdk.min.js`

### Requests and replies ([WebRequestSdk](/api/web-request-sdk#requests-and-replies))
- **Each request gets its own reply.** Replies were matched by interface alone: two requests in flight to one
  interface could each get the other's reply, and a reply after a timeout went to the next request. Every request now
  carries a `ref`; the gateway (rtc:webrequest-handler, deployed alongside) sends it back on the reply. Any number of
  requests can be in flight to one interface, in any order. With a gateway that sends no `ref`, one request per
  interface at a time — learnt from the connection's first reply — so replies are never crossed either way.
- **A request settles once, and always.** A reply with `result: null` resolves (it never did); a closed connection
  rejects everything waiting at once (it waited out each timeout); a request leaves no listeners or timers behind
  (each left two listeners, never removed). Failures reject with the reply (`error`) or with `{ message }`.
- **`webunsubscribe(address)`** ends a subscription (apps sent the frame by hand).
- **`websubscribe`** delivers each event once per socket and label, however often it is called.
- **`request(address, message, options)`** is `webrequest`; the lexeme form `request(label, frame, opLabel?)` still
  works and is deprecated.

### Service ([Service](/api/service))
- **Each service class its own cache** — it was one cache for all, so keys collided.
- **Locks hand on in order** instead of polling every 500 ms; the throttle argument is no longer used.

### For Node: `@muffin/atom-websdk/core`
`RequestChannel`, the request protocol the browser SDK is built on, for MCP servers and CLIs: ESM, CommonJS and
types, no DOM. jity-mcp, wity-mcp and wity-cli use it.

**Upgrading:** nothing to change. Afterwards, drop any queue that sends one request per interface at a time, and any
unsubscribe that sends its own frame (use `webunsubscribe`).

---

## 3.3.0 — element 0.11.0
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.3.0/dist/sdk.min.js`

### Router: headless routing, complete ([Router](/api/router))
- **Route table.** A route may declare a `path` with named params: `{ name: 'idea', path: 'explore/:slug' }`, and `*` for the rest of the path. `match()` gives `{ name, route, params }`, with params from the path over the query's. `href('idea', { slug })` and `go('idea', { slug })` fill the path and put the rest in the query; a missing param is an error. Going to a path by name (`go('explore/' + slug)`) keeps working and matches the declared route. This replaces apps matching route names against their own regexes.
- **`beforeLeave({ ask, pending? })`.** Asked before `go()`, Back and Forward. A no, a throw or a rejection keeps the page where it is. `pending()` makes the browser ask before the page itself is left (`beforeunload`). Back and Forward are asked about through the Navigation API (every engine since January 2026). The browser allows one refusal per user activation, so a person can always leave. Guards that answer at once decide immediately; a guard that asks the person holds the step until they answer, then the step is retaken to the same entry. Tested in Chromium and Firefox.
- **`onChange(listener)`.** Every route shown, with `{ name, route, params, from }`. The `onBeforeLoad` message now carries `route` too, and `params` include the path's.
- **`go()` returns a Promise of whether it went.** With no guard, or guards that answer at once, it still goes immediately.
- **Route names keep their escapes** (`%2F` inside a param), and writing one doesn't double-encode them.

**Upgrading:** nothing to change. Afterwards, an app's route outlet can drop its own name parsing and pattern regexes (declare `path` instead) and its after-the-fact "leave?" check (register a guard instead). The outlet keeps only what the page looks like.

---

## 3.2.0 — element 0.10.0
**CDN:** `https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.2.0/dist/sdk.min.js`

### Router: the address is the one source of truth ([Router](/api/router))
- **The query a page was opened with is no longer lost or repeated.** At load, the router used to `go()` to the route it read, which pushed a history entry. In path style it rebuilt the address from a parse that dropped the first query param, so `/?assistant-session=x` became `/home` and lost the param. Params were also appended to the name it had read, so `?a&k=1` became `?a&k=1&k=1`. Loading now adds no history entry. An address that names no route is left as it is, and the default route is shown. The route and params are read from the address, never from `history.state`.
- **Path style writes params as a standard query:** `/learn?tab=x`, not `/learn&tab=x`. The old form is read and rewritten in place once, so links and bookmarks keep working. Params are encoded and decoded (`URLSearchParams`), so values with `&`, `=`, spaces or `#` are safe.
- **`basePath` is real.** It was accepted but ignored. In path style, routes now live below it and the base itself names no route.
- **New:** `href(name, params)`, the address `go()` would write (for links); `match(url)`, which route an address is on; and `go(name, params, { replace: true })` for redirects, so Back doesn't return to the address that was left.
- **`go()` accepts params as a query string** (`'a=1&b=2'`, as `gotoRoute`'s `route-params` gives them), and drops `undefined` and `null` values. Going to the address you're already on reuses the history entry.
- In query and hash style, a name re-serialised by `URLSearchParams` (`?learn=`) is still read as the name. A hash that is data rather than a route (`#p=1&c=2`) is left alone.
- Back and Forward are handled with `addEventListener('popstate')`, so the router no longer takes over `window.onpopstate`.
- Removed (internal, unused outside the router): `_getParamsObjFromPathString`, `_getRouteNameFromWindowLocation`, `_getRouteNameFromHistoryState` and `updateRouteObjParams`.

**Upgrading:** nothing to change. Afterwards, replace any address built from `routeDelimiter` with `href()`, and any parsing of `location` with `match()`.

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
