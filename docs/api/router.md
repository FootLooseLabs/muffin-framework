# Router

`Muffin.Router` is headless routing. It owns four things, and only these:

| | What it is | API |
|---|---|---|
| **The address** | Which route a page is on, read from and written to its URL. The URL is the only source of truth: it's read on load, on Back and Forward, and whenever you ask, never from `history.state`. | `match()` · `href()` |
| **The route table** | Named routes. A route may declare a path with named params. | `addRouteConfig()` |
| **Navigation** | Going to a route, replacing one, and the browser's own Back and Forward. | `go()` · `back()` |
| **The transition** | A navigation is asked about first, and every route shown is announced. | `beforeLeave()` · `onChange()` |

What a route **looks like** belongs to a component, never to the router: which element renders, a 404, a "leave without saving?" dialog, animation, scrolling. An app's outlet component listens to the router (`onChange`, or the `onBeforeLoad` message) and renders. To ask before leaving, it registers a guard that uses its own dialog.

```js
Muffin._router = new Muffin.Router({ routeDelimiter: '/', basePath: '/' })
Muffin._router.addRouteConfig([
    { name: 'home', defaultRoute: true },
    { name: 'learn' },
    { name: 'idea', path: 'explore/:slug' }
])
```

The router starts itself once the page has loaded (`DOMContentLoaded`): it shows the route in the address, or the default route when the address names none. You don't need to call `go()` at start.

## Options

| Option | Default | What it is |
|---|---|---|
| `routeDelimiter` | `'?'` | The address style, i.e. where in the address the route is kept (see below). |
| `basePath` | `'/'` | Path style only: where the app is mounted. Routes live below it, and the base itself (with or without its closing `/`) names no route. |
| `toggleClass` | `'_active'` | The class put on the active `[route]` element. |

## Address styles

| `routeDelimiter` | Style | Address | Use when |
|---|---|---|---|
| `'/'` | path | `{basePath}{name}?{params}#{hash}`, e.g. `/explore/coffee?tab=notes` | The host serves the app for every path below `basePath` (history fallback). This is the default for apps. |
| `'?'` | query | `{page}?{name}&{params}#{hash}`, e.g. `/tools/agent-builder/?learn&tab=notes` | The host serves only the page's own path. |
| `'#'` | hash | `{page}{search}#{name}&{params}`, e.g. `/call#learn&tab=notes` | The route must never reach the server. |

Params are a standard query: `URLSearchParams` encodes them when written and decodes them when read. A route name is a path in readable form. Escapes that would change its meaning stay as they are: `%2F` for a slash inside a param, `%3F`, `%23`.

Going to a route starts at its top, so the address `go()` and `href()` write has no hash, except in hash style, where the path and query stay where they are. A rewrite in place keeps the hash.

### What loading a page does

- **No history entry.** Back leaves the page; it doesn't step through a redirect.
- **An address that names no route is left as it is.** `/` stays `/`, and `/?assistant-session=…` keeps its query. The default route is shown.
- **The path-style form earlier versions wrote is read and rewritten in place, once** (`replaceState`). For example, `/learn&tab=x?utm_source=y` becomes `/learn?tab=x&utm_source=y`, so old links and bookmarks keep working.
- **In query and hash style, a name written with an empty value is still the name.** For example, `?learn=&tab=x` is read as route `learn`. That's what `URLSearchParams` makes of `?learn` when another script edits the query.

## The route table

A route is a name. It may also declare a `path` with named params:

| Path segment | Matches | Param |
|---|---|---|
| `explore` | the segment itself | none |
| `:slug` | one segment | `params.slug`, decoded |
| `*` | the rest of the path | `params['*']` |

```js
{ name: 'idea',  path: 'explore/:slug' }
{ name: 'files', path: 'files/*' }
```

- **Reading.** An address is matched to the declared route of that name, or to the first route whose path matches it. The route's params come from the path, over the query's. `match('/explore/coffee?tab=x')` returns `{ name: 'explore/coffee', route: 'idea', params: { slug: 'coffee', tab: 'x' } }`. `name` is the address's own path and `route` is the declared route.
- **Writing.** By the route's name, its path is filled from the params and the rest go into the query: `href('idea', { slug: 'a b', tab: 'x' })` returns `/explore/a%20b?tab=x`. A param the path needs and isn't given is an error (`Router: route 'idea' needs slug`).
- **A path no route declares is a route of its own name,** created when it's gone to. `go('explore/' + slug)` keeps working, and is matched to `idea` when that route is declared.

## Navigating

| Method | What it does |
|---|---|
| `go(name, params?, { replace }?)` | Asks the guards, then shows the route and writes it into the address. Returns a Promise of whether it went. It adds one history entry, or reuses the current one when the address wouldn't change. `{ replace: true }` is for a redirect: the address it leaves isn't kept, so Back doesn't return to it only to be sent on again. `params` is an object or a query string (`'a=1&b=2'`). They're added to the params the route was last shown with; `undefined` and `null` values are dropped. With no guard, or guards that answer at once, it goes immediately, as it always has. |
| `back()` | `history.back()`. It's asked about like any Back. |
| `href(name, params?)` | The address `go()` would write. Use it for links instead of building addresses by hand. |
| `match(url?)` | `{ name, route, params, legacy }` for an address (the current one by default). `name` is `''` when the address names no route. `legacy` is `true` for a form this router reads but no longer writes. |
| `getCurrentRouteName()` | The current route's name, or the default route's name when the address names none. |
| `getCurrentRouteParams()` | The current address's params. |
| `getDefaultRoute()` · `getActiveRoute()` · `getRoute(name)` | Route objects (`{ name, path?, params, url, defaultRoute?, active? }`). |
| `addRouteConfig(routes)` · `addRoute(route, { force })` · `addDefaultRoute(name, params)` | Declare routes. |

## Leaving: `beforeLeave(guard)`

A guard is asked before a navigation happens, and its answer decides it:

```js
const stop = Muffin._router.beforeLeave({
    ask: ({ from, to }) => !this.unsaved || Muffin.ConfirmDialog('Leave without saving?'),  // true / false, or a Promise of one
    pending: () => this.unsaved,                                                            // optional
})
// later, when the page is gone: stop()
```

- **`ask({ from, to })`** is asked before `go()`, Back and Forward. `from` and `to` are `{ name, route, params }`. Returning `false`, or a Promise resolving to `false`, keeps the page where it is. A guard that throws or rejects does the same, so a broken guard never loses work. Guards are asked in turn, and the first no stops the navigation. A bare function is a guard with only `ask`.
- **`pending()`** says something would be lost by leaving the page itself: closing the tab, reloading, or going to another site. When it returns true, the browser asks with its own prompt (`beforeunload`), which is the only prompt a page can show then.
- **The return value** is a function that removes the guard.

Back and Forward are asked about where the browser lets a page refuse them: the Navigation API, in every current engine since January 2026. The browser allows one refusal per user activation, so pressing Back a second time always leaves and a page can never trap someone. A guard that answers at once decides there and then. A guard that asks the person holds the step until they answer. If they say yes, the router takes the step again, to the same entry. If the browser refuses that retaken step, the person stays where they were, and Back works as ever. In a browser without the Navigation API, Back and Forward aren't asked about, while `go()` and leaving the page still are.

## Listening: `onChange(listener)`

```js
const stop = Muffin._router.onChange(({ name, route, params, from }) => { … })
```

`onChange` is called for every route shown: at start, on `go()`, and on Back and Forward. `from` is the route shown before it (`null` the first time). The return value removes the listener.

The same moment is also announced on the `element_router` socket (`onBeforeLoad`: `{ name, route, params, url }`), and on a route's own `socketName`. A component that sets `router` gets that message as `this.routeVars` and is called back through `onBeforeRouteLoad()`.

## Route elements

Elements with a `route` attribute are shown and hidden by the router: the active one gets `toggleClass`, or its own `route-class`. A route element inside another one is written into the address with its ancestors' names (`account/settings`) and read back as the route it is. This is the router's earliest outlet and is kept as it is. New outlets are components that listen to `onChange`.

## Don't

- Build addresses from `routeDelimiter` (`'/' + name + '&x=' + v`). Use `href()`.
- Read the route out of `location`, or match names against your own regexes. Declare a `path` and use `match()` or the `route` and `params` the router gives you.
- Ask "leave without saving?" after the route has changed. Register a guard, so the navigation is asked about before it happens.
- Choose the style per host (`hostname === 'localhost' ? '?' : '/'`). Give the dev server a history fallback (Vite's default for a single-page app) and use one style everywhere.
