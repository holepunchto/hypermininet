const Hypermininet = require('.')
const b4a = require('b4a')
const DHT = require('hyperdht')

const hypermininet = new Hypermininet({
  debug: true,
  mininet: { clean: true },
  network: {
    hosts: 5,
    link: Hypermininet.NetworkOK
  }
})

const server = hypermininet.add(async ({ data, bootstrap, controller }) => {
  const node = new DHT({ bootstrap })
  await node.fullyBootstrapped()
  console.log(`[host ${data.idx}]`, 'running with bootstrap', bootstrap)

  const keyPair = DHT.keyPair()
  const server = node.createServer((conn) => {
    console.log('got connection!')
    process.stdin.pipe(conn).pipe(process.stdout)
  })

  await server.listen(keyPair) // await, not .then()
  console.log('listening on:', b4a.toString(keyPair.publicKey, 'hex'))

  // Wait for DHT announcement to propagate
  await new Promise((r) => setTimeout(r, 2000))

  controller.send('server', b4a.toString(keyPair.publicKey, 'hex'))
})

const client = hypermininet.add(async ({ data, bootstrap }) => {
  const node = new DHT({ bootstrap })
  await node.fullyBootstrapped()

  console.log(`[host ${data.idx}]`, 'running', data.idx)

  const publicKey = b4a.from(data.key, 'hex')
  const conn = node.connect(publicKey)
  conn.once('open', () => console.log('got connection!'))
})

// Trigger worker
hypermininet.boot(async () => {
  const serverProc = await server(hypermininet.hosts[0], { idx: 0 })
  serverProc.on('message:server', async (key) => {
    console.log('key', key)

    for (let i = 1; i < hypermininet.hosts.length; i++) {
      const h = hypermininet.hosts[i]
      await client(h, { idx: i, key })
    }
  })
})
