import {test} from 'node:test'
import assert from 'node:assert/strict'
import {generateTunnelId, isTunnelId} from '../dist/utils/tunnelId.js'

test('generateTunnelId returns 25-char string', () => {
  assert.equal(generateTunnelId().length, 25)
})

test('generateTunnelId only uses allowed charset', () => {
  const id = generateTunnelId()
  assert.match(id, /^[0-9a-z]{25}$/)
})

test('generateTunnelId is unique', () => {
  const ids = new Set(Array.from({length: 100}, () => generateTunnelId()))
  assert.equal(ids.size, 100)
})

test('isTunnelId accepts valid id', () => {
  const id = generateTunnelId()
  assert.equal(isTunnelId(id), true)
})

test('isTunnelId rejects too short', () => {
  assert.equal(isTunnelId('abc123'), false)
})

test('isTunnelId rejects uppercase', () => {
  const id = generateTunnelId().toUpperCase()
  assert.equal(isTunnelId(id), false)
})

test('isTunnelId rejects non-string', () => {
  assert.equal(isTunnelId(null), false)
  assert.equal(isTunnelId(123), false)
})

test('isTunnelId rejects invalid chars', () => {
  assert.equal(isTunnelId('aaaaaaaaaaaaaaaaaaaaaaaaA'), false)
})
