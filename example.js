const Hypermininet = require('.')
const Hyperswarm = require('hyperswarm')

const hypermininet = new Hypermininet({
  debug: true,
  mininet: { clean: true },
  network: {
    hosts: 5,
    link: Hypermininet.NetworkParkingGarage
  }
})

const topic = Buffer.alloc(32).fill('hello world')

// Register functions BEFORE checking worker status
const helloWorld = hypermininet.add(async ({ data, bootstrap }) => {
  const swarm = new Hyperswarm({ bootstrap })
  console.log(`[host ${data.idx}]`, 'running', data)

  if (data.idx === 0) {
    console.log(swarm)
    swarm.on('connection', (conn, info) => {
      console.log('connection!')
      // swarm1 will receive server connections
      conn.write('this is a server connection')
      conn.end()
    })
  } else {
    swarm.on('connection', (conn, info) => {
      conn.on('data', (data) => console.log('client got message:', data.toString()))
    })
  }

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
