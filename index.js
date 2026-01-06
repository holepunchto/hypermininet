const ReadyResource = require('ready-resource')
const Mininet = require('mininet')
const tmp = require('test-tmp')
const fs = require('fs/promises')
const path = require('path')

class Hypermininet extends ReadyResource {
  constructor(opts = {}) {
    super()

    this._mn = new Mininet(opts.mininet || {})
    this._networkConfig = opts.network || {}
    this._bootstrapOpts = opts.bootstrap || { port: 49737 }
    this._switch = null
    this._dir = null
    this._debug = opts.debug === true
    this._functions = 0
    this._hosts = []
  }

  get hosts() {
    return this._hosts.slice(1)
  }

  async _open() {
    const hosts = this._networkConfig.hosts || 10
    const linkOpts = this._networkConfig.link || {}

    this._dir = await tmp()
    this._switch = this._mn.createSwitch()

    this._log('Starting')

    for (let i = 0; i < hosts; i++) {
      const host = this._mn.createHost()
      host.link(this._switch, linkOpts)
      this._hosts.push(host)
    }

    return new Promise((res) => {
      this._mn.start(async () => {
        this._log(`Started`)

        res()
      })
    })
  }

  async _close() {
    return new Promise((res) => {
      this._mn.stop(async () => {
        await fs.rm(this._dir, { recursive: true })

        res()
      })
    })
  }

  _log(...msg) {
    if (!this._debug) return
    console.log('[hypermininet]', ...msg)
  }

  async _bootstrap() {
    this._log('Setting up Bootstrap')

    const run = this.add(async ({ data }) => {
      const DHT = require('hyperdht')
      const node = DHT.bootstrapper(data.port, '127.0.0.1')

      await node.fullyBootstrapped().then(function () {
        const mn = require('mininet/host')
        console.log('Bootstrapper running on port ' + node.address().port)

        mn.send('listening')
      })
    })

    const bootstrap = await run(this._hosts[0], this._bootstrapOpts)

    return new Promise((res) => {
      bootstrap.once('message:listening', async () => {
        this._log('Bootstrap ready')
        res()
      })
    })
  }

  async boot(cb) {
    await this._bootstrap()

    return cb()
  }

  add(cb) {
    return async (host, data) => {
      const idx = this._functions++
      const opts = {
        data,
        bootstrap: [{ host: this._hosts[0].ip, port: this._bootstrapOpts.port }]
      }
      const path = await this._saveCallback(idx, cb, opts)

      this._log('spawning', idx, path)
      const proc = host.spawn('node ' + path, { stdio: 'inherit' })

      return new Promise((res, rej) => {
        proc.once('spawn', () => {
          console.log('spawned', host.ip)
          res(proc)
        })
        proc.once('error', rej)
      })
    }
  }

  async _saveCallback(name, cb, opts) {
    const sourcePath = path.join(this._dir, name + '.js')
    const source = `const controller = require('mininet/host'); (
${cb.toString()}
)({controller,...${JSON.stringify(opts)}})`
    await fs.writeFile(sourcePath, source)

    return sourcePath
  }
}

module.exports = Hypermininet
