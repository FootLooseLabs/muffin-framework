# Muffin as an AI-Generation Target — 4 Aug 2026

**Premise:** Muffin components have a fixed, predictable contract without any
compilation step — so Muffin's model is declarative and constrained in a way
that makes it a better target language for AI-generated UI.

---

## Why the contract matters

A Muffin component is a class with a known shape:

```js
class MyWidget extends Muffin.DOMComponent {
    static domElName = "my-widget"

    static uiVars = { title: '', items: [] }

    static markupFunc(_data, uid, uiVars) {
        return `<div class="widget">
            <h2>${uiVars.title}</h2>
            <ul>${uiVars.items.map(i => `<li>${i}</li>`).join('')}</ul>
        </div>`
    }

    onConnect() { this.render() }
}
```

Every component follows the same structure:

| Slot | Purpose |
|---|---|
| `domElName` | Tag name registration |
| `uiVars` | Reactive state declaration |
| `markupFunc` | Pure template function (string in, string out) |
| `onConnect` / `postRender` | Lifecycle hooks |
| `compose()` | Child component registration |
| Event binding | `on-click="methodName"` in markup → class method |

An LLM generating a Muffin component doesn't need to reason about:
- JSX transpilation or build toolchain configuration
- Hook dependency arrays (`useEffect`, `useMemo`, `useCallback`)
- Closure semantics over stale state
- Import path resolution through bundler aliases
- TypeScript generics on props/context

The output is a plain JS class with template literals. It runs as-is in the
browser — no compilation step between generation and execution.

## What "no compilation step" actually enables

The real advantage isn't "no build tool." It's that the feedback loop between
generation and validation is zero-latency:

1. LLM generates component source (plain JS string)
2. Source is directly evaluable — `new Function()` or dynamic `<script>`
3. Component registers as a Web Component and renders immediately
4. Visual result is available for validation without any intermediate transform

Compare to React/JSX:
1. LLM generates JSX source
2. Source must be transpiled (Babel/SWC/esbuild) before it can execute
3. Transpilation requires a bundler context (import resolution, plugin config)
4. Only then can the component render for validation

The compilation step isn't just overhead — it's a category of failure modes
(syntax valid in JSX but invalid after transform, import resolution errors,
version mismatches) that don't exist in Muffin's model.

## Constrained = predictable = machine-writable

Muffin's template model is deliberately constrained:
- **String templates** — no JSX, no virtual DOM diffing to reason about
- **Flat state** — `uiVars` is a plain object, no reducer patterns
- **Explicit DOM** — `getElement()` instead of refs, no stale closure risk
- **Declarative events** — `on-click="methodName"` maps directly to class methods
- **No HOCs, no render props, no hooks** — one composition model (`composedScope` + `PostOffice`)

These constraints reduce the space of valid programs an LLM must search through.
A React component can be written in dozens of equivalent patterns (class vs
function, hooks vs HOCs, context vs prop drilling, controlled vs uncontrolled).
A Muffin component has essentially one way to do each thing.

Smaller valid-program-space → higher probability of correct generation on
first attempt.

## Limitations to be honest about

- **No TypeScript** — generated components won't have type safety. Validation
  must happen at runtime or through a separate schema-checking step.
- **Template strings are opaque** — IDE tooling can't introspect them, and
  neither can static analysis. An LLM generating invalid HTML inside a template
  literal won't get a compile-time error.
- **Testing story** — no established snapshot/unit testing pattern for Muffin
  components yet. AI-generated components would need runtime visual validation.

## Potential application

An AI agent (e.g. in wity-app or agent-builder) could:
1. Accept a natural-language UI description
2. Generate a Muffin component class
3. Register it as a Web Component on the fly
4. Render it immediately for user review
5. Iterate based on feedback — no rebuild cycle

This is the "component-as-artifact" model: the LLM's output is directly
executable UI, not source code that requires a toolchain to become UI.
