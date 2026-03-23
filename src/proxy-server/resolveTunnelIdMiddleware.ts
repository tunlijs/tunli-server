import type {RequestHandler} from "express";
import {scoped} from "#scoped/scoped";
import type {IncomingMessage} from "http";
import type {TunnelExtractResult} from "#proxy-server/utils";
import {isTunnelId} from "#utils/tunnelId";

export const resolveTunnelIdMiddleware = (tunnelIdSource: (req: IncomingMessage) => TunnelExtractResult): RequestHandler =>
  (req, res, next) => {
    const result = tunnelIdSource(req)

    if (!result.tunnelId || !isTunnelId(result.tunnelId)) {
      res.status(400).end('Missing tunnel-id')
      return
    }

    scoped(req).tunnelId = result.tunnelId
    scoped(req).url = result.url
    next()
  }
