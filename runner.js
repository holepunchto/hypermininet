const process = require('process')
const Corestore = require('corestore')

const runtimeId = process.argv[2]

async function main() {
  const store = new Corestore('.runtime', { readOnly: true })
  const core = store.get({ name: runtimeId, valueEncoding: 'json' })
  await core.ready()

  const { data, bootstrap, id, hostId, source } = await core.get(0)
  await store.close()

  const log = console.log
  console.log = (...args) => log(hostId === 'h1' ? '[Bootstrap]' : `[Host ${hostId}]`, ...args)
  const fn = new Function('require', 'return ' + source)(require)
  const controller = require('mininet/host')

  fn({ data, bootstrap, id, controller }).catch(async (err) => {
    console.error(err)
    process.exitCode = 1
  })
}

main()
