# muf CLI

Command-line interface for the muffin ecosystem. Install once globally:

```sh
npm install -g github:FootLooseLabs/muffin-cli
```

---

## muf components

Browse and add components from the public registry (or private registries configured in `.mufrc.json`).

### `muf components list`

```sh
muf components list
```

### `muf components search <query>`

```sh
muf components search editor
muf components search dialog
```

### `muf components info <name>`

Show the full manifest — attributes, PostOffice interfaces, usage examples.

```sh
muf components info json-editor
```

### `muf components add <name>`

Copy a component into your project. Defaults to `./src/components`.

```sh
muf components add json-editor
muf components add confirm-dialog --dir ./src/components/utils
```

The source is copied directly into your project — you own it. Run again to update to a newer version.

---

## muf templates

Browse and scaffold templates from the public registry (or private registries configured in `.mufrc.json`).

### `muf templates list`

```sh
muf templates list
```

### `muf templates search <query>`

```sh
muf templates search landing
```

### `muf templates init <name>`

Scaffold a full-page template into your project. Defaults to `./src`.

```sh
muf templates init saas-landing-page
muf templates init dark-media-landing-page --dir ./src/pages
```

---

## muf services

Browse and add org services from a private registry configured in `.mufrc.json`. See [.mufrc.json](/cli/mufrc) for setup.

### `muf services list`

```sh
muf services list
muf services list --search upload
```

### `muf services search <query>`

```sh
muf services search brand
```

### `muf services add <name>`

Copy a service into your project. TS services go to `src/muffin-services/`, vanilla to `src/web-services/`.

```sh
muf services add AccountManagementService
muf services add account-management
muf services add AccountManagementService --dir ./src/services
```

Run again to update to the latest version.
