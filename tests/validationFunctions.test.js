import {test} from 'node:test'
import assert from 'node:assert/strict'
import {isSha256} from '../dist/utils/validationFunctions.js'

const VALID_SHA256 = '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'

test('isSha256 accepts valid hash', () => {
  assert.equal(isSha256(VALID_SHA256), true)
})

test('isSha256 rejects uppercase', () => {
  assert.equal(isSha256(VALID_SHA256.toUpperCase()), false)
})

test('isSha256 rejects too short', () => {
  assert.equal(isSha256(VALID_SHA256.slice(0, 63)), false)
})

test('isSha256 rejects too long', () => {
  assert.equal(isSha256(VALID_SHA256 + 'a'), false)
})

test('isSha256 rejects non-string', () => {
  assert.equal(isSha256(123), false)
  assert.equal(isSha256(null), false)
  assert.equal(isSha256(undefined), false)
})

test('isSha256 rejects invalid chars', () => {
  const invalid = VALID_SHA256.slice(0, 63) + 'g'
  assert.equal(isSha256(invalid), false)
})
