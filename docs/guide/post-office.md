# PostOffice

PostOffice is the cross-component messaging layer. It handles local pub/sub between components and wraps WebSocket connections into named interfaces that any component can subscribe to.

## Interfaces

An interface is a named message channel. Components publish to or subscribe from interfaces by name.

```js
// Publish
Muffin.PostOffice.sockets.global.dispatchMessage('user-selected', { id: 42 })

// Subscribe (inside a component)
this.interface.on('user-selected', (msg) => {
    this.uiVars.selectedId = msg.id
})
```

## Advertising an interface

A component can advertise itself as a named interface — other components call it by that name without needing a DOM reference.

```js
class NotificationDialog extends Muffin.DOMComponent {
    static domElName = 'notification-dialog'
    static advertiseAs = 'NotificationManager'

    static interfaceSpecs = {
        'notify-foreground': Muffin.Lexeme   // message schema
    }

    onConnect() {
        this.advertisedInterface = Muffin.PostOffice.getOrCreateInterface(
            'NotificationManager',
            this.constructor.interfaceSpecs
        )
        this.advertisedInterface.on('notify-foreground', (msg) => {
            this.launch(msg.msgTxt)
        })
    }

    launch(text) {
        this.uiVars.message = text
        this.uiVars.visible = true
    }
}
```

Once composed, any component calls it directly:

```js
Muffin.NotificationManager('Something happened', { duration: 1500 })
```

## initSubscriptions (batch wiring)

Wire up multiple WebSocket subscriptions cleanly via the `initSubscriptions` helper (available after `applyAtomWebSDK`):

```js
async onConnect() {
    await this.initSubscriptions([
        {
            host: '@vritti/ideator',
            interface: '|||broadcast-event',
            localInterfaceEvent: 'new-data'
        }
    ])

    this.interface.on('new-data', (msg) => {
        this.uiVars.items = msg.items
    })
}
```

## PostOffice vs stores

| | PostOffice | createStore() |
|---|---|---|
| Nature | Events — transient, fire and forget | State — persistent, readable at any time |
| Use for | Notifications, actions, socket messages arriving | Session data, domain lists, shared UI state |
| React analogy | EventEmitter / CustomEvent | Zustand / Context |

They are complementary. A common pattern: a WebSocket message arrives via PostOffice → updates a store → components subscribed to that store re-render.
