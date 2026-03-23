import {test} from 'node:test'
import assert from 'node:assert/strict'
import {tunnelSocketRegistry} from '../dist/lib/TunnelSocketRegistry.js'

const mockSocket = () => ({id: Math.random().toString()})
const uid = () => Math.random().toString(36).slice(2)

test('has returns false for unknown id', () => {
  assert.equal(tunnelSocketRegistry.has(uid()), false)
})

test('set and has', () => {
  const id = uid()
  tunnelSocketRegistry.set(id, mockSocket())
  assert.equal(tunnelSocketRegistry.has(id), true)
})

test('resolve returns null for unknown id', () => {
  assert.equal(tunnelSocketRegistry.resolve(uid()), null)
})

test('resolve returns the socket', () => {
  const id = uid()
  const socket = mockSocket()
  tunnelSocketRegistry.set(id, socket)
  assert.equal(tunnelSocketRegistry.resolve(id), socket)
})

test('remove deletes entry', () => {
  const id = uid()
  tunnelSocketRegistry.set(id, mockSocket())
  tunnelSocketRegistry.remove(id)
  assert.equal(tunnelSocketRegistry.has(id), false)
  assert.equal(tunnelSocketRegistry.resolve(id), null)
})

test('multiple entries are independent', () => {
  const a = uid()
  const b = uid()
  const s1 = mockSocket()
  const s2 = mockSocket()
  tunnelSocketRegistry.set(a, s1)
  tunnelSocketRegistry.set(b, s2)
  assert.equal(tunnelSocketRegistry.resolve(a), s1)
  assert.equal(tunnelSocketRegistry.resolve(b), s2)
})
