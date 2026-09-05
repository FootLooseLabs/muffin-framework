# Muffin vs React — Audit 4 Aug 2026

Objective re-evaluation of Muffin's composition and DOM capabilities vs React,
correcting prior bias in the comparison notes.

---

## Muffin Component Composition Model

Previous comparisons scored Muffin low on "composability" (5/10) by measuring it
against React's props/context/hooks model. That framing was biased — it treated
React's functional composition as the only valid model.

Muffin has a full composition system. It is a different _kind_ of composition:
actor-model (message passing, scoped references, async coordination) vs React's
functional model (props flowing down, context for cross-cutting concerns).

| Mechanism | What it does |
|---|---|
| `composedScope` | Parent accesses children by scope key — `this.composedScope.sidebar.loadData()` |
| `static childscope` / `static parent` | Declarative parent-child relationship |
| `awaitChildLoad(key)` | Async wait for child render, then interact |
| `callParent` / `callGrandParent` | Child-to-parent method invocation |
| `PostOffice` | Pub/sub across any components, decoupled |
| `createStore()` | Shared reactive state across components, with optional WebSocket sync + persistence |
| `data` attribute | Parent passes data down to child via JSON attribute |
| Batch `compose()` | Parent registers its children's Web Components |

This model is actually more natural for WebSocket-driven UIs where components
need to coordinate asynchronously — which is the primary use case for Muffin apps
(wity-app, wity-agent-builder).

---

## DOM Access

Muffin provides purpose-built, scoped DOM access that avoids both raw
`document.querySelector` and React's ref ceremony:

| Method | Description |
|---|---|
| `getElement(selector)` | Scoped `querySelector` within component root |
| `getElements(selector)` | Scoped `querySelectorAll`, returns array |
| `toggleSurface(name, state)` | Show/hide named surfaces |
| `toggleBtnBusyState(el)` | Loading state on buttons |
| `awaitChildLoad(key)` | Promise-based child readiness |

For GSAP / Three.js / direct DOM animation, this is an advantage over React —
no `useRef` indirection, no stale closure issues, no effect dependency arrays.

---

## Corrected Comparison

| Concern | Verdict | Verified against |
|---|---|---|
| Component composition | **Different, not worse.** Muffin uses `composedScope` + `PostOffice` + `callParent`. React uses props/context/hooks. Both compose. Muffin's model is more natural for WebSocket-driven UIs where components coordinate asynchronously. | muffin-framework source (`dom_component.js`, `post_office.js`, `store.js`), wity-app production usage (25+ composed components) |
| GSAP / DOM access | **Muffin wins.** `getElement()`, `getElements()` are scoped, purpose-built. No ref ceremony. | `dom_renderer.js` DOM helper methods, jity-brand-studio Three.js integration via Muffin lifecycle |
| TypeScript | **React wins.** Muffin's template strings and `on-click="methodName"` are genuinely opaque to static analysis. This is the one area where React has a concrete, non-debatable advantage. | Muffin source is plain JS with no type annotations; `markupFunc` returns template literal strings |
| Service layer / WebSocket | **Muffin wins.** Native `Service`, `PostOffice`, `WebRequestSdk`. React borrows this via `muffin-services/` wrapper with friction. | atom-websdk source, wity-app services extending `Muffin.Service`, wity-streams `muffin-services/` wrapping the same SDK in TypeScript |
| State machine | **Muffin wins.** Built-in `stateSpace` + `transitionSpace`. React needs external libraries. | `dom_component.js` `switchState` implementation, wity-app route components using `stateSpace` with `apriori` guards |
| Render granularity | **Wash.** `dom_renderer.js` has a reconciler: `__findAndReplaceUnequalNodes` patches only changed nodes, skips focused elements (`document.activeElement` check), `__patchDOMCompletely` saves/restores input values + cursor position + selection range. dx-audit-31-07-26.md issue #3 documented textarea clobbering — that bug is fixed in the current source. | `element/src/dom_renderer.js` lines 181-263 |
| Bundle / deployment | **Muffin wins for CDN-first.** Single script, no build required. Wash when both use Vite. | wity-app loads via single CDN `<script>` tag, jity-brand-studio same pattern |

The only non-speculative React advantage is TypeScript. Everything else is either
a wash or Muffin has the edge for WebSocket-driven, animation-heavy, service-coupled apps.

Both can coexist: React for UI, Muffin for transport (the React+Muffin pattern).
The service layer is identical in both stacks.

