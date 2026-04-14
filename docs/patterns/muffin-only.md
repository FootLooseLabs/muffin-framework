# Muffin + Tailwind + Vite

Standard project setup for a pure muffin application.

## Project structure

```
my-project/
  src/
    components/
      my-component.js
    services/
      user-service.js
    stores/
      session.js
    main.js
  index.html
  vite.config.js
  package.json
```

## package.json

```json
{
  "dependencies": {
    "@muffin/element": "^0.9.2",
    "@muffin/atom-websdk": "^2.0.6"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "tailwindcss": "^3.0.0"
  }
}
```

## Bootstrap (`src/main.js`)

```js
import { applyAtomWebSDK } from '@muffin/atom-websdk'
import { DOMComponent, PostOffice, createStore, Router } from '@muffin/element'

// Expose Muffin globally (Web Components need it at define time)
window.Muffin = { DOMComponent, PostOffice, createStore, Router }

// Apply SDK extensions onto Muffin
applyAtomWebSDK(window.Muffin)

// Import all components (triggers customElements.define)
import './components/my-component.js'

// Start router
Router.init()
```

## A component

```js
const { DOMComponent } = window.Muffin

class UserProfile extends DOMComponent {
    __init__() {
        this.uiVars = { user: null, loading: true }
    }

    async connectedCallback() {
        super.connectedCallback()
        const user = await userService.getUser()
        this.uiVars.user = user
        this.uiVars.loading = false
    }

    markupFunc(data, uid, uiVars) {
        if (uiVars.loading) return `<div>Loading…</div>`
        return `
            <div class="p-4">
                <h1 class="text-xl font-bold">${this.esc(uiVars.user.name)}</h1>
            </div>
        `
    }
}

customElements.define('user-profile', UserProfile)
```

## A store

```js
// src/stores/session.js
import { createStore } from '@muffin/element'

export const sessionStore = createStore('session', {
    user: null,
    token: null
}, { persist: true })
```

## A service

```js
// src/services/user-service.js
import { Service } from '@muffin/atom-websdk'

class UserService extends Service {
    async getCurrent() {
        return this.request('get-current-user', {})
    }
}

export const userService = new UserService()
```
