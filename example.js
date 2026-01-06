const Hypermininet = require('.')

async function main() {
  const swarm = new Hypermininet({
    debug: true,
    mininet: { clean: true },
    network: {
      link: {
        bandwidth: 1, // use 1mbit link
        delay: '100ms', // 100ms delay
        loss: 10, // 10% package loss
        htb: true // use htb
      }
    }
  })
  await swarm.ready()

  async function close() {
    await swarm.close()
  }

  process.on('SIGINT', close)
  process.on('SIGTERM', close)

  // Cleanup on uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err)
    close()
  })

  const helloWorld = swarm.add(({ data, bootstrap, controller }) => {
    const Hyperswarm = require('hyperswarm')
    const swarm = new Hyperswarm({ bootstrap })
    console.log('running!', data)

    controller.on('data', () => {
      console.log('got data', data)
    })
  })

  swarm.boot(async () => {
    for (let i = 0; i < swarm.hosts.length; i++) {
      const h = swarm.hosts[i]
      const _proc = helloWorld(h, { hello: i })
      console.log('from boot')
    }
  })

  setTimeout(() => {
    swarm.close()
  }, 5000)
}

main()
