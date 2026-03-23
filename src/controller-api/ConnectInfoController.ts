import type {RequestHandler} from "express";
import {config} from "#lib/Config";

export const connectInfoController = (): RequestHandler => (_req, res) => {
  const {publicUrl, capturePath, connectionPoolSize = 8} = config.socketServer
  res.json({
    socketUrl: publicUrl,
    capturePath,
    connectionPoolSize,
  })
}
