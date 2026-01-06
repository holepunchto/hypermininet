const ReadyResource = require('ready-resource')
const Mininet = require('mininet')
const assert = require('assert')
const tmp = require('test-tmp')
const fs = require('fs/promises')
const path = require('path')
const { stderr } = require('process')

class MininetSwarm extends ReadyResource {
  constructor(opts = {}) {
    super()

    this._mn = new Mininet(opts.mininet || {})
    this._networkConfig = opts.network || {
      s1: {
        hosts: 2
      }
    }
    this._bootstrapOpts = opts.bootstrap || { port: 49737 }
    this._switches = new Map()
    this._hosts = new Map()
    this._debug = opts.debug === true
    this._tmpDirs = []
  }

  get switches() {
    return this._switches
  }

  get hosts() {
    return this._hosts
  }

  async _open() {
    for (const [key, value] of Object.entries(this._networkConfig)) {
      const sw = this._mn.createSwitch()
      const targetHosts = value.hosts || 2
      const linkOpts = value.link || {}

      this._log('options:', targetHosts, linkOpts)

      assert(typeof targetHosts == 'number' && targetHosts > 0)

      this._switches.set(key, sw)

      // setup bootstrap
      const bootstrap = this._mn.createHost()
      this._hosts.set('bootstrap', bootstrap)
      bootstrap.link(sw, linkOpts)

      // setup hosts
      for (let i = 0; i < targetHosts; i++) {
        const host = this._mn.createHost()
        this._hosts.set(`h${i}`, host)

        host.link(sw, linkOpts)
      }
    }

    this._log('Starting')

    return new Promise((res) => {
      this._mn.start(async () => {
        this._log(`Started with ${this._switches.size} switch(es) and ${this._hosts.size} host(s)`)

        res()
      })
    })
  }

  async _close() {
    return new Promise((res) => {
      this._mn.stop(async () => {
        await Promise.all(
          this._tmpDirs.map((d) => {
            this._log('Clean dir', d)
            return fs.rm(d, { recursive: true })
          })
        )

        res()
      })
    })
  }

  _log(...msg) {
    if (!this._debug) return
    console.log('[swarm]', ...msg)
  }

  async _bootstrap() {
    this._log('Setting up Bootstrap')

    const bootstrap = await this.runOn('bootstrap', this._bootstrapOpts, async (opts) => {
      const DHT = require('hyperdht')
      const node = DHT.bootstrapper(opts.port, '127.0.0.1')

      await node.fullyBootstrapped().then(function () {
        const mn = require('mininet/host')
        console.log('Bootstrapper running on port ' + node.address().port)

        mn.send('listening')
      })
    })

    return new Promise((res) => {
      bootstrap.once('message:listening', async () => {
        this._log('Bootstrap ready')
        res()
      })
    })
  }

  async run(cb, opts = {}) {
    const procs = []

    const fullOpts = {
      ...opts,
      bootstrap: [{ host: this._hosts.get('bootstrap').ip, port: this._bootstrapOpts.port }]
    }

    const hosts = [...this._hosts.keys()].filter((key) => key !== 'bootstrap')
    const options = hosts.map((key) => ({ ...fullOpts, key }))
    const sources = await this._saveCallbacks(options, cb)

    for (let i = 0; i < options.length; i++) {
      const sourcePath = sources[i]
      const proc = this.runOn(hosts[i], sourcePath)
      procs.push(proc)
    }

    return Promise.all(procs)
  }

  async runOn(hostOrKey, cb, opts = {}) {
    const host = typeof hostOrKey === 'string' ? this._hosts.get(hostOrKey) : hostOrKey

    let sourcePath = ''
    if (typeof cb === 'string') {
      sourcePath = cb
    } else {
      sourcePath = await this._saveCallbacks([opts], cb)[0]
    }

    console.log('spawning', hostOrKey, sourcePath)
    const proc = host.spawn('node ' + sourcePath, { stdio: 'inherit' })

    return new Promise((res, rej) => {
      proc.once('spawn', () => res(proc))
      proc.once('error', rej)
    })
  }

  async _saveCallbacks(optsArray, cb) {
    const dir = await tmp(undefined, { dir: 'tmp' })
    this._tmpDirs.push(dir)

    const sourcePaths = []
    for (let i = 0; i < optsArray.length; i++) {
      const opts = optsArray[i]
      const sourcePath = path.join(dir, i + '.js')
      const source = `(${cb.toString()})(${JSON.stringify(opts)})`
      await fs.writeFile(sourcePath, source)

      sourcePaths.push(sourcePath)
    }

    return sourcePaths
  }
}

module.exports = MininetSwarm
