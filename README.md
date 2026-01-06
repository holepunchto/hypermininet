# Hypermininet

A high-level wrapper around [mininet](https://github.com/mafintosh/mininet) for testing [Hyperswarm](https://github.com/holepunchto/hyperswarm) and [HyperDHT](https://github.com/holepunchto/hyperdht) applications in simulated network conditions.

## Installation

```bash
npm install hypermininet
```

## Usage

```js
const Hypermininet = require('hypermininet')

const swarm = new Hypermininet({
  debug: true,
  mininet: { clean: true },
  network: {
    hosts: 10,
    link: {
      bandwidth: 1, // 1 Mbit link
      delay: '100ms', // 100ms latency
      loss: 10, // 10% packet loss
      htb: true
    }
  }
})

await swarm.ready()

// Define a function to run on hosts
const helloWorld = swarm.add(({ data, bootstrap, controller }) => {
  const Hyperswarm = require('hyperswarm')
  const swarm = new Hyperswarm({ bootstrap })

  console.log('Running on host with data:', data)

  controller.on('data', (msg) => {
    console.log('Received:', msg)
  })
})

// Boot the swarm (starts the DHT bootstrapper)
await swarm.boot(async () => {
  for (const host of swarm.hosts) {
    await helloWorld(host, { hello: 'world' })
  }
})

// Cleanup
await swarm.close()
```

## API

### `new Hypermininet(opts)`

Create a new Hypermininet instance.

Options:

- `debug` (boolean): Enable debug logging. Default: `false`
- `mininet` (object): Options passed to the underlying Mininet instance
  - `clean` (boolean): Clean up existing Mininet state on start
- `network` (object): Network configuration
  - `hosts` (number): Number of hosts to create. Default: `10`
  - `link` (object): Link configuration applied to all host connections
    - `bandwidth` (number): Bandwidth in Mbit/s
    - `delay` (string): Latency (e.g., `'100ms'`)
    - `loss` (number): Packet loss percentage
    - `htb` (boolean): Use HTB qdisc
- `bootstrap` (object): Bootstrap node configuration
  - `port` (number): Port for the DHT bootstrapper. Default: `49737`

### `await swarm.ready()`

Initialize the swarm. Creates the virtual network with the configured number of hosts.

### `swarm.hosts`

Array of available hosts (excluding the bootstrap host). Each host has an `ip` property.

### `swarm.add(callback)`

Register a function to run on hosts. Returns an async function that spawns the callback on a specific host.

The callback receives an object with:

- `data`: Custom data passed when invoking the returned function
- `bootstrap`: Array of bootstrap nodes (`[{ host, port }]`)
- `controller`: The `mininet/host` controller for IPC with the parent process

```js
const runTask = swarm.add(({ data, bootstrap, controller }) => {
  // This code runs in a separate Node.js process on the virtual host
  controller.send('done')
})

const proc = await runTask(host, { customData: 123 })
proc.on('message:done', () => console.log('Task completed'))
```

### `await swarm.boot(callback)`

Start the DHT bootstrapper and execute the callback. The bootstrapper runs on the first host and is automatically configured.

```js
await swarm.boot(async () => {
  // Bootstrap is ready, spawn your application hosts here
})
```

### `await swarm.close()`

Stop all processes and clean up the virtual network.

## Requirements

- Linux with Mininet installed
- Root/sudo access (required by Mininet)
- Node.js

## License

MIT
