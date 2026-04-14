# Components

Every muffin component extends `Muffin.DOMComponent` (which extends `HTMLElement`). The component IS the DOM element — no wrapper, no virtual node.

## Defining a component

`markupFunc` and `stateSpace` are **static**. Instance state lives in `constructor()` via `this.uiVars`.

```js
class UserProfile extends Muffin.DOMComponent {
    static domElName = 'user-profile'

    static markupFunc(_data, uid, uiVars) {
        return `
            <div class="profile">
                <h2>${uiVars.name}</h2>
                <button on-click="handleEdit">Edit</button>
            </div>
        `
    }

    constructor() {
        super()
        this.uiVars.name = ''
        this.uiVars.editing = false
    }

    handleEdit(srcEl, ev) {
        this.uiVars.editing = true
    }
}

UserProfile.compose()
```

```html
<user-profile></user-profile>
```

## Registration — `.compose()`, not `customElements.define()`

`.compose()` registers the Web Component and wires up the Muffin internals.

Batch composition — a parent composes its children:

```js
class AppUI extends Muffin.DOMComponent {
    static domElName = 'app-ui'
    static markupFunc(_data, uid, uiVars) { ... }
}

AppUI.compose = () => {
    SideNav.compose()
    MainContent.compose()
    Footer.compose()
    AppUI.prototype.constructor._composeSelf()
}

AppUI.compose()
```

## Lifecycle

| Method | When |
|---|---|
| `constructor()` | Set `uiVars`, `stores`, `transitionSpace` here |
| `onConnect()` | After first render. Good for subscriptions and async data loading. |
| `disconnectedCallback()` | When removed from DOM. Always call `super.disconnectedCallback()`. |

```js
class FeedWidget extends Muffin.DOMComponent {
    static domElName = 'feed-widget'

    constructor() {
        super()
        this.uiVars.items = []
        this.uiVars.loading = true
    }

    async onConnect() {
        const data = await feedService.getLatest()
        this.uiVars.items = data.items
        this.uiVars.loading = false
    }
}
```

## Passing data via attributes

```html
<user-card data='{"id": 1, "name": "Ankur"}'></user-card>
```

Available as `_data` (first argument) in `markupFunc`:

```js
static markupFunc(_data, uid, uiVars) {
    return `<div>${_data.name}</div>`
}
```

Default data shape is declared via `static schema`:

```js
static schema = { id: null, name: '' }
```

## Unique instance ID

Each component instance gets a `uid`. Use it to scope IDs within the component:

```js
static markupFunc(_data, uid, uiVars) {
    return `
        <label for="input-${uid}">Name</label>
        <input id="input-${uid}" type="text" />
    `
}
```

## Event binding

Attach handlers via `on-*` attributes — no `addEventListener` needed. Handlers receive `(srcEl, ev)`:

```js
static markupFunc(_data, uid, uiVars) {
    return `
        <input on-input="onNameInput" placeholder="Type..." />
        <select on-change="onSelect">
            <option>A</option>
            <option>B</option>
        </select>
    `
}

onNameInput(srcEl, ev) {
    this.uiVars.name = srcEl.value
}

onSelect(srcEl, ev) {
    this.uiVars.selected = srcEl.value
}
```

Supported: `on-click`, `on-change`, `on-input`, `on-scroll`, `on-keyup`, `on-load`, `on-contextmenu`.
`on-contextmenu` automatically calls `ev.preventDefault()`.

## Conditional rendering

```js
static markupFunc(_data, uid, uiVars) {
    return `
        <div>
            <p render-if="uiVars.loading">Loading…</p>
            <p render-if="!uiVars.loading">${uiVars.message}</p>
        </div>
    `
}
```

Expression scope is constrained to `uiVars`, `data`, and `stores` — no globals. False = `display:none`, element stays in DOM.

## XSS protection

`esc()` is available in every `markupFunc`. Use it for any user-supplied or dynamic string:

```js
static markupFunc(_data, uid, uiVars) {
    return `<p>${this.esc(uiVars.userInput)}</p>`
}
```

Escapes `&`, `<`, `>`, `"`, `'`. The guardrail is built into the rendering pipeline — not a separate build step.

## Derived (computed) state

Declare computed values as a static property. They are evaluated fresh on every render and merged into `uiVars`:

```js
class ItemList extends Muffin.DOMComponent {
    static domElName = 'item-list'

    static derived = {
        isEmpty: (uiVars, data) => uiVars.items.length === 0,
        visibleCount: (uiVars, data) => uiVars.items.filter(i => i.visible).length
    }

    constructor() {
        super()
        this.uiVars.items = []
        this.uiVars.filter = 'all'
    }

    static markupFunc(_data, uid, uiVars) {
        if (uiVars.isEmpty) return `<p>No items</p>`
        return `<p>${uiVars.visibleCount} visible</p>`
    }
}
```

## styleMarkup

Dynamic styles per component state:

```js
static styleMarkup(rootEl, currentState) {
    return `
        :host { display: block; }
        :host([state="loading"]) .spinner { display: block; }
    `
}
```
