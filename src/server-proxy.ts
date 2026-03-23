import {proxyLogger} from './bootstrap.js'
import {config} from "#lib/Config";
import {parseTunnelIdSource} from "#proxy-server/utils";
import {createApp} from "#express-app/expressApp";
import {createTunnelRequestMiddleware} from "#proxy-server/TunnelRequestMiddleware";
import {resolveTunnelIdMiddleware} from "#proxy-server/resolveTunnelIdMiddleware";
import {createTunnelUpgradeMiddleware} from "#proxy-server/TunnelUpgradeMiddleware";
import {dropConnections} from "#middleware/utils";

const tunnelIdSource = parseTunnelIdSource(config.proxyServer.urlTemplate)

const app = createApp();

app.use(resolveTunnelIdMiddleware(tunnelIdSource))
app.use(createTunnelRequestMiddleware(config.socketServer))
app.use(dropConnections())

const httpServer = app.listen(config.proxyServer.port, config.proxyServer.host, () => {
  proxyLogger.info(`Listening on http://${config.proxyServer.host}:${config.proxyServer.port}`)
})

httpServer.on('upgrade', createTunnelUpgradeMiddleware(tunnelIdSource, config.socketServer))

process.send?.('ready')
