import type {Socket} from "socket.io"

class TunnelSocketRegistry {

  readonly #sockets = new Map<string, Socket>()

  set(tunnelId: string, socket: Socket): void {
    this.#sockets.set(tunnelId, socket)
  }

  has(tunnelId: string): boolean {
    return this.#sockets.has(tunnelId)
  }

  remove(tunnelId: string): void {
    this.#sockets.delete(tunnelId)
  }

  resolve(tunnelId: string): Socket | null {
    return this.#sockets.get(tunnelId) ?? null
  }
}

export const tunnelSocketRegistry = new TunnelSocketRegistry()
