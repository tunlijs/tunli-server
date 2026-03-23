import net from 'net'
import type {IncomingMessage} from 'http'
import {createSocketHttpHeader} from '#utils/httpFunctions'
import type {Duplex} from "stream";
import type {TunnelExtractResult} from "#proxy-server/utils";
import type {ServerConfig, UpgradeHandler} from "#types/types";

type TunnelIdExtractor = (req: IncomingMessage) => TunnelExtractResult

export const createTunnelUpgradeMiddleware = (tunnelIdSource: TunnelIdExtractor, config: ServerConfig): UpgradeHandler => {

  return (req: IncomingMessage, socket: Duplex, head: Buffer) => {

    const result = tunnelIdSource(req)
    const tunnelId = result.tunnelId
    const tunnelPath = result.url

    if (!tunnelId) {
      socket.end()
      return
    }

    const proxySocket = net.connect(config.port, config.host)

    proxySocket.once('connect', () => {
      proxySocket.write(
        createSocketHttpHeader(
          `${req.method} /_internal/ws-forward HTTP/${req.httpVersion}`,
          {...req.headers, 'x-tunnel-id': tunnelId, 'x-tunnel-url': tunnelPath} as Record<string, string | string[]>
        )
      )
      if (head?.length) proxySocket.write(new Uint8Array(head))
      socket.pipe(proxySocket)
      proxySocket.pipe(socket)
    })

    proxySocket.on('error', () => socket.end())
    proxySocket.on('close', () => socket.end())
    socket.on('error', () => proxySocket.end())
    socket.on('close', () => proxySocket.end())
  }
}
