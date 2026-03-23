import {test} from 'node:test'
import assert from 'node:assert/strict'
import {InMemoryStorage} from '../dist/lib/InMemoryStorage.js'
import {
  getRegisterTokenForSubdomain,
  registerSubdomain,
  getSubdomainByProfileHash,
  getSubdomainByTargetHash,
  linkSubdomainToProfileHash,
  linkSubdomainToTargetHash,
} from '../dist/lib/RegisteredSubdomains.js'

const storage = () => new InMemoryStorage()

test('getRegisterTokenForSubdomain returns null when not registered', async () => {
  assert.equal(await getRegisterTokenForSubdomain(storage(), 'unknown'), null)
})

test('registerSubdomain and retrieve token', async () => {
  const s = storage()
  await registerSubdomain(s, 'mysub', 'mytoken')
  assert.equal(await getRegisterTokenForSubdomain(s, 'mysub'), 'mytoken')
})

test('registerSubdomain overwrites existing token', async () => {
  const s = storage()
  await registerSubdomain(s, 'mysub', 'token1')
  await registerSubdomain(s, 'mysub', 'token2')
  assert.equal(await getRegisterTokenForSubdomain(s, 'mysub'), 'token2')
})

test('getSubdomainByProfileHash returns null when not linked', async () => {
  assert.equal(await getSubdomainByProfileHash(storage(), 'token', 'hash'), null)
})

test('linkSubdomainToProfileHash and retrieve', async () => {
  const s = storage()
  await linkSubdomainToProfileHash(s, 'token', 'profilehash', 'mysub')
  assert.equal(await getSubdomainByProfileHash(s, 'token', 'profilehash'), 'mysub')
})

test('getSubdomainByTargetHash returns null when not linked', async () => {
  assert.equal(await getSubdomainByTargetHash(storage(), 'token', 'hash'), null)
})

test('linkSubdomainToTargetHash and retrieve', async () => {
  const s = storage()
  await linkSubdomainToTargetHash(s, 'token', 'targethash', 'mysub')
  assert.equal(await getSubdomainByTargetHash(s, 'token', 'targethash'), 'mysub')
})

test('different tokens do not share subdomains', async () => {
  const s = storage()
  await linkSubdomainToProfileHash(s, 'tokenA', 'hash', 'subA')
  assert.equal(await getSubdomainByProfileHash(s, 'tokenB', 'hash'), null)
})
