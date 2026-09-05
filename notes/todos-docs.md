# Documentation TODOs

Gaps identified during the 4 Aug 2026 audit. Goal: reduce ambiguity for anyone
picking up Muffin for the first time (including AI agents).

---

## Component Writing Guides (from wity-app patterns)

Real examples from wity-app showing how components are actually written in practice,
not just API reference.

- [ ] **Basic component** — minimal `markupFunc`, `uiVars`, event binding.
      Source: a simple page or widget from wity-app.
- [ ] **Parent-child composition** — `composedScope`, `childscope`, `awaitChildLoad`.
      Source: a page that coordinates with child panels (e.g. visual-ideation-page + its children).
- [ ] **Service integration** — `onConnect` → Service call → `uiVars` update.
      Source: any page that loads data from a web-service on mount.
- [ ] **Store-driven component** — `createStore()`, cross-component reactivity,
      persistence and socket sync options.
      Source: a component pair that shares a store.
- [ ] **State machine component** — `stateSpace`, `transitionSpace`, `switchState`.
      Source: a multi-step flow or modal with defined states.
- [ ] **PostOffice communication** — `advertiseAs`, `initSubscriptions`, pub/sub.
      Source: components communicating via PostOffice in wity-app.
- [ ] **Direct DOM patterns** — `getElement`, `toggleSurface`, when to use
      imperative DOM vs template re-render.
      Source: the tag-pills workaround from dx-audit-31-07-26.md is a good cautionary example.
- [ ] **GSAP / animation integration** — using `getElement()` + GSAP in `postRender`
      or `onConnect`. How Muffin's direct DOM access simplifies animation code
      compared to React's ref pattern.

## Framework-Level Docs

- [ ] **Composition model explainer** — document the actor-model composition
      (`composedScope`, `callParent`, `PostOffice`, `createStore`) as a first-class
      concept, not scattered across API pages. Compare explicitly to React's
      props/context model so developers from React backgrounds understand the mapping.
- [ ] **When NOT to use full re-render** — document the form-state clobbering issue
      (dx-audit issue #3) and the recommended patterns: direct DOM for dynamic
      sub-sections, store snapshot/restore for forms.
- [ ] **LLM context file for wity-app** — a `llms-wity-app.txt` that gives AI agents
      the project-specific patterns, service list, page structure, and component
      conventions. Reduces cold-start time significantly.
