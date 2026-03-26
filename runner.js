const process = require('process')
const fs = require('fs')

const payloadFile = process.argv[2]
const payload = JSON.parse(fs.readFileSync(payloadFile, 'utf-8'))
fs.unlinkSync(payloadFile)
const { source, data, bootstrap, id, hostId } = payload

const log = console.log
console.log = (...args) => log(hostId === 'h1' ? '[Bootstrap]' : `[Host ${hostId}]`, ...args)

const fn = new Function('require', 'return ' + source)(require)
const controller = require('mininet/host')
fn({ data, bootstrap, id, controller })
