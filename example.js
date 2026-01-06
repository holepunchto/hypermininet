const Hypermininet = require('.')

async function main() {
  const hypermininet = new Hypermininet({
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
  await hypermininet.ready()

  async function close() {
    await hypermininet.close()
  }

  process.on('SIGINT', close)
  process.on('SIGTERM', close)

  // Cleanup on uncaught errors
  process.on('uncaughtException', (err) => {
    console.error('Uncaught exception:', err)
    close()
  })

  const helloWorld = hypermininet.add(({ data, bootstrap, controller }) => {
    const Hyperswarm = require('hyperswarm')
    const swarm = new Hyperswarm({ bootstrap })
    console.log('running!', data)

    controller.on('data', () => {
      console.log('got data', data)
    })
  })

  hypermininet.boot(async () => {
    for (let i = 0; i < hypermininet.hosts.length; i++) {
      const h = hypermininet.hosts[i]
      const _proc = helloWorld(h, { hello: i })
      console.log('from boot')
    }
  })

  setTimeout(() => {
    hypermininet.close()
  }, 5000)
}

main()
