---
Muffin+TW+Vite vs React+TW+Vite
Post-modernisation snapshot — expected state after changes discussed 14 Apr 2026

Changes in scope:
  1. uiVars → Proxy-based, batched render scheduling (auto-render on mutation, no manual render() required)
  2. `derived` property on components for declarative computed state
  3. Muffin.createStore() — named reactive stores with opt-in localforage persistence and opt-in PostOffice socket sync
  4. component-data / DataSource deprecated — shim retained for legacy, new code uses stores
  5. Polyfills absorbed — ElementWebService (caching + locking), surface/tab/child helpers promoted into atom-websdk proper
  6. eval() in render-if replaced with constrained expression evaluator — scoped to uiVars/data/stores only,
     no open eval(). Guardrail built into the rendering pipeline itself, not a compiler step.
  7. Built-in esc() sanitization helper shipped as part of the rendering pipeline — available in every
     markupFunc automatically, closes the XSS surface from within the template model.

▎ Scores reflect what these seven changes concretely deliver. Dimensions with no in-scope change are not inflated.

┌───────────────────────┬─────────────────┬───────┬──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│       Dimension       │ Muffin (pre→post)│ React │                                                            Notes                                                                        │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Developer Experience  │ 5 → 6.5         │ 8     │ Manual render() calls eliminated across the board — the single most repeated boilerplate in wity-agent-builder and wity-app.             │
│                       │                 │       │ eval() replaced with scoped evaluator; esc() available in every markupFunc. Template literals stay — this is a design choice, not a gap. │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Composability         │ 5 → 6           │ 9     │ createStore() replaces the PostOffice workaround for shared state — components subscribe by reference, no message label archaeology.     │
│                       │                 │       │ Attribute-as-string prop passing between components is unchanged. callParent/callGrandParent still exist. Gap to React stays large.      │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Reactivity / State    │ 4 → 7           │ 8     │ Biggest mover. Proxy uiVars eliminates the two-step (mutate + render()) pattern everywhere. Render batching ends the storm problem.      │
│                       │                 │       │ `derived` gives declarative computed state — no more manual hasItems/isEmpty chains. Stores give reactive cross-component state.         │
│                       │                 │       │ Remaining gap: full-string component re-render on every cycle (no fine-grained DOM updates). React still ahead on granularity.           │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Type safety           │ 3 → 3           │ 8     │ No change. Framework core stays JS. on-click="methodName" still untyped string. Store schema is runtime-validated not compile-time.     │
│                       │                 │       │ TypeScript for the core is not in this scope. React gap unchanged.                                                                        │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Markup authoring      │ 4 → 6.5         │ 8     │ eval() replaced with constrained scoped evaluator (change 6). esc() built into pipeline (change 7). Both risks addressed within the    │
│                       │                 │       │ template literal model — no compiler introduced. Template literals are a principled choice: no build dependency, works in any editor,    │
│                       │                 │       │ naturally mixable with raw HTML. React's 8 here reflects a compiler-dependent model with its own tradeoffs, not a universally better    │
│                       │                 │       │ approach. Remaining deduction: unbalanced tags still fail at runtime not build time — acceptable given component size discipline.        │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Vite integration      │ 6 → 6           │ 9     │ No change. SSR prerender plugin still exists but remains unused in both wity-agent-builder and wity-app.                                │
│                       │                 │       │ Polyfill absorption reduces per-project setup lines but does not change Vite plugin story.                                                │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Flexibility / Control │ 8 → 8           │ 7     │ Unchanged — Muffin still wins here. Store + PostOffice + WebRequestSdk is a broader client-side platform than React's UI layer.         │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Performance ceiling   │ 7 → 7.5         │ 7     │ Batched renders eliminate the render storm pattern observed in wity-agent-builder (3 sequential renders on a single user action).       │
│                       │                 │       │ Full string re-render per component is unchanged — no vDOM, no fine-grained patching. Half-point only; not a tier change.               │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Maintainability       │ 4 → 5.5         │ 8     │ Polyfill absorption is meaningful: ~500 lines of 4_polyfills.js and duplicated ElementWebService in React projects become first-class   │
│                       │                 │       │ atom-websdk exports. DataSource/component-data deprecated with shim — cleaner mental model going forward.                               │
│                       │                 │       │ Still a custom framework = tribal knowledge. Any React dev still cannot read Muffin cold. Gap to React largely intact.                  │
├───────────────────────┼─────────────────┼───────┼──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Onboarding            │ 3 → 3.5         │ 9     │ Stores make the data model more legible (named, JS-defined, findable in code). Small improvement only.                                  │
│                       │                 │       │ Framework is still a black box to anyone outside Footloose Labs. Not addressable without docs and public release — out of scope here.   │
└───────────────────────┴─────────────────┴───────┴──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘

Overall: Muffin pre ~5/10 → post ~7/10 — React ~8/10

---
What this work concretely moves

The Reactivity/State score is the meaningful win (+3 points). This is the dimension that was causing
the most day-to-day friction in wity-agent-builder and wity-app — scattered render() calls, manual
derived state chains, PostOffice hacks for cross-component data. Stores + reactive uiVars + derived
directly address all three.

The Maintainability move (+1.5) is structural but quiet: the 500-line polyfill file in wity-agent-builder
and the duplicated ElementWebService in jity-dam and wity-accounts-widget are a current maintenance tax
that compounds. Absorbing them once is the right call.

---
What this work does not close

Type safety (3 → 3) remains unchanged. on-click="methodName" is still an untyped string. The framework
core stays JS. This is the one dimension where the compiler-based approach React uses has a genuine
concrete advantage: the tool can verify that the method being named actually exists. A runtime guardrail
here (warn at render time if the named method is not found on the component) would partially address this
within the model and is a candidate for a follow-on change — but it is not in this scope.

Note on markup authoring vs React's score: React scores 8 here due to JSX + TypeScript, which catches
structural errors at build time. That score is contingent on a compiler being present and correctly
configured. Muffin's 6.5 reflects a different model — errors surface at runtime, but the model has no
build dependency, no toolchain lock-in, and is directly mixable with raw HTML. These are not the same
tradeoff at different quality levels; they are different tradeoffs for different deployment contexts.

---
Where Muffin stays ahead of React after this work

The PostOffice + WebRequestSdk + Lexeme + Store layer (with opt-in socket sync) is now a more complete
client-side platform than it was before. The createStore({ socket, persist }) pattern gives Muffin
something React+Zustand cannot do out of the box: a store that auto-syncs from a named WebSocket
subscription and persists to IndexedDB, wired in a single declaration. For the wity-app / wity-agent-builder
class of application this is a genuine differentiator.
