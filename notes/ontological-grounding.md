# Muffin — Ontological Grounding

> This is not a feature list. It is the engineering philosophy that governs what Muffin is,
> what it refuses to become, and the decision heuristics for extending, modernizing, or migrating it.
> Draws on real incidents, real-world component patterns from wity-app, and first-principles reasoning.
> Current state: element v0.9.x + atom-websdk v3.0.5.

---

## The Proposition

**Low sugar, low ceremony frontend framework for insulin-free development.**

Not a slogan. A constraint. Every design decision should be measured against it.

- **Low sugar** — no syntactic magic that obscures what is actually happening at runtime.
- **Low ceremony** — a developer reads a component cold and understands its full behaviour without needing to know the framework deeply.
- **Insulin-free** — the framework does not create dependency loops that require itself to be fed back to function. No compiler. No bundler required to consume. No runtime interpreter layered over the browser.

---

## On the Nature of Engineered Systems

Frameworks like React operate on a compiler-trust model: correctness is enforced at build time, abstraction is enforced by the compiler, and the runtime is a product of the compiler's output. This is useful. It has an ontological cost:

- The compiler becomes a mediator between the developer and the platform.
- Guardrails exist outside the system, not within it.
- When the abstraction leaks (and it always does), the developer faces double indirection: the framework's mental model AND the platform's actual behaviour.

In natural engineered systems — electrical circuits, mechanical linkages, biological organisms — the guardrails are not separate from the system. The constraint is encoded in the material, the structure, the interface itself. There is no external compiler telling an ion channel not to pass the wrong molecule. The ontology of the system IS the guardrail.

Muffin is built in this mode. The browser is the runtime. HTMLElement is the component base. The platform's own custom elements lifecycle is the lifecycle. No virtual runtime sits between the developer's code and the browser's execution.

**Muffin's guardrails must live in the runtime, not outside it.**

---

## Ownership Boundaries — The Central Rule

> **Every concern has exactly one owner. Framework concerns belong to the framework. Developer concerns belong to the developer. These must not cross.**

| Concern | Owner | Location |
|---|---|---|
| When to render | Framework | `switchState`, `render()`, `_scheduleRender` |
| What to render | Developer | `markupFunc` (static, developer-authored) |
| Current state machine state | Framework | `this.current_state` |
| UI variables driving markup | Developer | `this.uiVars` |
| Render scheduling mechanism | Framework | `queueMicrotask` batching in `_scheduleRender` |
| Component identity | Framework | `uid`, `domElName`, `composedScope` |
| Route context | Framework (via router) | `routeVars` |
| Cross-component signals | Explicit (both) | PostOffice, `composedScope` |

Crossing these boundaries does not just produce code smell — it creates invisible coupling where neither the developer nor the framework can reason about what caused a render or state change.

### Incident: `uiVars.state` as a render trigger (v3.0.0–v3.0.4 regression)

In the v3 migration, `switchState` was changed from calling `render()` directly to relying on the reactive `uiVars` proxy as the trigger:

```js
// v3.0.0–v3.0.4 — WRONG
this.current_state = stateName;
this.uiVars.state = { name: stateName }; // relied on proxy side-effect to trigger render
```

The ontological error: `current_state` is a state machine concern. Using a write into the developer-owned `uiVars` space to trigger a framework-owned action (render) is the framework crossing into developer space to do its own work. It also made the render dependent on proxy scheduling, which could be preempted by explicit `render()` calls that developers wrote for v2 semantics — causing the spinner-stuck bug observed in wity-app.

Corrected in v3.0.5:
```js
this.current_state = stateName;
this.uiVars.state = { name: stateName }; // retained as readable data for markupFunc, not as a trigger
this.render(); // explicit — framework owns this signal, same as v2
```

---

## uiVars — Developer Space, Framework Respects

`this.uiVars` belongs to the developer. The framework provides a reactive proxy purely as a convenience — not as an oversight mechanism.

Rules:

1. **Developers must never need to think about render frequency when writing to uiVars.** Writing the same value twice must not cause two renders. Same-value deduplication is enforced by the framework transparently (v3.0.5+).

2. **The proxy is intentionally shallow.** Deep reactivity bleeds framework complexity into developer mental models. Shallow means: the developer re-assigns the top-level key when they intend a render update. Explicit, low ceremony.

3. **uiVars writes are local.** A write schedules a batched microtask render for this component only. It is not a state transition, not an event, not a cross-component signal. Those are PostOffice concerns.

4. **`postRender` must not write to uiVars unconditionally.** `postRender` fires after render. An unconditional uiVars write inside it creates: render → postRender → uiVars write → render → ∞. The same-value guard (v3.0.5) mitigates the most common case.

5. **`current_state` is not a uiVar ontologically.** It is readable from `this.current_state` directly in `markupFunc`. `uiVars.state` is kept as a convenience for markup expressions that want named state — but it is not the source of truth and must never be used as a render trigger.

---

## State Machine — Its Own Ontological Layer

`stateSpace`, `transitionSpace`, `current_state`, `switchState` form a first-class layer distinct from UI state.

- `current_state` answers: **what mode is this component currently operating in?**
- `uiVars` answers: **what data should the current markup reflect?**

Different questions, different lifecycles. A component in `"loading"` state may update `uiVars.progress` many times without changing state. A `switchState` call changes mode once, triggers one render, regardless of intermediate uiVars activity.

The `apriori` system is not a type-checker. It is a **semantic constraint**: which transitions are coherent for this component. A transition not in `apriori` is not forbidden by a rule — it is incoherent by the component's own ontology.

`switchToIdleState` is a silent reset. It sets `current_state` without triggering a render, for use in `onConnect` before the component has been painted. It does not signal, does not dispatch, does not render. This is intentional.

---

## Explicit Signals Over Implicit Reactivity

Muffin favours explicit signals:

- **PostOffice** — explicit pub/sub. You name the interface, name the event, dispatch it. Nothing fires unless explicitly dispatched.
- **`switchState`** — explicit state transition. You name the target. Nothing transitions unless explicitly called.
- **`render()`** — explicit render request. State changes call it directly.

The reactive proxy on `uiVars` is the single concession to implicit reactivity — scoped entirely to the local component's render scheduling. It does not propagate across components. It does not infer dependencies. There is no global reactive graph.

This is a design position: **each component owns its render cycle entirely**. Cross-component coordination is explicit via PostOffice or `composedScope`. No cascade failures from unrelated components reacting to shared reactive state.

---

## Web Components Native — The Platform Is the Runtime

Muffin components are `HTMLElement` subclasses registered with `customElements.define`. Their lifecycle IS the browser's lifecycle.

1. **No hydration cost.** Elements parse and upgrade from HTML. No reconciliation pass.
2. **Composability is structural.** Components nest because the DOM nests. The DOM IS the component tree.
3. **No build step required for consumers.** A Muffin component is usable via `<script>` tag.
4. **The framework does not own the DOM lifecycle.** `connectedCallback` fires when the browser connects the element. The framework responds — it does not own.

---

## Template Literals Are Not a Workaround

Template literals in `markupFunc` are not a workaround for lacking JSX. They are the correct expression of "markup is a string of HTML." The browser receives HTML strings. The developer writes HTML strings. No intermediate representation. No compiler mediates this.

The cost is real: no IDE HTML support inside string literals at present. This is a tooling gap, not an ontological gap. The model is correct. Tooling can close the gap without changing the model. Changing to JSX closes the tooling gap by changing the model — trading one ceremony for another.

---

## Innovation Dies in Uniformity

Popular frameworks converge on patterns because convergence reduces onboarding cost. Real benefit. Real cost rarely named:

**Abstraction introduced to solve a framework's own complexity is not a feature — it is a liability dressed as a feature.**

JSX exists because React's reconciler needs a description of the desired tree. It is a notation format for React's internal model. The developer pays the compiler cost to serve the framework's needs.

Muffin's position is the inverse: the framework serves the developer's needs, using the platform's own model. The web components spec exists. The `customElements` API exists. The `HTMLElement` lifecycle exists. Muffin is an expression of these — not a replacement.

**Sameness scales. Difference invents.** A framework that enforces one right way to build a component enforces uniformity of thought. Muffin's composability model allows structural diversity — components compose in the DOM, communicate via explicit contracts, and are individually replaceable without framework negotiation.

---

## Fitness for AI Agent Developers

Muffin is increasingly used in contexts where AI agents author components, not just humans. An AI agent follows the same contract as a human developer. The contract must be explicit enough to be followed correctly by a system with no ambient project knowledge.

This means:
- Implicit conventions are liabilities. Every framework behaviour that is not derivable from reading the source is a potential failure mode for agent-authored components.
- The `markupFunc` static pattern is agent-friendly: the entire render output is determined by a pure function of explicit inputs. No hooks, no effect ordering, no hidden subscription state.
- The `stateSpace` declaration is agent-friendly: legal transitions are declared, illegal ones warn. An agent can reason about what states are reachable.
- PostOffice explicit contracts (`advertiseAs`, `LEXICON`) are agent-friendly: the interface is declared, typed, and named.

As AI-assisted development matures, the frameworks that survive will be those whose ontology is legible to non-human authors. Muffin's explicit, boundary-respecting model is structurally better positioned for this than frameworks that rely on ambient project knowledge, compiler magic, or tribal conventions.

---

## Current State (as of v3.0.5)

### Promoted from project polyfills to framework
Everything in `atom-websdk/src/dom_extensions.js`: `getElement`, `getElements`, `callParent`, `callGrandParent`, `awaitChildLoad`, `initSubscriptions`, `toggleSurface`, `isSurfaceActive`, `toggleTargetSurface`, `toggleTargetTab`, `toggleBtnBusyState`, `notifyUser`, `copyToClipboard`, `Router.updateHistory`, `Array.splitIntoMultipleArrays`, `String.ellipsify`.

### Still in project polyfills (`4_polyfills.js`), not yet promoted
- `renderSelectively` — surgical DOM update via `[data-uivar]` elements, bypassing full re-render. Used across wity-app for performance-sensitive components. Belongs in `dom_renderer.js` or `dom_extensions.js` as a first-class rendering mode.

### Correct remaining gaps
- `renderSelectively` promotion to framework level.
- `render-if` expressions use `this` scope (fixed v3.0.5) — existing components using `this.uiVars.x` form now work correctly.

---

## Decision Heuristics for Framework Changes

Apply in order:

1. **Does this cross an ownership boundary?** Framework mechanism depending on developer-owned space to do its own work → boundary violation. Reject or redesign.

2. **Does this introduce implicit behaviour?** Implicit that is transparent and produces the developer's intended result → acceptable. Implicit that produces surprising results → it is a bug, not a feature.

3. **Does this add ceremony?** If a developer must now do something extra they previously did not, the cost must be justified by a concrete observable benefit.

4. **Is this re-implementing a platform capability?** If the browser already does something, express it — don't replace it.

5. **Is this legible to a non-human author with no ambient project knowledge?** If not, it is a liability for AI-assisted development contexts.

---

## What Muffin Is Not

- Not a compiler-based framework.
- Not a state management solution for cross-component state (that is PostOffice + Stores — separate concerns).
- Not an alternative to the browser's own component model — an expression of it.
- Not competing with React on React's terms.
- Not trying to minimise developer code at the cost of framework legibility.
