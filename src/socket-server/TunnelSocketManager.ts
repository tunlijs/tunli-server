import type {Server, Socket} from "socket.io";
import {config} from "#lib/Config";
import {socketLogger} from '#bootstrap'
import {tunnelSocketRegistry} from "#lib/TunnelSocketRegistry";
import jwt from "jsonwebtoken";

export const attachTunnelSocketManager = (io: Server): void => {
  io.use(authMiddleware)
  io.on('connection', onConnection)
}

const authMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const host = socket.handshake.headers['x-tunnel-id'] as string

  if (!host) {
    return next(new Error('Missing x-tunnel-id header'))
  }

  if (tunnelSocketRegistry.has(host)) {
    return next(Object.assign(
      new Error(`${host} has an existing connection`),
      {data: {connection_exists: true}}
    ))
  }

  if (!socket.handshake.auth?.token) {
    return next(new Error('Authentication error'))
  }

  jwt.verify(socket.handshake.auth.token, config.auth.jwtSignatureSecret, (err: Error | null) => {
    next(err ? new Error('Authentication error') : undefined)
  })
}

const onConnection = (socket: Socket): void => {
  const host = socket.handshake.headers['x-tunnel-id'] as string

  tunnelSocketRegistry.set(host, socket)
  socketLogger.info(`connected ${host}`)

  socket.on('ping', (cb) => cb())
  socket.once('disconnect', (reason) => {
    socketLogger.info(`disconnected ${host}: ${reason}`)
    tunnelSocketRegistry.remove(host)
  })
}
