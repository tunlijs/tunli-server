import type {RequestHandler} from "express";
import {
  getRegisterTokenForSubdomain,
  getSubdomainByProfileHash,
  getSubdomainByTargetHash,
  linkSubdomainToProfileHash,
  linkSubdomainToTargetHash,
  registerSubdomain
} from "#lib/RegisteredSubdomains";
import {isSha256} from "#utils/validationFunctions";
import {generateTunnelId, isTunnelId} from "#utils/tunnelId";
import {scoped} from "#scoped/scoped";
import type {ProxyServerConfig, TokenStorage} from "#types/types";
import {interpolate} from "@pfeiferio/string-interpolate";

export const renewSubdomainController = (storageInterface: TokenStorage): RequestHandler => async (req, res) => {
  const subdomain = req.params.subdomain

  if (!isTunnelId(subdomain)) {
    return res.json({success: false})
  }

  const targetHash = isSha256(req.body.targetHash) ? req.body.targetHash.toLowerCase() : undefined
  const profileHash = isSha256(req.body.profileHash) ? req.body.profileHash.toLowerCase() : undefined

  const token = await getRegisterTokenForSubdomain(storageInterface, subdomain)

  if (token && token !== scoped(req).authToken) {
    return res.json({success: false})
  }

  await registerSubdomain(storageInterface, subdomain, scoped(req).authToken)
  if (targetHash) await linkSubdomainToTargetHash(storageInterface, scoped(req).authToken, targetHash, subdomain)
  if (profileHash) await linkSubdomainToProfileHash(storageInterface, scoped(req).authToken, profileHash, subdomain)

  return res.json({success: true})
}

export const createSubdomainController = (config: ProxyServerConfig, storageInterface: TokenStorage): RequestHandler => async (req, res) => {
  const targetHash = isSha256(req.body.targetHash) ? req.body.targetHash.toLowerCase() : undefined
  const profileHash = isSha256(req.body.profileHash) ? req.body.profileHash.toLowerCase() : undefined

  const subdomain = await (async (): Promise<string> => {
    if (profileHash) {
      const subdomain = await getSubdomainByProfileHash(storageInterface, scoped(req).authToken, profileHash)
      if (subdomain) return subdomain
    }

    if (targetHash) {
      const subdomain = await getSubdomainByTargetHash(storageInterface, scoped(req).authToken, targetHash)
      if (subdomain) return subdomain
    }

    return generateTunnelId()
  })();

  await registerSubdomain(storageInterface, subdomain, scoped(req).authToken)
  if (targetHash) await linkSubdomainToTargetHash(storageInterface, scoped(req).authToken, targetHash, subdomain)
  if (profileHash) await linkSubdomainToProfileHash(storageInterface, scoped(req).authToken, profileHash, subdomain)

  res.json({
    proxyURL: interpolate(config.urlTemplate, {id: subdomain}),
    proxyIdent: subdomain
  })
}
