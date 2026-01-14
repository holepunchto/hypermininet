# Hypermininet

A high-level wrapper around [mininet](https://github.com/mafintosh/mininet) for testing [Hyperswarm](https://github.com/holepunchto/hyperswarm) and [HyperDHT](https://github.com/holepunchto/hyperdht) applications in simulated network conditions.

## Installation

```bash
npm install hypermininet
```

## Usage

```js
const Hypermininet = require('hypermininet')

const hypermininet = new Hypermininet({
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

await hypermininet.ready()

// Define a function to run on hosts
const helloWorld = hypermininet.add(({ data, bootstrap, controller }) => {
  const Hyperswarm = require('hyperswarm')
  const swarm = new Hyperswarm({ bootstrap })

  console.log('Running on host with data:', data)

  controller.on('data', (msg) => {
    console.log('Received:', msg)
  })
})

// Boot the hypermininet (starts the DHT bootstrapper)
await hypermininet.boot(async () => {
  for (const host of hypermininet.hosts) {
    await helloWorld(host, { hello: 'world' })
  }
})

// Cleanup
await hypermininet.close()
```

### Mixed network configs

As well as creating multiple hosts with a single `link` config (controlling speed, delay etc.); this can also be controlled per host.

The example will create 3 hosts, with 3 different preset configs used

```js
const Hypermininet = require('hypermininet')

const hypermininet = new Hypermininet({
  debug: true,
  mininet: { clean: true },
  network: {
    hosts: [
      Hypermininet.NetworkPotato,
      Hypermininet.NetworkOK,
      Hypermininet.Network3GRural
    ]
  }
})
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

### `await hypermininet.ready()`

Initialize the swarm. Creates the virtual network with the configured number of hosts.

### `hypermininet.hosts`

Array of available hosts (excluding the bootstrap host). Each host has an `ip` property.

### `hypermininet.add(callback)`

Register a function to run on hosts. Returns an async function that spawns the callback on a specific host.

The callback receives an object with:

- `data`: Custom data passed when invoking the returned function
- `bootstrap`: Array of bootstrap nodes (`[{ host, port }]`)
- `controller`: The `mininet/host` controller for IPC with the parent process

```js
const runTask = hypermininet.add(({ data, bootstrap, controller }) => {
  // This code runs in a separate Node.js process on the virtual host
  controller.send('done')
})

const proc = await runTask(host, { customData: 123 })
proc.on('message:done', () => console.log('Task completed'))
```

### `await hypermininet.boot(callback)`

Start the DHT bootstrapper and execute the callback. The bootstrapper runs on the first host and is automatically configured.

```js
await hypermininet.boot(async () => {
  // Bootstrap is ready, spawn your application hosts here
})
```

### `await hypermininet.close()`

Stop all processes and clean up the virtual network.

## Requirements

- Linux with Mininet installed
- Root/sudo access (required by Mininet)
- Node.js

## License

MIT
