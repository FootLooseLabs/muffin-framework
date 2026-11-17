# Router

`Muffin.Router` keeps which route a page is on in its address. The address is the only source of truth: the current route and its params are read from it on load, on Back and Forward, and whenever you ask. They are never read from `history.state`.

```js
Muffin._router = new Muffin.Router({ routeDelimiter: '/', basePath: '/' })
Muffin._router.addRouteConfig([
    { name: 'home', defaultRoute: true },
    { name: 'learn' }
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

Params are a standard query: `URLSearchParams` encodes them when written and decodes them when read. Going to a route starts at its top, so the address `go()` and `href()` write has no hash, except in hash style, where the path and query stay where they are. A rewrite in place keeps the hash.

### What loading a page does

- **No history entry.** Back leaves the page; it doesn't step through a redirect.
- **An address that names no route is left as it is.** `/` stays `/`, and `/?assistant-session=…` keeps its query. The default route is shown.
- **The path-style form earlier versions wrote is read and rewritten in place, once** (`replaceState`). For example, `/learn&tab=x?utm_source=y` becomes `/learn?tab=x&utm_source=y`, so old links and bookmarks keep working.
- **In query and hash style, a name written with an empty value is still the name.** For example, `?learn=&tab=x` is read as route `learn`. That's what `URLSearchParams` makes of `?learn` when another script edits the query.

## Navigating

| Method | What it does |
|---|---|
| `go(name, params?, { replace }?)` | Shows the route and writes it into the address. It adds one history entry, or reuses the current one when the address wouldn't change. `{ replace: true }` is for a redirect: the address it leaves isn't kept, so Back doesn't return to it only to be sent on again. `params` is an object or a query string (`'a=1&b=2'`). They're added to the params the route was last shown with; `undefined` and `null` values are dropped. |
| `back()` | `history.back()`. |
| `href(name, params?)` | The address `go()` would write. Use it for links instead of building addresses by hand. |
| `match(url?)` | `{ name, params, legacy }` for an address (the current one by default). `name` is `''` when the address names no route. `legacy` is `true` for a form this router reads but no longer writes. |
| `getCurrentRouteName()` | The current route's name, or the default route's name when the address names none. |
| `getCurrentRouteParams()` | The current address's params. |
| `getDefaultRoute()` · `getActiveRoute()` · `getRoute(name)` | Route objects (`{ name, params, url, defaultRoute?, active? }`). |
| `addRouteConfig(routes)` · `addRoute(route, { force })` · `addDefaultRoute(name, params)` | Declare routes. A name passed to `go()` that wasn't declared is created on the way, which is how dynamic routes like `explore/coffee` work. |

## Listening

Every route shown, whether at start, on `go()` or on Back and Forward, is announced on the `element_router` socket. A route declared with a `socketName` is announced on that socket too:

```js
Muffin.PostOffice.sockets.element_router.on('onBeforeLoad', ({ name, params, url }) => { … })
```

A component that sets `router` gets the message as `this.routeVars` and is called back through `onBeforeRouteLoad()`.

## Route elements

Elements with a `route` attribute are shown and hidden by the router: the active one gets `toggleClass`, or its own `route-class`. A route element inside another one is written into the address with its ancestors' names (`account/settings`) and read back as the route it is.

## Don't

- Build addresses from `routeDelimiter` (`'/' + name + '&x=' + v`). Use `href()`.
- Read the route out of `location` yourself. Use `match()`, `getCurrentRouteName()` or `getCurrentRouteParams()`.
- Choose the style per host (`hostname === 'localhost' ? '?' : '/'`). Give the dev server a history fallback (Vite's default for a single-page app) and use one style everywhere.
