# PostOffice

Static class. Local cross-component pub/sub and WebSocket interface management.

```js
const { PostOffice } = window.Muffin
```

## Static methods

### `PostOffice.getOrCreateInterface(name, specs?)`
Get an existing interface or create it. Returns the interface object.

### `PostOffice.publishToInterface(name, message)`
Publish a message to all listeners on a named interface.

```js
Muffin.PostOffice.publishToInterface('ui-events', { type: 'modal-open', id: 'confirm' })
```

### `PostOffice.addGlobalListener(name, handler)`
Subscribe to all messages on an interface.

## Sockets

`PostOffice.sockets.global` is the default cross-component bus:

```js
// Dispatch
Muffin.PostOffice.sockets.global.dispatchMessage('event-name', payload)

// Listen (inside component)
this.interface.on('event-name', (msg) => { ... })
```

## PostOffice.Socket

Wraps a WebSocket or EventTarget with keep-alive (59s ping), auto-reconnect, and PostOffice integration.

```js
const socket = new Muffin.PostOffice.Socket({
    url: 'wss://api.example.com/ws',
    interfaceName: 'main-socket'
})
socket.connect()
```

Incoming messages are published to the named interface. Any component subscribed to `'main-socket'` receives them.

### Methods

| Method | Description |
|---|---|
| `connect()` | Open the connection |
| `send(message)` | Send a raw message |
| `publish(message)` | Publish via PostOffice to the interface |
| `addListener(handler)` | Add a listener for incoming messages |
| `dispatchMessage(label, data)` | Manually dispatch to all listeners |
