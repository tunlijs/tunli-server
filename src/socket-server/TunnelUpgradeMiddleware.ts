import type {IncomingHttpHeaders} from 'http'
import {tunnelSocketRegistry} from '#lib/TunnelSocketRegistry'
import {createTunnelRequest} from '#http/TunnelRequest'
import {createSocketHttpHeader, getReqHeaders} from '#utils/httpFunctions'
import type {UpgradeHandler} from "#types/types";
import {ipV4} from "@pfeiferio/ipv4"

interface TunnelResponseMeta {
  statusCode: number
  statusMessage: string
  headers: IncomingHttpHeaders
}

export const createTunnelUpgradeMiddleware = (): UpgradeHandler => {
  return (req, socket, head) => {
    if (!req.url?.startsWith('/_internal/')) return

    const tunnelId = req.headers['x-tunnel-id'] as string
    if (!tunnelId) {
      socket.end('HTTP/1.1 400 Bad Request\r\n\r\n')
      return
    }

    const tunnelSocket = tunnelSocketRegistry.resolve(tunnelId)
    if (!tunnelSocket) {
      socket.end('HTTP/1.1 404 Not Found\r\n\r\n')
      return
    }

    const cidrRules = tunnelSocketRegistry.getCidrRules(tunnelId)
    if (cidrRules) {
      const rawIp = (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim()
        ?? req.socket.remoteAddress
        ?? ''

      let clientIp: ReturnType<typeof ipV4> | null = null
      try {
        clientIp = ipV4(rawIp)
      } catch { /* unparseable (e.g. IPv6) */
      }

      if (clientIp === null
        || cidrRules.denyCidr.some(net => net.contains(clientIp))
        || (cidrRules.allowCidr.length > 0 && !cidrRules.allowCidr.some(net => net.contains(clientIp)))) {
        tunnelSocket.emit('client-blocked', rawIp ?? 'unknown')
        socket.end('HTTP/1.1 403 Forbidden\r\n\r\n')
        return
      }
    }

    const tunnelRequest = createTunnelRequest(tunnelSocket, {
      method: req.method!,
      headers: getReqHeaders(req),
      path: req.headers['x-tunnel-url'] as string ?? '/',
    })
    const tunnelResponse = tunnelRequest.res

    if (head?.length) tunnelRequest.write(head)
    socket.pipe(tunnelRequest)

    const onRequestError = () => {
      tunnelResponse.off('response', onResponse)
      socket.end()
    }

    const onResponse = ({statusCode, statusMessage, headers}: TunnelResponseMeta) => {
      tunnelRequest.off('requestError', onRequestError)
      socket.write(
        createSocketHttpHeader(
          `HTTP/1.1 ${statusCode} ${statusMessage}`,
          headers as Record<string, string | string[]>
        )
      )
      tunnelResponse.pipe(socket)
    }

    tunnelResponse.once('requestError', onRequestError)
    tunnelResponse.once('response', onResponse)

    const onDisconnect = () => socket.end()
    const onSocketClose = () => {
      tunnelSocket.off('disconnect', onDisconnect)
      tunnelResponse.destroy()
    }

    tunnelSocket.once('disconnect', onDisconnect)
    socket.once('close', onSocketClose)
  }
}
