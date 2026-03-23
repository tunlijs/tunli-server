import {test} from 'node:test'
import assert from 'node:assert/strict'
import {md5, sha256} from '../dist/utils/hashFunctions.js'

test('md5 returns 32-char hex string', () => {
  const result = md5('hello')
  assert.match(result, /^[0-9a-f]{32}$/)
})

test('md5 is deterministic', () => {
  assert.equal(md5('hello'), md5('hello'))
})

test('md5 differs for different inputs', () => {
  assert.notEqual(md5('hello'), md5('world'))
})

test('sha256 returns 64-char hex string', () => {
  const result = sha256('hello')
  assert.match(result, /^[0-9a-f]{64}$/)
})

test('sha256 is deterministic', () => {
  assert.equal(sha256('hello'), sha256('hello'))
})

test('sha256 differs for different inputs', () => {
  assert.notEqual(sha256('hello'), sha256('world'))
})

test('sha256 known value', () => {
  assert.equal(
    sha256('hello'),
    '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
  )
})
