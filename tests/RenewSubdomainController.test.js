import {test} from 'node:test'
import assert from 'node:assert/strict'
import {InMemoryStorage} from '../dist/lib/InMemoryStorage.js'
import {renewSubdomainController, createSubdomainController} from '../dist/controller-api/RenewSubdomainController.js'
import {scoped} from '../dist/scoped/scoped.js'
import {generateTunnelId} from '../dist/utils/tunnelId.js'
import {registerSubdomain} from '../dist/lib/RegisteredSubdomains.js'

const VALID_SHA256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

const mockRes = () => {
  const res = {body: null}
  res.json = (data) => { res.body = data; return res }
  return res
}

const mockReq = (params = {}, body = {}) => {
  const req = {params, body}
  return req
}

// renewSubdomainController

test('renewSubdomainController rejects invalid subdomain', async () => {
  const s = new InMemoryStorage()
  const handler = renewSubdomainController(s)
  const req = mockReq({subdomain: 'invalid!'})
  const res = mockRes()
  await handler(req, res, () => {})
  assert.equal(res.body.success, false)
})

test('renewSubdomainController registers new subdomain', async () => {
  const s = new InMemoryStorage()
  const handler = renewSubdomainController(s)
  const subdomain = generateTunnelId()
  const req = mockReq({subdomain}, {})
  scoped(req).authToken = 'mytoken'
  const res = mockRes()
  await handler(req, res, () => {})
  assert.equal(res.body.success, true)
})

test('renewSubdomainController rejects wrong token', async () => {
  const s = new InMemoryStorage()
  const subdomain = generateTunnelId()
  await registerSubdomain(s, subdomain, 'owner-token')
  const handler = renewSubdomainController(s)
  const req = mockReq({subdomain}, {})
  scoped(req).authToken = 'other-token'
  const res = mockRes()
  await handler(req, res, () => {})
  assert.equal(res.body.success, false)
})

test('renewSubdomainController allows same token to renew', async () => {
  const s = new InMemoryStorage()
  const subdomain = generateTunnelId()
  await registerSubdomain(s, subdomain, 'mytoken')
  const handler = renewSubdomainController(s)
  const req = mockReq({subdomain}, {})
  scoped(req).authToken = 'mytoken'
  const res = mockRes()
  await handler(req, res, () => {})
  assert.equal(res.body.success, true)
})

test('renewSubdomainController ignores invalid targetHash', async () => {
  const s = new InMemoryStorage()
  const handler = renewSubdomainController(s)
  const subdomain = generateTunnelId()
  const req = mockReq({subdomain}, {targetHash: 'not-a-hash'})
  scoped(req).authToken = 'mytoken'
  const res = mockRes()
  await handler(req, res, () => {})
  assert.equal(res.body.success, true)
})

// createSubdomainController

test('createSubdomainController returns proxyURL and proxyIdent', async () => {
  const s = new InMemoryStorage()
  const config = {port: 8082, host: '0.0.0.0', urlTemplate: 'https://{{id}}.example.com'}
  const handler = createSubdomainController(config, s)
  const req = mockReq({}, {})
  scoped(req).authToken = 'mytoken'
  const res = mockRes()
  await handler(req, res, () => {})
  assert.ok(res.body.proxyIdent)
  assert.ok(res.body.proxyURL.includes(res.body.proxyIdent))
})

test('createSubdomainController reuses existing subdomain by profileHash', async () => {
  const s = new InMemoryStorage()
  const config = {port: 8082, host: '0.0.0.0', urlTemplate: 'https://{{id}}.example.com'}
  const handler = createSubdomainController(config, s)

  const req1 = mockReq({}, {profileHash: VALID_SHA256})
  scoped(req1).authToken = 'mytoken'
  const res1 = mockRes()
  await handler(req1, res1, () => {})

  const req2 = mockReq({}, {profileHash: VALID_SHA256})
  scoped(req2).authToken = 'mytoken'
  const res2 = mockRes()
  await handler(req2, res2, () => {})

  assert.equal(res1.body.proxyIdent, res2.body.proxyIdent)
})

test('createSubdomainController different tokens get different subdomains for same profileHash', async () => {
  const s = new InMemoryStorage()
  const config = {port: 8082, host: '0.0.0.0', urlTemplate: 'https://{{id}}.example.com'}
  const handler = createSubdomainController(config, s)

  const req1 = mockReq({}, {profileHash: VALID_SHA256})
  scoped(req1).authToken = 'tokenA'
  const res1 = mockRes()
  await handler(req1, res1, () => {})

  const req2 = mockReq({}, {profileHash: VALID_SHA256})
  scoped(req2).authToken = 'tokenB'
  const res2 = mockRes()
  await handler(req2, res2, () => {})

  assert.notEqual(res1.body.proxyIdent, res2.body.proxyIdent)
})
