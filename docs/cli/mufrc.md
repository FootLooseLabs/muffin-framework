# `.mufrc.json` — Private Registries

`muf` supports private org registries for components, templates, and services alongside the public FootLooseLabs registries. Configuration lives in a `.mufrc.json` file placed in your project root (or any ancestor directory — `muf` walks up from cwd to find it).

## Full config shape

```json
{
  "registries": {
    "components": [
      "https://raw.githubusercontent.com/your-org/your-components-registry/main/registry.json"
    ],
    "templates": [
      "https://raw.githubusercontent.com/your-org/your-templates-registry/main/registry.json"
    ],
    "services": [
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services-registry/main/packages/services-ts/registry.json",
        "stack": "ts"
      },
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services-registry/main/packages/services-vanilla/registry.json",
        "stack": "vanilla"
      }
    ]
  }
}
```

Commit this file — other developers on the project won't need to configure anything.

## Components and templates

Point to any `registry.json` that follows the same shape as the public registries. Private entries are merged with the public registry — private wins on name collision.

After adding this, `muf components list`, `muf components search`, and `muf components add` include your private components transparently — no extra flags needed.

## Services

`muf services add` copies the service source file directly into the project — same model as `muf components add`. No vite alias or path config needed.

| Field | Required | Description |
|-------|----------|-------------|
| `url` | yes | URL to the `registry.json` in your services repo |
| `stack` | no | `"ts"` → copies to `src/muffin-services/`, `"vanilla"` → `src/web-services/` |
| `token` | no | Auth token for this registry — prefer `GITHUB_TOKEN` env var instead |

```sh
muf services add AccountManagementService          # → src/muffin-services/AccountManagementService.ts
muf services add account-management               # → src/web-services/account-management.js
muf services add AccountManagementService --dir ./src/services   # custom dir
```

To update a service to the latest version, just run `muf services add` again — it overwrites the file.

## Private GitHub repos

For private repos, set `GITHUB_TOKEN` in your environment:

```sh
export GITHUB_TOKEN=ghp_...
```

`muf` passes it as a Bearer token on every registry fetch and source fetch. You can also set a per-registry `token` field in the config, but the env var is simpler and keeps secrets out of committed files.

For the full command reference see [muf CLI](/cli/muf).
