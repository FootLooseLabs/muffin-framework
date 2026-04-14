# State Machine

Every component has a built-in state machine via `static stateSpace` and instance `transitionSpace`. Use it when a component has distinct modes with strict ordering between them.

## Defining states

`stateSpace` is a **static** property:

```js
class OrderCard extends Muffin.DOMComponent {
    static domElName = 'order-card'

    static stateSpace = {
        idle:       { apriori: ['loading', 'error'] },
        loading:    { apriori: ['idle'] },
        error:      { apriori: ['loading'] },
        submitting: { apriori: ['idle'] },
        submitted:  { apriori: ['submitting'] }
    }
}
```

`apriori` — the states allowed to transition INTO this state. Attempting an invalid transition is rejected.

## Transition hooks

`transitionSpace` is set in `constructor()` (instance, not static):

```js
constructor() {
    super()
    this.uiVars.order = null
    this.uiVars.errorMsg = ''

    this.transitionSpace = {
        'idle <to> loading':    () => this.loadOrder(),
        'loading <to> error':   () => { this.uiVars.errorMsg = 'Failed to load' }
    }
}
```

Callbacks fire when entering the named transition. Key format: `'fromState <to> toState'`.

## Switching state

```js
async onConnect() {
    this.switchState('loading')
}

async loadOrder() {
    try {
        this.uiVars.order = await orderService.get()
        this.switchToIdleState()       // alias for switchState('idle')
    } catch (e) {
        this.switchState('error')
    }
}
```

`switchState` validates against `apriori`, fires the transition hook, updates `this.current_state`, and dispatches a `state-change` CustomEvent on the element.

## Using state in markup

```js
static markupFunc(_data, uid, uiVars, routeVars, _constructor) {
    const state = _constructor.prototype._currentState   // or read uiVars.state.name

    if (state === 'loading') return `<div class="spinner"></div>`
    if (state === 'error')   return `<p class="error">${uiVars.errorMsg}</p>`

    return `
        <div class="order">
            <h3>${uiVars.order?.title ?? ''}</h3>
        </div>
    `
}
```

## State change events

```js
document.querySelector('order-card').addEventListener('state-change', (e) => {
    console.log('new state:', e.detail)
})
```

## When to use it

State machines are most valuable when:
- A component has 3+ distinct visual modes
- Transitions have strict ordering (can't jump from `submitted` to `loading` directly)
- You want `markupFunc` to be a clean read of state rather than nested conditionals

For simple two-state toggles (open/closed, loading/done), `uiVars` booleans are sufficient.
