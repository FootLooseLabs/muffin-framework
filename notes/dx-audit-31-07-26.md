# DX Audit — 31 Jul 2026

Field audit from a multi-day debugging session on wity-app (visual-ideation-page, knowledge-graph-v2, node-edit-card) and the Muffin framework internals. Every item below was observed first-hand in production code, not hypothesised.

---

## 1. Issues encountered during this session

| # | Area | What happened | Root cause | Impact | Resolution |
|---|------|---------------|------------|--------|------------|
| 1 | **Store-driven re-render** | `nodeEditStore.set({ tags })` in node-edit-card did not re-render the component. Tag pills never appeared after pressing comma — only the store was updated, the DOM stayed stale. | Known issue #4 (store subscriptions not firing) may still affect components on older atom-websdk versions. Even if resolved, a full re-render would clobber textarea contents the user is actively editing (title, content fields read from store at render time, not from live DOM). | Had to bypass store re-renders entirely and use direct DOM manipulation (`_syncTagPills`) to show tag pills. | Manual DOM update alongside store update. Framework-level fix would require partial/scoped re-rendering that preserves form element state. |
| 2 | **Silent error swallowing** | `_mapThoughtVectorsToNodeVectors` crashed on plain tags (non-`:::` format). The `catch` block called `switchState("errored")`, which was silently blocked by the state machine (transition not permitted). No console output. Graph showed vector count but rendered nothing — zero visibility into what went wrong. | Two compounding issues: (a) catch block had no `console.error`, (b) `switchState` silently returns without warning when the transition is not in the `apriori` list. | Debugging took hours. The only clue was a Muffin warning: `switchState — transition 'loaded -> errored' not permitted by apriori`. No stack trace, no error message from the actual failure. | Added `console.error` to the catch block. The state machine's silent return is a framework-level issue — see recommendation below. |
| 3 | **Full-string re-render model** | node-edit-card uses `markupFunc` (returns full HTML string). When the store updates to add a tag pill, the entire card is re-rendered from the template string — including textareas. Textarea values come from the store (set at `open()` time), not from the live DOM. Any user edits to title/content since opening would be lost on re-render. | `markupFunc` returns a complete HTML string. There is no mechanism to update a subtree (e.g. just the tags row) without replacing the entire component DOM. | Forced the `_syncTagPills` workaround — direct DOM manipulation to update pills without triggering a full re-render. This is the exact pattern React's granular reconciliation solves. | No framework-level fix available. Components with form inputs should avoid store-driven re-renders or must snapshot/restore DOM state in `postRender`. |
| 4 | **`on-click` not wired on dynamically inserted elements** | Pills created via `document.createElement` + `insertBefore` don't get Muffin's `on-click="removeTag"` event binding — the framework only processes `on-*` attributes during `__processRenderedFragEventListeners` after a full `render()` call. | Event binding is a post-render pass, not a live MutationObserver. Dynamically inserted DOM elements are invisible to it. | Must use native `addEventListener` on dynamically created elements. Two event systems coexist in the same component. | This is an inherent limitation of the string-template + post-render-bind model. Not fixable without a fundamentally different rendering approach. |
| 5 | **Lexicon schema doesn't constrain — extra fields pass silently** | `Lexicon.BaseGraphPrompt.inflect(payloadObj)` accepted `subject` and `object` fields that aren't in `BaseGraphPrompt`'s schema (`{ message, vector, params, context }`). The Lexeme constructor does `{...schema, ...info}` — extra fields merge without validation. | `Lexeme` is a shape helper, not a validator. It provides defaults but doesn't reject unknown fields. | A developer used `BaseGraphPrompt` (wrong Lexicon) instead of `BaseRequest` (correct Lexicon) for a call that needed `subject`/`object`. The call appeared to work (fields passed through) but the semantic mismatch masked the real routing issue for months. Tags were sent in `object` but the backend handler only read `title`/`content` from it. | Not a bug per se, but the Lexicon pattern provides a false sense of structure. Consider adding a `strict` mode that warns on unknown fields. |

---

## 2. Patterns that required workarounds

| Pattern | What developers expect | What Muffin does | Workaround cost |
|---------|----------------------|------------------|-----------------|
| **Partial DOM update** | Update just the tags row without touching textareas | Full `markupFunc` re-render replaces everything | Write and maintain `_syncTagPills` — 30 lines of imperative DOM code that duplicates the template's tag pill markup |
| **Form state preservation across re-renders** | Textarea values survive a parent re-render | Textarea content comes from the template string, not the DOM. Re-render resets to last store value. | Either (a) never re-render while form is open, or (b) snapshot DOM values into the store on every input event. Both are boilerplate React gives for free. |
| **Child-to-parent data flow** | Child emits structured data to parent | `callParent` + `pass-uivars` passes serialised attribute values. Works, but untyped and implicit. `getParent()?.methodName()` is the escape hatch. | Acceptable for simple cases. Breaks down when the data is complex or the parent method signature changes — no compile-time feedback. |
| **Cross-component reactivity** | Store update in component A re-renders component B | Depends on known issue #4 being resolved AND the component version. Even when working, re-render is full-string. | Manual `store.subscribe(() => this.render())` in `onConnect()`. Safe but verbose. |

---

## 3. Strengths observed

These are things Muffin handles well that should be preserved in any modernisation:

| Strength | Where observed |
|----------|----------------|
| **PostOffice + WebInterface + Lexicon** | ThoughtManagementService — clean request/response pattern over WebSocket with interface locking, subscription management, and typed message shapes. This is a genuine platform layer that React + Zustand cannot replicate without significant custom code. |
| **State machine** | `switchState` with `apriori` transition guards is a sound pattern for page lifecycle (loading/loaded/errored). The issue is silent failure, not the concept. |
| **`composedScope`** | Parent-to-child component references via `composedScope['child-name']` are clean and predictable (once `awaitChildLoad` timing is understood). |
| **`getVectorInterface` cache** | knowledge-graph-v2 maintains a `#viCache` Map for O(1) uid-to-component lookup, wired reactively via child-composed/child-disconnected events. Well-designed. |
| **Lightweight component model** | No virtual DOM, no JSX compiler, no build-time transforms. Components are plain ES classes. For content-heavy pages with minimal interactivity, this is genuinely lighter than React. |

---

## 4. Recommendations

### Framework level
1. **`switchState` should `console.warn` with the error/reason when a transition is blocked** — silent returns make debugging nearly impossible.
2. **Consider a scoped re-render mechanism** — even a simple `this.renderFragment(selector, html)` that patches a subtree by ID would eliminate the most common workaround (manual DOM manipulation to avoid full re-render clobbering form state).
3. **Lexicon strict mode** — `Lexeme.inflect(info, { strict: true })` that warns when `info` contains keys not in the schema. Opt-in, zero breaking changes.
4. **Store `set()` should merge by default** — `store.set({ tags: [...] })` currently depends on implementation details of whether it replaces or merges. Document the contract explicitly; if it replaces, provide `store.patch()` for partial updates.

### Project level (wity-app)
1. **Add `console.error` to every empty `catch` block** — the silent catch in `_mapThoughtVectorsToNodeVectors` cost hours of debugging. Grep for `catch` blocks with no logging.
2. **Audit Lexicon usage** — `updateThoughtVectorContent` used `BaseGraphPrompt` when it should arguably use `BaseRequest` (or at least the `subject`/`object` fields should be documented as intentional extensions). Ensure each service method uses the correct Lexicon class.
3. **Components with form inputs should not bind `this.stores`** — store-driven re-renders will reset form values. Use stores for data flow but trigger UI updates imperatively or via targeted DOM patches.
