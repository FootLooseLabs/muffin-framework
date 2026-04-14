# Polyfill Cleanup Guide

The helpers previously hand-written into each project's `4_polyfills.js` and `service-polyfill.ts` are now first-class exports in `@muffin/atom-websdk`. This page lists exactly what to remove and what replaces it.

## Projects affected

| Project | File to clean up |
|---|---|
| wity-agent-builder | `src/scripts/4_polyfills.js` |
| jity-dam | `src/muffin-sdk/service-polyfill.ts` |
| wity-accounts-widget | `src/muffin-sdk/service-polyfill.ts` |

---

## DOMComponent prototype extensions

These are now on `DOMComponent.prototype` via `applyDOMExtensions()` — called automatically by `applyAtomWebSDK()`. Remove from `4_polyfills.js`:

| Method | Notes |
|---|---|
| `getElement(selector)` | Identical API |
| `getElements(selector)` | Identical API |
| `toggleBtnBusyState(btnEl, state?)` | Identical API |
| `toggleRootAttr(name, value?)` | Identical API |
| `toggleSurface(name, state?, class?)` | Identical API |
| `isSurfaceActive(name, class?)` | Identical API |
| `toggleTargetSurface(srcEl, ev)` | Identical API |
| `toggleTargetTab(srcEl, ev)` | Identical API |
| `awaitChildLoad(name, timeout?)` | Timeout now optional, default 5s |
| `initSubscriptions(subscriptions)` | Identical API |
| `notifyUser(msg, duration?, interface?)` | Identical API |
| `copyToClipboard(srcEl)` | Identical API |
| `callParent(srcEl, ev)` | Identical API |
| `callGrandParent(srcEl, ev)` | Identical API |
| `getSessionUser()` | Identical API |

Also remove the `Router.prototype.updateHistory` addition from `4_polyfills.js` — now in `dom_extensions.js`.

---

## Global utilities

Remove from `4_polyfills.js`:

```js
// DELETE these — now applied by applyGlobalUtilities() inside applyAtomWebSDK()
Array.prototype.splitIntoMultipleArrays = function(size) { ... }
String.prototype.ellipsify = function(len) { ... }
```

Standalone functions — import if used explicitly, or remove if only called via `this.delayTime()` etc.:

```js
import { delayTime, reloadPage, generateSlug, getSanitisedTextForSpeech } from '@muffin/atom-websdk'
```

---

## Service base class

Remove `service-polyfill.ts` (jity-dam, wity-accounts-widget) and `ElementWebService` from `4_polyfills.js` (wity-agent-builder) entirely.

`Muffin.Service` is now provided by `atom-websdk` with identical TTL cache, interface locking, and subscription locking.

No API change required in service classes — they extend `Muffin.Service` exactly as before.

---

## Checklist per project

- [ ] Verify `applyAtomWebSDK(Muffin)` is called at boot (or CDN auto-applies it)
- [ ] Delete `DOMComponent.prototype` extension block from `4_polyfills.js`
- [ ] Delete `Router.prototype.updateHistory` from `4_polyfills.js`
- [ ] Delete `Array.prototype` and `String.prototype` extensions from `4_polyfills.js`
- [ ] Delete `ElementWebService` class from `4_polyfills.js`
- [ ] Delete `service-polyfill.ts` (React projects) and remove its import
- [ ] If `4_polyfills.js` is now empty, delete the file and remove its import from `main.js`
- [ ] Smoke test: component DOM helpers, notification dispatch, a service request
