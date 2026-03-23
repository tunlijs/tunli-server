import type {IncomingHttpHeaders} from "http";
import {Router} from "express";
import {tunnelSocketRegistry} from "#lib/TunnelSocketRegistry";
import {createTunnelRequest} from "#http/TunnelRequest";
import {
  extractProtocolFromRequest,
  getReqHeaders,
  rewriteAccessControlAllowOrigin,
  rewriteLocation,
  rewriteSetCookieDomain
} from "#utils/httpFunctions";

interface TunnelResponseMeta {
  statusCode: number
  statusMessage: string
  headers: IncomingHttpHeaders
}

const router = Router()

router.all('/_internal/forward', (req, res) => {
  const tunnelId = req.headers['x-tunnel-id'] as string
  if (!tunnelId) {
    res.status(400).end('Missing x-tunnel-id')
    return
  }

  const tunnelSocket = tunnelSocketRegistry.resolve(tunnelId)

  if (!tunnelSocket) {
    res.status(404).end('No tunnel available')
    return
  }

  const tunnelRequest = createTunnelRequest(tunnelSocket, {
    method: req.method,
    headers: getReqHeaders(req),
    path: req.headers['x-tunnel-url'] as string ?? req.url,
  })
  const tunnelResponse = tunnelRequest.res

  req.pipe(tunnelRequest)

  const onReqError = (e: Error) => tunnelRequest.destroy(e)
  req.once('aborted', onReqError)
  req.once('error', onReqError)
  req.once('finish', () => {
    req.off('aborted', onReqError)
    req.off('error', onReqError)
  })

  const onRequestError = () => {
    tunnelResponse.off('response', onResponse)
    tunnelResponse.destroy()
    res.status(502).end('Request error')
  }
  const onResponse = ({statusCode, statusMessage, headers}: TunnelResponseMeta) => {
    tunnelRequest.off('requestError', onRequestError)
    const host = req.headers.host ?? ''
    const proto = extractProtocolFromRequest(req)
    // tbd Content-Security-Policy
    rewriteSetCookieDomain(headers, host)
    rewriteLocation(headers, host, proto)
    rewriteAccessControlAllowOrigin(headers, host, proto)
    if (statusCode === 301) {
      headers['x-tunli-original-status'] = '301'
      statusCode = 302
    }
    res.writeHead(statusCode, statusMessage, headers)
  }

  tunnelResponse.once('requestError', onRequestError)
  tunnelResponse.once('response', onResponse)
  tunnelResponse.pipe(res)

  const onSocketError = () => {
    res.off('close', onResClose)
    if (!res.writableEnded) res.status(500).end('Tunnel disconnected')
  }
  const onResClose = () => tunnelSocket.off('disconnect', onSocketError)

  tunnelSocket.once('disconnect', onSocketError)
  res.once('close', onResClose)
})

export {router as tunnelForwardRouter}
