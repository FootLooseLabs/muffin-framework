# DOM Extensions

Applied to `DOMComponent.prototype` by `applyAtomWebSDK()`. Available on every component automatically.

## Element queries

### `this.getElement(selector)`
First matching element within the component.

### `this.getElements(selector)`
All matching elements as an array.

## UI helpers

### `this.toggleBtnBusyState(btnEl, state?)`
Add/remove `busy` class and `disabled` attribute on a button. Toggles if `state` omitted.

```js
handleSubmit(srcEl, ev) {
    this.toggleBtnBusyState(srcEl)
    await submit()
    this.toggleBtnBusyState(srcEl)
}
```

### `this.toggleRootAttr(name, value?)`
Toggle an attribute on the component root element.

### `this.toggleSurface(surfaceName, state?, toggleClass?)`
Show/hide a named `surface=""` element. `state`: `'show'` | `'hide'` | `'switch'`. Default toggleClass: `_active`.

### `this.isSurfaceActive(surfaceName, toggleClass?)`
Returns `true` if the named surface has the active class.

### `this.toggleTargetSurface(srcEl, ev)`
Toggle the surface named in `srcEl`'s `data-target` attribute.

### `this.toggleTargetTab(srcEl, ev)`
Activate the tab named in `srcEl`'s `data-target` attribute.

## Async helpers

### `this.awaitChildLoad(childscope, timeout?)`
Returns a Promise that resolves when the named child component has rendered. Default timeout: 5000ms.

```js
async onConnect() {
    await this.awaitChildLoad('detailPanel')
    this.composedScope.detailPanel.loadData()
}
```

### `this.initSubscriptions(subscriptions)`
Batch-wire WebSocket subscriptions. Cleans up automatically on disconnect.

```js
async onConnect() {
    await this.initSubscriptions([
        {
            host: '@vritti/ideator',
            interface: '|||broadcast-event',
            localInterfaceEvent: 'new-data'
        }
    ])
    this.interface.on('new-data', (msg) => {
        this.uiVars.items = msg.items
    })
}
```

## User interaction

### `this.copyToClipboard(srcEl)`
Copy text content of `srcEl` to clipboard.

### `this.notifyUser(msg, duration?, interfaceName?)`
Dispatch a notification via `NotificationManager` interface.

### `this.getSessionUser()`
Returns current user from session store.

## Component communication

### `this.callParent(srcEl, ev)`
Invoke a method on the nearest ancestor component. Method name is read from `srcEl`'s `pass-method` attribute, or via `on-click="callParent"` with `pass-data` attribute.

### `this.callGrandParent(srcEl, ev)`
Same as `callParent` but skips one level.

---

## Global utilities (applied once by `applyGlobalUtilities()`)

### `Array.prototype.splitIntoMultipleArrays(chunkSize)`
```js
[1,2,3,4,5].splitIntoMultipleArrays(2)
// → [[1,2],[3,4],[5]]
```

### `String.prototype.ellipsify(maxLength)`
```js
'A long string'.ellipsify(8)  // → 'A long s…'
```

## Standalone functions

```js
import { delayTime, reloadPage, generateSlug, getSanitisedTextForSpeech } from '@muffin/atom-websdk'
```

| Function | Description |
|---|---|
| `delayTime(ms)` | Promise that resolves after `ms` milliseconds |
| `reloadPage()` | Hard reload |
| `generateSlug(text)` | URL-safe slug |
| `getSanitisedTextForSpeech(text, maxSlice?)` | Strip HTML and special chars for TTS |
