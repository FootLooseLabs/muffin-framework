# React + Muffin Islands

Pattern for projects that use React as the primary UI layer with muffin Web Components as isolated islands — typically for real-time widgets, complex form elements, or legacy muffin components being incrementally migrated.

## How it works

Muffin Web Components live inside React JSX like any native HTML element. React renders the tag; muffin's `connectedCallback` takes over the internals. Communication between React and muffin happens through PostOffice (pub/sub) — they share no state directly.

```
React tree
  └── <div className="layout">
        ├── <ReactHeader />          ← React component
        ├── <live-feed-widget />     ← Muffin Web Component
        └── <ReactSidebar />        ← React component
```

## Setup

```bash
pnpm add @muffin/element @muffin/atom-websdk
```

Bootstrap muffin once, before React mounts — in `main.tsx`:

```ts
import { applyAtomWebSDK } from '@muffin/atom-websdk'
import { DOMComponent, PostOffice, createStore } from '@muffin/element'

window.Muffin = { DOMComponent, PostOffice, createStore }
applyAtomWebSDK(window.Muffin)

// Register muffin components
import './muffin/live-feed-widget.js'
import './muffin/notification-bell.js'

// Then mount React
import { createRoot } from 'react-dom/client'
import App from './App'
createRoot(document.getElementById('root')!).render(<App />)
```

## Using a muffin component in JSX

TypeScript needs the custom element declared:

```ts
// src/custom-elements.d.ts
declare namespace JSX {
    interface IntrinsicElements {
        'live-feed-widget': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
        'notification-bell': React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>
    }
}
```

```tsx
export function Dashboard() {
    return (
        <div className="dashboard">
            <DashboardHeader />
            <live-feed-widget />
        </div>
    )
}
```

## React → Muffin communication (via PostOffice)

```ts
// React side — publish an event
import { PostOffice } from '@muffin/element'  // or window.Muffin.PostOffice

function FilterBar() {
    const applyFilter = (filter: string) => {
        PostOffice.publishToInterface('ui-events', { type: 'filter-changed', filter })
    }
    return <button onClick={() => applyFilter('active')}>Active</button>
}
```

```js
// Muffin component — listen for the event
class LiveFeedWidget extends DOMComponent {
    __init__() {
        this.uiVars = { items: [], filter: 'all' }
    }

    connectedCallback() {
        super.connectedCallback()
        PostOffice.addGlobalListener('ui-events', (msg) => {
            if (msg.type === 'filter-changed') {
                this.uiVars.filter = msg.filter
            }
        })
    }
}
```

## Muffin → React communication (via CustomEvent)

```js
// Muffin component — dispatch a native DOM event
class NotificationBell extends DOMComponent {
    openPanel() {
        this.dispatchEvent(new CustomEvent('notification-open', { bubbles: true }))
    }
}
```

```tsx
// React side — listen on the container ref
function App() {
    const ref = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handler = () => setNotifOpen(true)
        ref.current?.addEventListener('notification-open', handler)
        return () => ref.current?.removeEventListener('notification-open', handler)
    }, [])

    return <div ref={ref}><notification-bell /></div>
}
```

## Shared stores

Stores created with `createStore()` are accessible from both sides since they live in the JS module scope.

```ts
// src/stores/notifications.js
import { createStore } from '@muffin/element'
export const notifStore = createStore('notifications', { unread: 0, items: [] })
```

```ts
// React — read the store
import { notifStore } from '../stores/notifications'
const [count, setCount] = useState(notifStore.get().unread)
notifStore.subscribe(s => setCount(s.unread))
```

```js
// Muffin — declare the store
class NotificationBell extends DOMComponent {
    __init__() {
        this.stores = { notifications: notifStore }
    }
}
```
