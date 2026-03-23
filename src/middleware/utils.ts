import type {RequestHandler} from "express";

export const dropConnections =
  (): RequestHandler =>
    (_req, res) => {
      res.status(444).end()
    }
