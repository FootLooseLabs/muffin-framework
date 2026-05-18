# Setting Up a Private Registry

Three types of private registries are supported — components, templates, and services. Each is a GitHub repo with a specific folder and file structure. Once set up, any project with a `.mufrc.json` pointing to it can use `muf` commands against it transparently.

---

## Components registry

Mirrors the structure of [muffin-components](https://github.com/FootLooseLabs/muffin-components).

### Repo structure

```
your-components-registry/
  components/
    your-component-name/
      index.js          ← component source (single file)
  registry.json         ← manifest index
  CONTRIBUTING.md       ← optional
```

### `registry.json`

```json
{
  "components": {
    "your-component-name": {
      "domElName": "your-component-name",
      "description": "One-line description",
      "extends": "Muffin.DOMComponent",
      "source": "components/your-component-name/index.js",
      "tags": ["tag1", "tag2"],
      "usage": [
        { "code": "<your-component-name></your-component-name>" }
      ]
    }
  }
}
```

### Component source (`index.js`)

```js
class YourComponentName extends Muffin.DOMComponent {
    static domElName = 'your-component-name'

    static markupFunc(_data, uid, uiVars) {
        return `<div>...</div>`
    }
}

export default YourComponentName
```

### `.mufrc.json` entry

```json
{
  "registries": {
    "components": [
      "https://raw.githubusercontent.com/your-org/your-components-registry/main/registry.json"
    ]
  }
}
```

`muf components add your-component-name` fetches `components/your-component-name/index.js` from this repo and copies it into the project.

---

## Templates registry

Mirrors the structure of [muffin-templates](https://github.com/FootLooseLabs/muffin-templates).

### Repo structure

```
your-templates-registry/
  templates/
    your-template-name/
      template.json     ← template manifest
      index.js          ← compose() entry point
      hero.js           ← additional files listed in template.json
      footer.js
  registry.json         ← manifest index
```

### `registry.json`

```json
{
  "templates": {
    "your-template-name": {
      "description": "One-line description",
      "tags": ["landing", "marketing"],
      "sections": ["hero", "features", "footer"],
      "files": ["index.js", "hero.js", "footer.js"],
      "components": ["lucide-icon"],
      "slots": ["headline", "subheadline", "cta-label"]
    }
  }
}
```

### `template.json` (inside each template folder)

```json
{
  "name": "your-template-name",
  "description": "One-line description",
  "sections": ["hero", "features", "footer"],
  "files": ["index.js", "hero.js", "footer.js"],
  "components": ["lucide-icon"],
  "slots": ["headline", "subheadline", "cta-label"],
  "tags": ["landing", "marketing"]
}
```

### `.mufrc.json` entry

```json
{
  "registries": {
    "templates": [
      "https://raw.githubusercontent.com/your-org/your-templates-registry/main/registry.json"
    ]
  }
}
```

`muf templates init your-template-name` fetches each file listed in `files` and copies them into the project.

---

## Services registry

### Repo structure

```
your-services-registry/
  packages/
    services-ts/
      AccountManagementService.ts
      FileUploaderService.ts
      registry.json     ← manifest for TS services
    services-vanilla/
      account-management.js
      file-uploader.js
      registry.json     ← manifest for vanilla services
    sdk/
      WebInterfaceProvider.ts   ← infra, not a service
```

### `registry.json` (services-ts)

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

### `registry.json` (services-vanilla)

```json
{
  "services": {
    "account-management": {
      "description": "Account info, session props, wallet, subscriptions",
      "stack": "vanilla",
      "file": "account-management.js",
      "tags": ["account", "wallet", "subscriptions"]
    }
  }
}
```

The `file` field is required for vanilla services since the filename doesn't follow a predictable pattern from the key name. For TS services it is inferred as `{name}.ts`.

### `.mufrc.json` entry

```json
{
  "registries": {
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

`muf services add AccountManagementService` fetches `packages/services-ts/AccountManagementService.ts` and copies it to `src/muffin-services/`. `muf services add account-management` fetches `packages/services-vanilla/account-management.js` and copies it to `src/web-services/`.

---

## Private repo access

All three registry types work with private GitHub repos. Set `GITHUB_TOKEN` in your environment:

```sh
export GITHUB_TOKEN=ghp_...
```

`muf` passes it as a Bearer token on every fetch — registry index and source files. Add it to your CI environment as a secret for the same effect.
