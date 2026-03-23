import type {RequestHandler} from "express";
import {config} from "#lib/Config";

export const connectInfoController = (): RequestHandler => (_req, res) => {
  const {publicUrl, capturePath} = config.socketServer
  res.json({
    socketUrl: publicUrl,
    capturePath,
  })
}
