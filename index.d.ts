declare module '@holepunchto/mininetswarm' {
  import { EventEmitter } from 'events'

  interface LinkOptions {
    /** Bandwidth in Mbit/s */
    bandwidth?: number
    /** Latency (e.g., '100ms') */
    delay?: string
    /** Packet loss percentage (0-100) */
    loss?: number
    /** Use HTB qdisc */
    htb?: boolean
  }

  interface NetworkOptions {
    /** Number of hosts to create. Default: 10 */
    hosts?: number
    /** Link configuration for host connections */
    link?: LinkOptions
  }

  interface BootstrapOptions {
    /** Port for the DHT bootstrapper. Default: 49737 */
    port?: number
  }

  interface MininetOptions {
    /** Clean up existing Mininet state on start */
    clean?: boolean
    [key: string]: unknown
  }

  interface Options {
    /** Enable debug logging */
    debug?: boolean
    /** Options passed to the underlying Mininet instance */
    mininet?: MininetOptions
    /** Network configuration */
    network?: NetworkOptions
    /** Bootstrap node configuration */
    bootstrap?: BootstrapOptions
  }

  interface Host {
    /** IP address of the host */
    ip: string
    /** Link the host to a switch */
    link(sw: unknown, opts?: LinkOptions): void
    /** Spawn a process on this host */
    spawn(command: string, opts?: { stdio?: 'inherit' | 'pipe' }): HostProcess
  }

  interface HostProcess extends EventEmitter {
    on(event: 'spawn', listener: () => void): this
    on(event: 'error', listener: (err: Error) => void): this
    on(event: 'exit', listener: (code: number | null, signal: string | null) => void): this
    on(event: `message:${string}`, listener: (data?: unknown) => void): this
    once(event: 'spawn', listener: () => void): this
    once(event: 'error', listener: (err: Error) => void): this
    once(event: 'exit', listener: (code: number | null, signal: string | null) => void): this
    once(event: `message:${string}`, listener: (data?: unknown) => void): this
  }

  interface BootstrapNode {
    host: string
    port: number
  }

  interface CallbackContext<T = unknown> {
    /** Custom data passed when invoking the task */
    data: T
    /** Array of bootstrap nodes for HyperDHT/Hyperswarm */
    bootstrap: BootstrapNode[]
    /** IPC controller from mininet/host */
    controller: HostController
  }

  interface HostController extends EventEmitter {
    /** Send a message to the parent process */
    send(event: string, data?: unknown): void
    on(event: 'data', listener: (data: unknown) => void): this
  }

  type TaskCallback<T = unknown> = (ctx: CallbackContext<T>) => void | Promise<void>

  type TaskRunner<T = unknown> = (host: Host, data: T) => Promise<HostProcess>

  declare class Hypermininet {
    constructor(opts?: Hypermininet.Options)

    /** Array of available hosts (excluding the bootstrap host) */
    readonly hosts: Hypermininet.Host[]

    /**
     * Initialize the swarm
     * Creates the virtual network with the configured number of hosts
     */
    ready(): Promise<void>

    /**
     * Register a function to run on hosts
     * @param callback Function that will be serialized and run on the host
     * @returns Async function that spawns the callback on a specific host
     */
    add<T = unknown>(callback: Hypermininet.TaskCallback<T>): Hypermininet.TaskRunner<T>

    /**
     * Start the DHT bootstrapper and execute the callback
     * @param callback Function to execute once bootstrap is ready
     */
    boot<T>(callback: () => T | Promise<T>): Promise<T>

    /**
     * Stop all processes and clean up the virtual network
     */
    close(): Promise<void>
  }

  export = Hypermininet
}
