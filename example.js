const MininetSwarm = require('.')

async function main() {
  const swarm = new MininetSwarm({
    debug: true,
    mininet: { clean: true },
    network: {
      s1: {
        hosts: 10,
        link: {
          bandwidth: 1, // use 1mbit link
          delay: '100ms', // 100ms delay
          loss: 10, // 10% package loss
          htb: true // use htb
        }
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

  swarm.run((opts) => {
    console.log('running!', opts)
  })

  setTimeout(() => {
    swarm.close()
  }, 5000)
}

main()
