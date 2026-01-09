declare module '@holepunchto/hypermininet' {
  import { EventEmitter } from 'events'

  interface LinkOptions {
    /** Bandwidth in Mbit/s */
    bandwidth?: number
    /** Latency (e.g., '100ms') */
    delay?: string
    /** Packet loss percentage (0-100) */
    loss?: number
    /** Jitter (e.g., '10ms') */
    jitter?: string
    /** Use HTB qdisc */
    htb?: boolean
  }

  interface NetworkOptions {
    /** Number of hosts to create, or array of per-host link options. Default: 10 */
    hosts?: number | LinkOptions[]
    /** Default link configuration for host connections */
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
    /** Unique identifier for this task */
    id: string
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

  class Hypermininet {
    constructor(opts?: Options)

    /** Array of available hosts (excluding the bootstrap host) */
    readonly hosts: Host[]

    /** Bootstrap nodes for HyperDHT/Hyperswarm connections */
    readonly bootstrap: BootstrapNode[]

    /**
     * Initialize the Hypermininet
     * Creates the virtual network with the configured number of hosts
     */
    ready(): Promise<void>

    /**
     * Register a function to run on hosts
     * @param callback Function that will be serialized and run on the host
     * @returns Async function that spawns the callback on a specific host
     */
    add<T = unknown>(callback: TaskCallback<T>): TaskRunner<T>

    /**
     * Start the DHT bootstrapper and execute the callback
     * When called from the main process, initializes the network and runs the callback.
     * When called from a worker process, sets up the worker and returns true.
     * @param callback Function to execute once bootstrap is ready
     * @returns Result of callback in main process, or true in worker process
     */
    boot<T>(callback: () => T | Promise<T>): Promise<T> | true

    /**
     * Stop all processes and clean up the virtual network
     */
    close(): Promise<void>

    /**
     * Check if this is the main process or a worker spawned by Hypermininet
     * @returns true if main process, false if worker
     */
    static isMain(): boolean

    // Network presets - simulated network conditions

    /** Extremely poor connection: 100 Kbps, 500ms delay, 40% loss */
    static readonly NetworkPotato: LinkOptions

    /** Phone with dying battery: 50 Kbps, 800ms delay, 50% loss */
    static readonly NetworkDyingBattery: LinkOptions

    /** Underwater/extreme latency: 250 Kbps, 2000ms delay, 30% loss */
    static readonly NetworkUnderwater: LinkOptions

    /** Mars rover simulation: 500 Kbps, 10000ms delay, 10% loss */
    static readonly NetworkMarsRover: LinkOptions

    /** Parking garage/weak signal: 500 Kbps, 300ms delay, 25% loss */
    static readonly NetworkParkingGarage: LinkOptions

    /** Coffee shop WiFi: 10 Mbps, 30ms delay, 2% loss */
    static readonly NetworkCoffeeShop: LinkOptions

    /** Subway/metro: 250 Kbps, 500ms delay, 35% loss */
    static readonly NetworkSubway: LinkOptions

    /** Airplane WiFi: 2 Mbps, 600ms delay, 5% loss */
    static readonly NetworkAirplane: LinkOptions

    /** Rural 3G: 1 Mbps, 150ms delay, 8% loss */
    static readonly Network3GRural: LinkOptions

    /** Overloaded WiFi: 5 Mbps, 50ms delay, 10% loss, high jitter */
    static readonly NetworkOverloadedWifi: LinkOptions

    /** Decent connection with some issues: 10 Mbps, 100ms delay, 10% loss */
    static readonly NetworkOK: LinkOptions

    /** Local network: 1000 Mbps, no delay, no loss */
    static readonly NetworkLAN: LinkOptions
  }

  export = Hypermininet
}
