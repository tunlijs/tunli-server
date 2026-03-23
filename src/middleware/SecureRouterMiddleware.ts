import jwt from "jsonwebtoken";
import {config} from "#lib/Config";
import {scoped} from "#scoped/scoped";
import type {RequestHandler} from "express";

export const secureRouter = () => {
  const tokenMiddleware: RequestHandler = (req, _res, next) => {

    const token = req.get('authorization')?.split(' ')[1]

    if (!token) {
      next()
      return
    }

    jwt.verify(token, config.auth.jwtSignatureSecret, (err: Error | null, decoded: unknown) => {
      if (!err) {
        scoped(req).authToken = token
        scoped(req).authTokenDecoded = decoded
      }
      next()
    })
  }

  const securedMiddleware: RequestHandler = (req, res, next) => {
    if (scoped(req).authToken) {
      return next()
    }
    res.status(401).end()
  }

  return {
    tokenMiddleware,
    securedMiddleware
  }
}
