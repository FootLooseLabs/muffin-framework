# Muffin + Tailwind + Vite

Standard project setup for a muffin application (e.g. wity-agent-builder, wity-app).

## Project structure

```
my-project/
  src/
    components/
      app-ui/
        app-ui.js
      sidebar/
        sidebar.js
      index.js          ← all .compose() calls
    scripts/
      1_touchpoint.js   ← CDN script load
      2_utilities.js
      3_app.js          ← Router, WebInterface, root component
      4_polyfills.js    ← DOMComponent.prototype extensions
    styles/
      main.css
    main.js
  index.html
  vite.config.js
  package.json
```

## main.js

```js
import './styles/main.css'
import './scripts/1_touchpoint.js'
import './scripts/2_utilities.js'
import './scripts/3_app.js'
import './scripts/4_polyfills.js'
import './components/index.js'
```

## 3_app.js

```js
// Router
Muffin._router = new Muffin.Router({
    routeDelimiter: '?',
    basePath: '/tools/my-tool/'
})
Muffin._router.addRouteConfig([
    { name: 'home', defaultRoute: true },
    { name: 'detail' }
])

// WebSocket connection
Muffin.WebInterface = new Muffin.WebRequestSdk({ label: 'sandbox' })
Muffin.WebInterface.connect()

// Root component
class AppUI extends Muffin.DOMComponent {
    static domElName = 'app-ui'

    static markupFunc(_data, uid, uiVars) {
        return `
            <main>
                <app-sidebar></app-sidebar>
                <app-content></app-content>
            </main>
        `
    }
}

AppUI.compose = () => {
    AppSidebar.compose()
    AppContent.compose()
    AppUI.prototype.constructor._composeSelf()
}
```

## index.html

```html
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <script src="https://cdn.footloose.io/atom-websdk/2.0.6/sdk.min.js"></script>
</head>
<body>
    <app-ui></app-ui>
    <script type="module">import('/src/main.js')</script>
</body>
</html>
```

## A component

```js
class AgentCard extends Muffin.DOMComponent {
    static domElName = 'agent-card'
    static parent = 'app-content'
    static childscope = 'agentCard'

    static markupFunc(_data, uid, uiVars) {
        return `
            <div class="p-4 rounded-lg bg-white shadow">
                <h3 class="text-lg font-bold">${uiVars.name}</h3>
                <p render-if="uiVars.loading" class="text-gray-400">Loading…</p>
                <div render-if="!uiVars.loading">
                    <p>${uiVars.description}</p>
                    <button on-click="handleEdit" class="btn">Edit</button>
                </div>
            </div>
        `
    }

    constructor() {
        super()
        this.uiVars.name = ''
        this.uiVars.description = ''
        this.uiVars.loading = true
    }

    async onConnect() {
        const data = await AgentService.getDetails(this._data.id)
        this.uiVars.name = data.name
        this.uiVars.description = data.description
        this.uiVars.loading = false
    }

    handleEdit(srcEl, ev) {
        this.callParent(srcEl, ev)
    }
}

AgentCard.compose()
```

## A service

```js
class AgentService extends Muffin.Service {
    static name = 'AgentService'

    static Interfaces = {
        Dev: '@vritti/ideator:::AgentDevelopmentService'
    }

    static async getDetails(slug) {
        const res = await Muffin.WebInterface.request(
            this.Interfaces.Dev,
            { subject: 'getDetails', params: { slug } },
            { MAX_RESPONSE_TIME: 10000 }
        )
        return res.result
    }
}
```
