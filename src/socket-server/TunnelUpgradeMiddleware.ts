import type {IncomingHttpHeaders} from 'http'
import {tunnelSocketRegistry} from '#lib/TunnelSocketRegistry'
import {createTunnelRequest} from '#http/TunnelRequest'
import {createSocketHttpHeader, getReqHeaders} from '#utils/httpFunctions'
import type {UpgradeHandler} from "#types/types";

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
