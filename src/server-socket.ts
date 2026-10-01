import {socketLogger} from './bootstrap.js'
import http from 'http'
import express from 'express'
import {Server} from 'socket.io'
import {config} from '#lib/Config'
import {attachTunnelSocketManager} from '#socket-server/TunnelSocketManager'
import {attachShareNamespace} from '#socket-server/ShareNamespace'
import {tunnelForwardRouter} from '#socket-server/TunnelForwardRouter'
import {createTunnelUpgradeMiddleware} from '#socket-server/TunnelUpgradeMiddleware'
import {exposeStats, getCounters, requestRate} from '#stats/metrics'
import {tunnelSocketRegistry} from '#lib/TunnelSocketRegistry'
import {connectedUsers} from '#stats/ConnectedUsers'
import {shareStats} from '#socket-server/ShareNamespace'

const app = express()
app.use(tunnelForwardRouter)

const httpServer = http.createServer(app)
const io = new Server(httpServer, {path: config.socketServer.capturePath})

attachTunnelSocketManager(io)
attachShareNamespace(io)
httpServer.on('upgrade', createTunnelUpgradeMiddleware())
httpServer.listen(config.socketServer.port, config.socketServer.host, () => {
  socketLogger.info(`Listening on http://${config.socketServer.host}:${config.socketServer.port}`)
})

exposeStats(() => ({
  ...getCounters(),
  users: connectedUsers.count,
  tunnels: tunnelSocketRegistry.tunnelCount,
  connections: tunnelSocketRegistry.connectionCount,
  ...shareStats(),
  requestsLastMinute: requestRate.count(),
}))

process.send?.('ready');
