# Managing Services Across Projects

As a muffin-based org grows across multiple projects, the same services tend to get copy-pasted — `AccountManagementService`, `FileUploaderService`, `WebInterfaceProvider` and others end up duplicated across every project, drifting slowly out of sync.

The recommended pattern is a **private services monorepo** for the org.

## Structure

```
your-org-services/   (private repo)
  packages/
    services-ts/     ← services for React + Muffin projects
    services-vanilla/ ← services for vanilla Muffin projects
```

Each package is a plain directory of service files — no build step required.

### `services-ts/`

For projects using the [React + Muffin](./react-muffin) stack. Services extend `ElementWebService` (the TypeScript-compatible base class from `atom-websdk`).

```
services-ts/
  AccountManagementService.ts
  FileUploaderService.ts
  WebInterfaceProvider.ts
  ...
```

### `services-vanilla/`

For projects using the [Muffin + Vite](./muffin-only) stack. Services extend `Muffin.Service`.

```
services-vanilla/
  account-management.js
  file-uploader.js
  ...
```

## What belongs here

Move a service into the monorepo when it appears in more than one project with minimal divergence. Services that are genuinely project-specific — tied to a feature or domain that only one project has — stay in that project.

**Good candidates:** auth/account management, file upload, sharing, resource access, any service where the interface is stable across projects.

**Keep in-project:** services that carry project-specific business logic, custom state, or interfaces that only one project talks to.

## What stays in each project

Project-specific services stay in the project under `src/web-services/` (vanilla) or `src/muffin-services/` (TS). The monorepo supplements — it doesn't replace — project-local services.

## Consuming from the monorepo

The recommended approach is to configure a `.mufrc.json` in each project and use `muf services add` to wire up the alias and get the import line. See [`.mufrc.json` — Private Registries](/cli/mufrc) for the full config reference.

### 1. Add `.mufrc.json` to the project root

```json
{
  "registries": {
    "services": [
      {
        "url": "https://raw.githubusercontent.com/your-org/your-services/main/packages/services-ts/registry.json",
        "stack": "ts",
        "alias": "@org-services",
        "path": "../../your-org-services/packages/services-ts"
      }
    ]
  }
}
```

For private repos set `GITHUB_TOKEN` in the environment — `muf` picks it up automatically.

### 2. Use `muf services add`

```sh
muf services add AccountManagementService
```

This checks for the vite alias and tsconfig paths — prints the exact snippet to add if either is missing — then prints the import line:

```ts
import AccountManagementService from '@org-services/AccountManagementService'
```

### Manual setup (no CLI)

If you prefer to configure manually, add the alias in `vite.config.js`:

```js
import path from 'path'

export default {
    resolve: {
        alias: {
            '@org-services': path.resolve(__dirname, '../../your-org-services/packages/services-vanilla')
        }
    }
}
```

```js
import AccountManager from '@org-services/account-management'
```

For TS projects, also add to `tsconfig.json`:

```json
{
  "compilerOptions": {
    "paths": {
      "@org-services/*": ["../../your-org-services/packages/services-ts/*"]
    }
  }
}
```

## Services registry

For `muf services list` and `muf services add` to work, each package in the monorepo needs a `registry.json`:

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

This is the only file `muf` reads from the services repo — the actual service files are never fetched by the CLI, only referenced via the vite alias.

## Naming convention

| Stack | File name | Class name |
|-------|-----------|------------|
| Vanilla | `account-management.js` | `AccountManager` or `AccountManagementService` |
| TypeScript | `AccountManagementService.ts` | `AccountManagementService` |

If the same service exists in both packages, keep the names aligned so it's obvious they represent the same contract.

## New services

Write new services in TypeScript only. If a vanilla project needs the same service, add a vanilla version to `services-vanilla/` at that point — don't pre-emptively duplicate. The TS version in `services-ts/` is the canonical implementation.
