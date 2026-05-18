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

The simplest approach with no tooling overhead is **path aliases** configured in each project's `vite.config.js`:

```js
// vite.config.js
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
// in any component or service
import AccountManager from '@org-services/account-management'
```

For TS projects, add the alias in `tsconfig.json` as well:

```json
{
  "compilerOptions": {
    "paths": {
      "@org-services/*": ["../../your-org-services/packages/services-ts/*"]
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

## New services

Write new services in TypeScript only. If a vanilla project needs the same service, add a vanilla version to `services-vanilla/` at that point — don't pre-emptively duplicate. The TS version in `services-ts/` is the canonical implementation.
