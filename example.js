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

  const helloWorld = swarm.add((opts) => {
    const Hyperswarm = require('hyperswarm')
    const swarm = new Hyperswarm({ bootstrap: opts.bootstrap })
    console.log('running!')
  })

  swarm.boot(async (opts) => {
    const controller = helloWorld(swarm.hosts[1], opts)
    console.log(opts)
  })

  setTimeout(() => {
    swarm.close()
  }, 5000)
}

main()
