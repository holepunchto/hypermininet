const ReadyResource = require('ready-resource')
const sodium = require('sodium-universal')
const b4a = require('b4a')
const process = require('process')
const Corestore = require('corestore')

class Hypermininet extends ReadyResource {
  constructor(opts = {}) {
    super()

    // configs
    this._networkConfig = opts.network || {}
    this._bootstrapOpts = opts.bootstrap || { port: 49737 }
    this._debug = opts.debug === true

    // network
    const Mininet = require('mininet')
    this._mn = new Mininet(opts.mininet || {})

    this._switch = null
    this._hosts = []

    this._store = new Corestore('.runtime')

    this._bootstrapRunner = this.add(async ({ data }) => {
      const createTestnet = require('hyperdht/testnet')
      const mn = require('mininet/host')

      const { bootstrap } = await createTestnet(10, { host: '10.0.0.1', port: data.port })
      console.log('ready on', bootstrap)
      mn.send('listening')
    })
  }

  static NetworkPotato = {
    bandwidth: 0.1,
    delay: '500ms',
    loss: 40,
    jitter: '200ms',
    htb: true
  }

  static NetworkDorset = {
    bandwidth: 40,
    delay: '500ms',
    loss: 1,
    jitter: '80ms',
    htb: true
  }

  static NetworkDyingBattery = {
    bandwidth: 0.05, // 50 Kbps - phone about to die
    delay: '800ms',
    loss: 50,
    jitter: '300ms',
    htb: true
  }

  static NetworkUnderwater = {
    bandwidth: 0.25,
    delay: '2000ms', // 4 second round trip
    loss: 30,
    jitter: '500ms',
    htb: true
  }

  static NetworkMarsRover = {
    bandwidth: 0.5,
    delay: '10000ms', // 20 second round trip (not actual Mars, but painful)
    loss: 10,
    jitter: '1000ms',
    htb: true
  }

  static NetworkParkingGarage = {
    bandwidth: 0.5, // 500 Kbps - edge of usability
    delay: '300ms', // really struggling
    loss: 25, // significant drops
    jitter: '100ms',
    htb: true
  }

  static NetworkCoffeeShop = {
    bandwidth: 10,
    delay: '30ms',
    loss: 2,
    jitter: '10ms',
    htb: true
  }

  static NetworkSubway = {
    bandwidth: 0.25,
    delay: '500ms',
    loss: 35,
    jitter: '200ms',
    htb: true
  }

  static NetworkAirplane = {
    bandwidth: 2,
    delay: '600ms', // satellite backhaul
    loss: 5,
    jitter: '50ms',
    htb: true
  }

  static Network3GRural = {
    bandwidth: 1,
    delay: '150ms',
    loss: 8,
    jitter: '40ms',
    htb: true
  }

  static NetworkOverloadedWifi = {
    bandwidth: 5,
    delay: '50ms',
    loss: 10,
    jitter: '80ms', // high jitter from contention
    htb: true
  }

  static NetworkOK = {
    bandwidth: 10, // use 10mbit link
    delay: '100ms', // 100ms delay
    loss: 10, // 10% package loss
    htb: true // use htb
  }

  static NetworkLAN = {
    bandwidth: 1000,
    loss: 0,
    jitter: '0ms',
    htb: true
  }

  get hosts() {
    return this._hosts.slice(1)
  }

  get bootstrap() {
    return [{ host: this._hosts[0].ip, port: this._bootstrapOpts.port }]
  }

  async _open() {
    let hosts = this._networkConfig.hosts || 10
    const linkOpts = this._networkConfig.link || {}

    this._switch = this._mn.createSwitch()
    await this._fixOutput()

    console.log('Starting')

    if (!Array.isArray(hosts)) {
      hosts = new Array(hosts).fill(linkOpts)
    }

    for (let i = 0; i < hosts.length; i++) {
      const opts = hosts[i]
      const host = this._mn.createHost()
      host.link(this._switch, opts)
      console.log('host', i, 'options:', opts)
      this._hosts.push(host)
    }

    return new Promise((res) => {
      this._mn.start(async () => {
        console.log(`Started mininet`)

        const proc = await this._bootstrapRunner(this._hosts[0], this._bootstrapOpts)
        proc.on('message:listening', () => {
          res()
        })
      })
    })
  }

  async _fixOutput() {
    if (!process.stdin.isTTY) return
    // wait for python to break output
    await new Promise((res) => setTimeout(res, 100))
    const { spawnSync } = require('child_process')
    spawnSync('stty', ['sane'], { stdio: 'inherit' })
  }

  async _close() {
    return new Promise((res) => {
      this._mn.stop(async () => {
        await this._store.close()
        res()
      })
    })
  }

  async boot(cb) {
    await this.ready()
    return cb()
  }

  add(cb, overrideExec) {
    const source = cb.toString()
    const id = this._hash(source)

    return async (host, data) => {
      const runtimeId = this._hash(`${id}/${host.id}`)

      const core = this._store.get({ name: runtimeId, valueEncoding: 'json' })
      await core.ready()
      await core.truncate(0)

      const payload = {
        source,
        data,
        bootstrap: this.bootstrap,
        id,
        hostId: host.id
      }

      await core.append(payload)

      console.log('spawning', id, 'on', host.ip)

      const exec = overrideExec || this._networkConfig.exec || process.execPath
      const runner = require.resolve('./runner.js')
      const proc = host.spawn([exec, runner, runtimeId], { stdio: 'inherit' })

      return new Promise((res, rej) => {
        proc.once('spawn', () => res(proc))
        proc.once('error', rej)
      })
    }
  }

  static isMain() {
    return true
  }

  _hash(source) {
    const hash = b4a.allocUnsafe(32)
    sodium.crypto_generichash(hash, b4a.from(source, 'utf-8'))

    return hash.toString('hex')
  }
}

module.exports = Hypermininet
