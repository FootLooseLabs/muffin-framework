# Polyfill Cleanup Guide

The helpers previously copied into each project are now first-class exports in `@muffin/atom-websdk`. This page lists exactly what to remove and what replaces it.

## Projects affected

| Project | File to clean up |
|---|---|
| wity-agent-builder | `src/4_polyfills.js` |
| jity-dam | `src/service-polyfill.ts` |
| wity-accounts-widget | `src/service-polyfill.ts` |

---

## DOM helpers (previously in `4_polyfills.js`)

These are now on `DOMComponent.prototype` via `applyDOMExtensions()` — available automatically on every component.

| Old (polyfill) | New (built-in) |
|---|---|
| `this.getElement(sel)` | `this.getElement(sel)` — same API |
| `this.getElements(sel)` | `this.getElements(sel)` — same API |
| `this.toggleBtnBusyState(btn)` | `this.toggleBtnBusyState(btn)` — same API |
| `this.toggleSurface(name)` | `this.toggleSurface(name)` — same API |
| `this.toggleTargetTab(tab)` | `this.toggleTargetTab(tab)` — same API |
| `this.awaitChildLoad(sel)` | `this.awaitChildLoad(sel, timeout?)` — timeout now optional, defaults 5s |
| `this.copyToClipboard(text)` | `this.copyToClipboard(text)` — same API |
| `this.notifyUser(msg, type)` | `this.notifyUser(msg, type)` — same API |
| `this.callParent(method, ...args)` | `this.callParent(method, ...args)` — same API |

**Remove:** The entire `4_polyfills.js` file and its import.

---

## Global utilities (previously in `4_polyfills.js`)

```js
// OLD — remove from polyfills file
Array.prototype.splitIntoMultipleArrays = function(size) { ... }
String.prototype.ellipsify = function(len) { ... }
```

These are now applied by `applyGlobalUtilities()` which atom-websdk calls automatically on load.

**Standalone functions** — import from atom-websdk if used:

```js
import { delayTime, reloadPage, generateSlug } from '@muffin/atom-websdk'
```

---

## Service base class (previously `service-polyfill.ts`)

```ts
// OLD — remove this file entirely
export class Service { ... }
```

```js
// NEW
import { Service } from '@muffin/atom-websdk'

class UserService extends Service {
    async getUser(id) {
        return this.request('get-user', { id })
    }
}
```

`Service` now includes:
- TTL cache (30s, Map-based, automatic cleanup)
- Interface locking (prevents duplicate socket requests)
- Subscription locking (prevents duplicate event subscriptions)

---

## Checklist per project

- [ ] Delete `4_polyfills.js` / `service-polyfill.ts`
- [ ] Remove the import line for that file in `main.js` / `app.ts`
- [ ] Verify `applyAtomWebSDK(Muffin)` is called on boot (it handles extensions + globals automatically)
- [ ] Import `Service` from `@muffin/atom-websdk` in any service class file
