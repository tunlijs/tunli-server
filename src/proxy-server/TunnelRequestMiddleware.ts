import type {RequestHandler} from "express";
import type {SocketServerConfig} from "#types/types";
import http from "http";
import {scoped} from "#scoped/scoped";

type TunnelRequestMiddleware = (config: SocketServerConfig) => RequestHandler

export const createTunnelRequestMiddleware: TunnelRequestMiddleware = (config) => (req, res) => {
  const forwardReq = http.request({
    host: config.host,
    port: config.port,
    method: req.method,
    path: '/_internal/forward',
    headers: {
      ...req.headers,
      'x-tunnel-id': scoped(req).tunnelId,
      'x-tunnel-url': scoped(req).url,
    },
  }, (forwardRes) => {
    res.writeHead(forwardRes.statusCode!, forwardRes.statusMessage, forwardRes.headers)
    forwardRes.pipe(res)
  })

  forwardReq.on('error', () => res.status(502).end('Tunnel unavailable'))
  req.pipe(forwardReq)
}
