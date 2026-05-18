# Muffin Framework

UI component framework and ecosystem by [FootLoose Labs](https://github.com/FootLooseLabs). Built around `element` (the component base) and `atom-websdk` (the WebSocket/service layer).

**Docs:** [footlooselabs.github.io/muffin-framework](https://footlooselabs.github.io/muffin-framework/)

## Ecosystem

| Repo | Description |
|------|-------------|
| [muffin-framework](https://github.com/FootLooseLabs/muffin-framework) | This repo — framework docs, patterns, migration guides |
| [element](https://github.com/FootLooseLabs/element) | Core library — `Muffin.DOMComponent`, stores, PostOffice, state machine |
| [atom-websdk](https://github.com/FootLooseLabs/atom-websdk) | WebSocket SDK and service base class (`ElementWebService`) |
| [muffin-cli](https://github.com/FootLooseLabs/muffin-cli) | CLI — browse, add components, scaffold templates, manage org services |
| [muffin-components](https://github.com/FootLooseLabs/muffin-components) | Public component registry — reusable `Muffin.DOMComponent` UI components |
| [muffin-templates](https://github.com/FootLooseLabs/muffin-templates) | Public template registry — full-page scaffolds (landing pages, layouts) |

## Docs

| Section | Description |
|---------|-------------|
| [Getting Started](https://footlooselabs.github.io/muffin-framework/guide/getting-started) | Install, first component, project setup |
| [Components](https://footlooselabs.github.io/muffin-framework/guide/components) | `Muffin.DOMComponent` lifecycle, attributes, slots |
| [Reactive State (uiVars)](https://footlooselabs.github.io/muffin-framework/guide/ui-vars) | Reactive variables and bindings |
| [Stores](https://footlooselabs.github.io/muffin-framework/guide/stores) | Shared state with `createStore()` |
| [State Machine](https://footlooselabs.github.io/muffin-framework/guide/state-machine) | Component-level state machines |
| [PostOffice](https://footlooselabs.github.io/muffin-framework/guide/post-office) | Pub/sub messaging between components and services |
| [WebSocket SDK](https://footlooselabs.github.io/muffin-framework/guide/websdk) | Service layer, WebInterface, authenticated requests |
| [Muffin + Tailwind + Vite](https://footlooselabs.github.io/muffin-framework/patterns/muffin-only) | Vanilla Muffin project setup pattern |
| [React + Muffin](https://footlooselabs.github.io/muffin-framework/patterns/react-muffin) | React + Muffin hybrid stack pattern |
| [Managing Services Across Projects](https://footlooselabs.github.io/muffin-framework/patterns/service-monorepo) | Private services monorepo pattern for orgs |

## Quick install

```sh
# CLI
npm install -g github:FootLooseLabs/muffin-cli

# Add a component
muf add lucide-icon

# Scaffold a template
muf init saas-landing-page

# Org services (requires .mufrc.json)
muf services list
muf services add AccountManagementService
```
