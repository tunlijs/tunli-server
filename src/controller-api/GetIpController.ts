import type {RequestHandler} from "express";

export const getIpController = (): RequestHandler => (req, res) => {
  res.json({
    ip: req.ip
  })
}
