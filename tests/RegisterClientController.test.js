import {test, before} from 'node:test'
import assert from 'node:assert/strict'
import {InMemoryStorage} from '../dist/lib/InMemoryStorage.js'
import * as Config from '../dist/lib/Config.js'
import {registerClientController} from '../dist/controller-api/RegisterClientController.js'
import {sha256} from '../dist/utils/hashFunctions.js'

before(() => {
  Config.config.auth = {jwtSignatureSecret: 'test-secret'}
})

const mockRes = () => {
  const res = {body: null}
  res.json = (data) => { res.body = data; return res }
  return res
}

test('registerClientController returns authToken', async () => {
  const s = new InMemoryStorage()
  const handler = registerClientController(s)
  const res = mockRes()
  await handler({}, res, () => {})
  assert.ok(res.body.authToken)
  assert.equal(typeof res.body.authToken, 'string')
})

test('registerClientController stores token hash in storage', async () => {
  const s = new InMemoryStorage()
  const handler = registerClientController(s)
  const res = mockRes()
  await handler({}, res, () => {})
  const hash = sha256(res.body.authToken)
  assert.equal(await s.get(`token:${hash}`), true)
})

test('registerClientController stores each token independently', async () => {
  const s = new InMemoryStorage()
  const handler = registerClientController(s)
  const res1 = mockRes()
  const res2 = mockRes()
  await handler({}, res1, () => {})
  await new Promise(r => setTimeout(r, 1100)) // iat is in seconds
  await handler({}, res2, () => {})
  assert.notEqual(res1.body.authToken, res2.body.authToken)
  assert.equal(await s.get(`token:${sha256(res1.body.authToken)}`), true)
  assert.equal(await s.get(`token:${sha256(res2.body.authToken)}`), true)
})
