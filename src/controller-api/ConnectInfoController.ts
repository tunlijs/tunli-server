import type {RequestHandler} from "express";
import {config} from "#lib/Config";
import {SERVER_VERSION} from "#lib/defs";

export const connectInfoController = (): RequestHandler => (_req, res) => {
  const {publicUrl, capturePath, connectionPoolSize = 8} = config.socketServer
  res.json({
    socketUrl: publicUrl,
    capturePath,
    connectionPoolSize,
    serverVersion: SERVER_VERSION,
    minClientVersion: config.auth.minClientVersion ?? null,
  })
}
