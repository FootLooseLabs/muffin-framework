# React + Muffin

Muffin doesn't constrain a single pattern. In React projects, muffin can be used purely as the **WebSocket and service transport layer** while React owns the UI. This is one valid pattern — not a workaround.

## How it works

Muffin loads into `window.Muffin`. React components import a `WebInterface` singleton and call service classes exactly as muffin-only projects do. No `DOMComponent` subclasses needed.

```
React component
  └── hook (useEntityManager, useWebInterface)
       └── Service class (extends Muffin.Service)
            └── Muffin.WebInterface.request()
                 └── WebSocket → microservice
```

## Setup

Load muffin once before React mounts (in `main.tsx`):

```ts
// src/main.tsx
import { loadAtomWebSDK } from './muffin-sdk'

await loadAtomWebSDK()   // sets window.Muffin, connects WebInterface

// imported only now: its services extend Muffin.Service as their modules run. A static `import App` would run first
// (imports are hoisted), before the SDK is there.
const [{ createRoot }, { default: App }] = await Promise.all([import('react-dom/client'), import('./App')])
createRoot(document.getElementById('root')!).render(<App />)
```

`muffin-sdk/index.ts` — thin wrapper:

```ts
export async function loadAtomWebSDK() {
    // Load sdk.min.js from CDN if not already loaded
    if (window.Muffin) return
    await loadScript('https://cdn.jsdelivr.net/gh/FootLooseLabs/atom-websdk@3.5.1/dist/sdk.min.js')
    // kept open: reopened after a drop, its subscriptions made again (see WebRequestSdk — The connection)
    Muffin.WebInterface = new Muffin.WebRequestSdk({ label: 'sandbox', reconnect: true })
    await Muffin.WebInterface.connect()
}

export function getMuffin() { return window.Muffin }
```

## Service layer (TypeScript)

```ts
// src/services/asset-service.ts
import { getMuffin } from '../muffin-sdk'

const Muffin = getMuffin()

class AssetService extends Muffin.Service {
    static name = 'AssetService'

    static Interfaces = {
        Dam: '@myhost/app:::AssetManagementService'
    }

    static async getAssets(filters: AssetFilters): Promise<Asset[]> {
        const res = await Muffin.WebInterface.request(
            this.Interfaces.Dam,
            { subject: 'getAssets', params: filters },
            { MAX_RESPONSE_TIME: 10000 }
        )
        return res.result
    }
}

export default AssetService
```

## React hook

```ts
// src/hooks/useAssets.ts
import { useState, useEffect } from 'react'
import AssetService from '../services/asset-service'

export function useAssets(filters: AssetFilters) {
    const [assets, setAssets] = useState<Asset[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        AssetService.getAssets(filters).then(data => {
            setAssets(data)
            setLoading(false)
        })
    }, [filters])

    return { assets, loading }
}
```

## React component

```tsx
export function AssetGrid({ folderId }: { folderId: string }) {
    const { assets, loading } = useAssets({ folderId })

    if (loading) return <Spinner />
    return (
        <div className="grid">
            {assets.map(a => <AssetCard key={a.id} asset={a} />)}
        </div>
    )
}
```

## TypeScript declarations

The SDK ships its types (`@muffin/atom-websdk`, `src/main.d.ts`). Installed from git for its types only
(`npm i -D github:FootLooseLabs/atom-websdk#v3.5.1`), the app declares `window.Muffin` with them:

```ts
// src/muffin-sdk/muffin.d.ts
import type { WebRequestSdk, Service } from '@muffin/atom-websdk'

declare global {
    interface Window {
        Muffin: {
            WebRequestSdk: typeof WebRequestSdk
            Service: typeof Service
            WebInterface: WebRequestSdk
            PostOffice: any
            DOMComponent: any
        }
    }
}
```

## When to use which pattern

| Use muffin-only | Use React + muffin transport |
|---|---|
| App is primarily a WebSocket-driven tool or UI is niche or custom | Tool is standard UI and state management, forms, conditional flows |
| Deep use of state machine, PostOffice, surface/tab patterns | Team has React expertise, component trees are large |
| CDN-first deployment, no build complexity | TypeScript throughout is a hard requirement |

Both patterns use the same `Service` classes and `WebInterface` singleton — only the UI layer differs.
