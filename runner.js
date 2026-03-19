const process = require('process')

const payload = JSON.parse(Buffer.from(process.argv[2], 'base64').toString())
const { source, data, bootstrap, id, hostId } = payload

const log = console.log
console.log = (...args) => log(hostId === 'h1' ? '[Bootstrap]' : `[Host ${hostId}]`, ...args)

const fn = new Function('require', 'return ' + source)(require)
const controller = require('mininet/host')
fn({ data, bootstrap, id, controller })
