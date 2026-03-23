import type {RequestHandler} from "express";

/**
 * @returns {Express.RequestHandler}
 */
export const userAgentMiddleware = (): RequestHandler => {

  return (req, res, next) => {
    if (req.headers['user-agent'] !== 'tunli/1.0') {
      res.status(401).end()
      return
    }
    next()
  }
}
