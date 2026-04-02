import type {Socket} from "socket.io"
import {IPv4Network} from "@pfeiferio/ipv4";

export interface PickStrategy {
  pick(sockets: Socket[]): Socket | null
}

export class RoundRobinStrategy implements PickStrategy {
  #index = 0

  pick(sockets: Socket[]): Socket | null {
    if (sockets.length === 0) return null
    const socket = sockets[this.#index % sockets.length]!
    this.#index++
    return socket
  }
}

class SocketPool {
  readonly #sockets: Socket[] = []
  readonly #strategy: PickStrategy

  constructor(strategy: PickStrategy) {
    this.#strategy = strategy
  }

  add(socket: Socket): void {
    this.#sockets.push(socket)
  }

  remove(socket: Socket): void {
    const i = this.#sockets.indexOf(socket)
    if (i !== -1) this.#sockets.splice(i, 1)
  }

  pick(): Socket | null {
    return this.#strategy.pick(this.#sockets)
  }

  get size(): number {
    return this.#sockets.length
  }
}

export type CidrRules = { allowCidr: IPv4Network[]; denyCidr: IPv4Network[] }

class TunnelSocketRegistry {
  readonly #pools = new Map<string, SocketPool>()
  readonly #cidrRules = new Map<string, CidrRules>()

  add(tunnelId: string, socket: Socket): void {
    if (!this.#pools.has(tunnelId)) {
      this.#pools.set(tunnelId, new SocketPool(new RoundRobinStrategy()))
    }
    this.#pools.get(tunnelId)!.add(socket)
  }

  remove(tunnelId: string, socket: Socket): void {
    const pool = this.#pools.get(tunnelId)
    if (!pool) return
    pool.remove(socket)
    if (pool.size === 0) {
      this.#pools.delete(tunnelId)
      this.#cidrRules.delete(tunnelId)
    }
  }

  has(tunnelId: string): boolean {
    const pool = this.#pools.get(tunnelId)
    return !!pool && pool.size > 0
  }

  resolve(tunnelId: string): Socket | null {
    return this.#pools.get(tunnelId)?.pick() ?? null
  }

  poolSize(tunnelId: string): number {
    return this.#pools.get(tunnelId)?.size ?? 0
  }

  setCidrRules(tunnelId: string, rules: CidrRules): void {
    this.#cidrRules.set(tunnelId, rules)
  }

  getCidrRules(tunnelId: string): CidrRules | undefined {
    return this.#cidrRules.get(tunnelId)
  }
}

export const tunnelSocketRegistry = new TunnelSocketRegistry()
