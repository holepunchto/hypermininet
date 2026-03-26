const { test } = require('brittle')
const { once } = require('events')
const Hypermininet = require('..')

test('two workers', async (t) => {
  const hypermininet = new Hypermininet({
    debug: true,
    mininet: { clean: true, internet: true },
    network: {
      hosts: [
        {}, // bootstrap
        Hypermininet.NetworkOK,
        Hypermininet.NetworkOK
      ]
    }
  })
  await hypermininet.ready()

  const worker0 = hypermininet.add(async ({ controller }) => {
    await new Promise((r) => setTimeout(r, 1000))

    const invite = 'invite1'
    controller.send('ready', { invite })

    await new Promise((r) => setTimeout(r, 1000))

    const done = 'done1'
    controller.send('done', { done })
  })

  const worker1 = hypermininet.add(async ({ data, controller }) => {
    await new Promise((r) => setTimeout(r, 1000))

    controller.send('done', {
      invite: data.invite,
      done: 'done2'
    })
  })

  const proc0 = await worker0(hypermininet.hosts[0])
  const [data] = await once(proc0, 'message:ready')
  const proc1 = await worker1(hypermininet.hosts[1], data)

  const [[result0], [result1]] = await Promise.all([
    once(proc0, 'message:done'),
    once(proc1, 'message:done')
  ])

  t.is(result0.done, 'done1')
  t.is(result1.invite, 'invite1')
  t.is(result1.done, 'done2')

  await hypermininet.close()
})
