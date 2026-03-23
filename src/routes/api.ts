import {Router} from 'express';
import {userAgentMiddleware} from "#middleware/UserAgentMiddleware";
import {registerClientController} from "#controller-api/RegisterClientController";
import {createSubdomainController, renewSubdomainController} from "#controller-api/RenewSubdomainController";
import {secureRouter} from "#middleware/SecureRouterMiddleware";
import {inviteClientController} from "#controller-api/InviteClientController";
import type {TokenStorage} from "#types/types";
import {getIpController} from "#controller-api/GetIpController";
import {connectInfoController} from "#controller-api/ConnectInfoController";
import type {AppConfig} from "#types/types";

export const apiRouter = (config: AppConfig, storageInterface: TokenStorage) => {

  const router = Router()
  const {tokenMiddleware, securedMiddleware} = secureRouter()

  router.use(tokenMiddleware)

  router.get('/api/v2/ip', getIpController())
  router.get('/api/v2/register', userAgentMiddleware(), registerClientController(storageInterface))
  router.get('/api/v2/invite', userAgentMiddleware(), securedMiddleware, inviteClientController(storageInterface))
  router.post('/api/v2/renew-proxy/:subdomain', userAgentMiddleware(), renewSubdomainController(storageInterface))
  router.post('/api/v2/create-proxy', userAgentMiddleware(), securedMiddleware, createSubdomainController(config.proxyServer, storageInterface))
  router.get('/api/v2/connect-info', userAgentMiddleware(), securedMiddleware, connectInfoController())

  return router
}
