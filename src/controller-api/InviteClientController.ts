import type {RequestHandler} from "express";
import {DEF_TIME_YEAR_IN_SECONDS} from "#lib/defs";
import {config} from "#lib/Config";
import jwt from "jsonwebtoken";
import {randomUUID} from "crypto";
import {sha256} from "#utils/hashFunctions";
import type {TokenStorage} from "#types/types";

export const inviteClientController = (storageInterface: TokenStorage): RequestHandler => async (_req, res) => {
  const jwtToken = jwt.sign({
    iat: Math.ceil(Date.now() / 1000),
    // without a unique claim, tokens issued within the same second would be identical
    jti: randomUUID(),
  }, config.auth.jwtSignatureSecret);

  await storageInterface.set(`token:${sha256(jwtToken)}`, true, DEF_TIME_YEAR_IN_SECONDS)

  res.json({
    data: {
      inviteToken: jwtToken
    }
  })
}
