# `.mufrc.json` — Private Registries

`muf` supports private org registries for components, templates, and services alongside the public FootLooseLabs registries. Configuration lives in a `.mufrc.json` file placed in your project root (or any ancestor directory — `muf` walks up from cwd to find it).

## Full config shape

```json
{
  "registries": {
    "components": [
      "https://raw.githubusercontent.com/your-org/your-components/main/registry.json"
    ],
    "templates": [
      "https://raw.githubusercontent.com/your-org/your-templates/main/registry.json"
    ],
    "services": [
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services/main/packages/services-ts/registry.json",
        "stack": "ts",
        "alias": "@org-services",
        "path": "../../your-services/packages/services-ts"
      }
    ]
  }
}
```

## Components and templates

Point to any `registry.json` that follows the same shape as the public registries. Private entries are merged with the public registry — private wins on name collision.

```json
{
  "registries": {
    "components": [
      "https://raw.githubusercontent.com/your-org/your-components/main/registry.json"
    ]
  }
}
```

After adding this, `muf list`, `muf search`, and `muf add` include your private components transparently — no extra flags needed.

## Services

Services have a richer config object because `muf services add` also needs to know how to wire the vite alias:

| Field | Required | Description |
|-------|----------|-------------|
| `url` | yes | URL to the `registry.json` in your services repo |
| `stack` | no | `"ts"` or `"vanilla"` — shown in `muf services list` output |
| `alias` | no | Import alias to use (default: `@hais-services`) |
| `path` | no | Relative path for vite alias (used in the snippet `muf services add` prints) |
| `token` | no | Auth token for this registry — prefer `GITHUB_TOKEN` env var instead |

```json
{
  "registries": {
    "services": [
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services/main/packages/services-ts/registry.json",
        "stack": "ts",
        "alias": "@org-services",
        "path": "../../your-services/packages/services-ts"
      },
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services/main/packages/services-vanilla/registry.json",
        "stack": "vanilla",
        "alias": "@org-services-vanilla",
        "path": "../../your-services/packages/services-vanilla"
      }
    ]
  }
}
```

## Private GitHub repos

For private repos, set `GITHUB_TOKEN` in your environment:

```sh
export GITHUB_TOKEN=ghp_...
```

`muf` passes it as a Bearer token on every registry fetch and source fetch. You can also set a per-registry `token` field in the config, but the env var is simpler and keeps secrets out of committed files.

## What each command does with this config

| Command | Public registry | Private registries |
|---------|----------------|-------------------|
| `muf list` | FootLooseLabs/muffin-components | merged in |
| `muf list --templates` | FootLooseLabs/muffin-templates | merged in |
| `muf search <q>` | FootLooseLabs/muffin-components | merged in |
| `muf add <name>` | fetches source from public repo | fetches source from private repo |
| `muf services list` | — | reads configured services registries |
| `muf services search <q>` | — | reads configured services registries |
| `muf services add <name>` | — | checks vite alias, prints import line |
