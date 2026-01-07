const Hypermininet = require('.')
const Hyperswarm = require('hyperswarm')

const hypermininet = new Hypermininet({
  debug: true,
  mininet: { clean: true },
  network: {
    link: { bandwidth: 1, delay: '100ms', loss: 10, htb: true }
  }
})

const topic = Buffer.alloc(32).fill('hello world')

// Register functions BEFORE checking worker status
const helloWorld = hypermininet.add(async ({ data, bootstrap }) => {
  const swarm = new Hyperswarm({ bootstrap })
  console.log('running', data)

  const discovery = swarm.join(topic)
  await discovery.flushed()
})

// Trigger worker
hypermininet.boot(async () => {
  for (let i = 0; i < hypermininet.hosts.length; i++) {
    const h = hypermininet.hosts[i]
    await helloWorld(h, { hello: 'world', idx: i })
  }
})

setTimeout(() => hypermininet.close(), 5000)
