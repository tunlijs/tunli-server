import type {Socket} from "socket.io";
import {sha256} from "#utils/hashFunctions";

/**
 * Tracks which auth token each connected socket uses, to count distinct users.
 * Only token hashes are kept.
 */
class ConnectedUsers {
  readonly #bySocket = new Map<string, string>()

  track(socket: Socket): void {
    const token = socket.handshake.auth?.token
    if (typeof token !== 'string') return
    this.#bySocket.set(socket.id, sha256(token))
    socket.once('disconnect', () => this.#bySocket.delete(socket.id))
  }

  get count(): number {
    return new Set(this.#bySocket.values()).size
  }
}

export const connectedUsers = new ConnectedUsers()
