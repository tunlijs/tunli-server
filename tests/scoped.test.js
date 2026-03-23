import {test} from 'node:test'
import assert from 'node:assert/strict'
import {scoped, createScopedInstance} from '../dist/scoped/scoped.js'

test('createScopedInstance has default authToken', () => {
  const instance = createScopedInstance()
  assert.equal(instance.authToken, '')
  assert.equal(instance.authTokenDecoded, null)
})

test('scoped creates instance on first call', () => {
  const req = {}
  const instance = scoped(req)
  assert.ok(instance)
  assert.equal(instance.authToken, '')
})

test('scoped returns same instance for same req', () => {
  const req = {}
  const a = scoped(req)
  const b = scoped(req)
  assert.equal(a, b)
})

test('scoped instances are isolated between requests', () => {
  const req1 = {}
  const req2 = {}
  scoped(req1).authToken = 'token1'
  assert.equal(scoped(req2).authToken, '')
})

test('mutations on scoped instance persist', () => {
  const req = {}
  scoped(req).authToken = 'abc'
  assert.equal(scoped(req).authToken, 'abc')
})
