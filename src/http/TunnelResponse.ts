import {Duplex} from "stream"
import type {Socket} from "socket.io"

export class TunnelResponse extends Duplex {

  readonly #socket: Socket
  readonly #responseId: string

  constructor({socket, responseId}: {socket: Socket, responseId: string}) {
    super()
    this.#socket = socket
    this.#responseId = responseId

    const onResponse = (responseId: string, data: any) => {
      if (this.#responseId !== responseId) return
      this.#socket.off('response', onResponse)
      this.#socket.off('request-error', onRequestError)  // pipe listeners stay until end/error
      this.emit('response', {
        statusCode: data.statusCode,
        statusMessage: data.statusMessage,
        headers: data.headers,
        httpVersion: data.httpVersion,
      })
    }

    const onResponsePipe = (responseId: string, data: Buffer) => {
      if (this.#responseId !== responseId) return
      this.push(data)
    }

    const onResponsePipes = (responseId: string, data: Buffer[]) => {
      if (this.#responseId !== responseId) return
      data.forEach((chunk) => this.push(chunk))
    }

    const cleanup = () => {
      this.#socket.off('response', onResponse)
      this.#socket.off('response-pipe', onResponsePipe)
      this.#socket.off('response-pipes', onResponsePipes)
      this.#socket.off('response-pipe-error', onResponsePipeError)
      this.#socket.off('response-pipe-end', onResponsePipeEnd)
      this.#socket.off('request-error', onRequestError)
    }

    const onResponsePipeError = (responseId: string, error: string) => {
      if (this.#responseId !== responseId) return
      cleanup()
      this.destroy(new Error(error))
    }

    const onResponsePipeEnd = (responseId: string, data?: Buffer) => {
      if (this.#responseId !== responseId) return
      if (data) this.push(data)
      cleanup()
      this.push(null)
    }

    const onRequestError = (requestId: string, error: string) => {
      if (this.#responseId !== requestId) return
      cleanup()
      this.emit('requestError', error)
    }

    this.#socket.on('response', onResponse)
    this.#socket.on('response-pipe', onResponsePipe)
    this.#socket.on('response-pipes', onResponsePipes)
    this.#socket.on('response-pipe-error', onResponsePipeError)
    this.#socket.on('response-pipe-end', onResponsePipeEnd)
    this.#socket.on('request-error', onRequestError)

    this.once('close', cleanup)
  }

  _read(_size: number): void {}

  _write(chunk: Buffer, _encoding: BufferEncoding, callback: () => void): void {
    this.#socket.emit('response-pipe', this.#responseId, chunk)
    this.#socket.conn.once('drain', callback)
  }

  _writev(chunks: Array<{chunk: Buffer}>, callback: () => void): void {
    this.#socket.emit('response-pipes', this.#responseId, chunks)
    this.#socket.conn.once('drain', callback)
  }

  _final(callback: () => void): void {
    this.#socket.emit('response-pipe-end', this.#responseId)
    this.#socket.conn.once('drain', callback)
  }

  _destroy(error: Error | null, callback: (err?: Error | null) => void): void {
    if (!error) {
      callback()
      return
    }
    this.#socket.emit('response-pipe-error', this.#responseId, error.message)
    this.#socket.conn.once('drain', () => callback())
  }
}
