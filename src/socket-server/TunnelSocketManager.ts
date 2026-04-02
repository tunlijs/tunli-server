import type {Server, Socket} from "socket.io";
import {config} from "#lib/Config";
import {socketLogger} from '#bootstrap'
import {tunnelSocketRegistry} from "#lib/TunnelSocketRegistry";
import jwt from "jsonwebtoken";
import {normalizeCidrList} from "#utils/cidrFunctions";

export const attachTunnelSocketManager = (io: Server): void => {
  io.use(authMiddleware)
  io.on('connection', onConnection)
}

const authMiddleware = (socket: Socket, next: (err?: Error) => void): void => {
  const host = socket.handshake.headers['x-tunnel-id'] as string

  if (!host) {
    return next(new Error('Missing x-tunnel-id header'))
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

  tunnelSocketRegistry.add(host, socket)

  const auth = socket.handshake.auth as Record<string, unknown>

  const allowCidr = normalizeCidrList(auth.allowCidr)
  const denyCidr = normalizeCidrList(auth.denyCidr)

  tunnelSocketRegistry.setCidrRules(host, {allowCidr, denyCidr})

  socketLogger.info(`connected ${host} (pool: ${tunnelSocketRegistry.poolSize(host)})`)

  socket.on('ping', (cb) => cb())
  socket.once('disconnect', (reason) => {
    tunnelSocketRegistry.remove(host, socket)
    socketLogger.info(`disconnected ${host}: ${reason} (pool: ${tunnelSocketRegistry.poolSize(host)})`)
  })
}
