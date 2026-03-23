import {Writable} from "stream";
import type {Socket} from "socket.io";
import {TunnelResponse} from "#http/TunnelResponse";
import {randomUUID} from "crypto";

class TunnelRequest extends Writable {

  readonly #socket: Socket
  readonly #requestId: string
  readonly #res: TunnelResponse

  constructor({socket, requestId, request}: { socket: Socket, requestId: string, request: object }) {
    super()
    this.#socket = socket
    this.#requestId = requestId
    this.#socket.emit('request', requestId, request)
    this.#res = new TunnelResponse({socket, responseId: requestId})
  }

  get res(): TunnelResponse {
    return this.#res
  }

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void): void {
    this.#socket.emit('request-pipe', this.#requestId, chunk)
    this.#socket.conn.once('drain', callback)
  }

  _writev(chunks: Array<{ chunk: Buffer }>, callback: () => void): void {
    this.#socket.emit('request-pipes', this.#requestId, chunks)
    this.#socket.conn.once('drain', callback)
  }

  _final(callback: () => void): void {
    this.#socket.emit('request-pipe-end', this.#requestId)
    this.#socket.conn.once('drain', callback)
  }

  _destroy(e: Error | null, callback: (err?: Error | null) => void): void {
    if (e) {
      this.#socket.emit('request-pipe-error', this.#requestId, e.message)
      this.#socket.conn.once('drain', () => callback())
      return
    }
    callback()
  }
}

export const createTunnelRequest = (
  socket: Socket,
  meta: { method: string, headers: object, path: string }
): TunnelRequest => new TunnelRequest({socket, requestId: randomUUID(), request: meta})
