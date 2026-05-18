# Managing Services Across Projects

As a muffin-based org grows across multiple projects, the same services tend to get copy-pasted — `AccountManagementService`, `FileUploaderService`, `WebInterfaceProvider` and others end up duplicated across every project, drifting slowly out of sync.

The recommended pattern is a **private services monorepo** for the org.

## Structure

```
your-org-services/   (private repo)
  packages/
    services-ts/      ← services for React + Muffin projects
    services-vanilla/ ← services for vanilla Muffin projects
    sdk/              ← WebInterfaceProvider and other infra (not services)
```

Each package is a plain directory of service files with a `registry.json` manifest — no build step required.

### `services-ts/`

For projects using the [React + Muffin](./react-muffin) stack. Services extend `ElementWebService` from `atom-websdk`.

```
services-ts/
  AccountManagementService.ts
  FileUploaderService.ts
  registry.json
  ...
```

### `services-vanilla/`

For projects using the [Muffin + Vite](./muffin-only) stack. Services extend `Muffin.Service`.

```
services-vanilla/
  account-management.js
  file-uploader.js
  registry.json
  ...
```

## What belongs here

Move a service into the monorepo when it appears in more than one project with minimal divergence. Services that are genuinely project-specific — tied to a feature or domain that only one project has — stay in that project.

**Good candidates:** auth/account management, file upload, sharing, resource access, any service where the interface is stable across projects.

**Keep in-project:** services that carry project-specific business logic, custom state, or interfaces that only one project talks to.

## What stays in each project

Project-specific services stay in the project under `src/web-services/` (vanilla) or `src/muffin-services/` (TS). The monorepo supplements — it doesn't replace — project-local services.

## Consuming from the monorepo

Works exactly like `muf add` for components — `muf services add` fetches the service source and copies it into your project. See [`.mufrc.json` — Private Registries](/cli/mufrc) for the full config reference.

### 1. Add `.mufrc.json` to the project root (commit it)

```json
{
  "registries": {
    "services": [
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services/main/packages/services-ts/registry.json",
        "stack": "ts"
      },
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services/main/packages/services-vanilla/registry.json",
        "stack": "vanilla"
      }
    ]
  }
}
```

Set `GITHUB_TOKEN` in the environment for private repo access.

### 2. Use `muf services add`

```sh
muf services list                            # see what's available
muf services add AccountManagementService    # → src/muffin-services/AccountManagementService.ts
muf services add account-management         # → src/web-services/account-management.js
muf services add AccountManagementService --dir ./src/services   # custom dir
```

The service file is copied directly into your project — same model as `muf add` for components. To update to a newer version, run `muf services add` again.

## Services registry

Each package needs a `registry.json` for `muf services` discovery:

```json
{
  "services": {
    "AccountManagementService": {
      "description": "Account info, session props, wallet, subscriptions",
      "stack": "ts",
      "tags": ["account", "wallet", "subscriptions"]
    },
    "FileUploaderService": {
      "description": "Signed URL upload, tracking, status, cleanup",
      "stack": "ts",
      "tags": ["upload", "files"]
    }
  }
}
```

## Naming convention

| Stack | File name | Class name |
|-------|-----------|------------|
| Vanilla | `account-management.js` | `AccountManager` or `AccountManagementService` |
| TypeScript | `AccountManagementService.ts` | `AccountManagementService` |

If the same service exists in both packages, keep the names aligned so it's obvious they represent the same contract.

## Adding a new service to the monorepo

1. Identify the most complete version across projects
2. Strip project-specific methods — those stay in-project as local extensions
3. Add the file to `services-ts/` or `services-vanilla/`
4. Add an entry to that package's `registry.json`
5. Remove copies from individual projects — replace with `muf services add`

Write new services in TypeScript first. Add a vanilla version to `services-vanilla/` only when a vanilla project actually needs it.
