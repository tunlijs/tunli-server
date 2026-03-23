import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {tunnelSocketRegistry, RoundRobinStrategy} from '../dist/lib/TunnelSocketRegistry.js'

const mockSocket = () => ({id: Math.random().toString()})
const uid = () => Math.random().toString(36).slice(2)

describe('TunnelSocketRegistry', () => {
  test('has returns false for unknown id', () => {
    assert.equal(tunnelSocketRegistry.has(uid()), false)
  })

  test('add and has', () => {
    const id = uid()
    tunnelSocketRegistry.add(id, mockSocket())
    assert.equal(tunnelSocketRegistry.has(id), true)
  })

  test('resolve returns null for unknown id', () => {
    assert.equal(tunnelSocketRegistry.resolve(uid()), null)
  })

  test('resolve returns the socket', () => {
    const id = uid()
    const socket = mockSocket()
    tunnelSocketRegistry.add(id, socket)
    assert.equal(tunnelSocketRegistry.resolve(id), socket)
  })

  test('remove specific socket', () => {
    const id = uid()
    const socket = mockSocket()
    tunnelSocketRegistry.add(id, socket)
    tunnelSocketRegistry.remove(id, socket)
    assert.equal(tunnelSocketRegistry.has(id), false)
    assert.equal(tunnelSocketRegistry.resolve(id), null)
  })

  test('pool is removed when last socket disconnects', () => {
    const id = uid()
    const s1 = mockSocket()
    const s2 = mockSocket()
    tunnelSocketRegistry.add(id, s1)
    tunnelSocketRegistry.add(id, s2)
    tunnelSocketRegistry.remove(id, s1)
    assert.equal(tunnelSocketRegistry.has(id), true)
    tunnelSocketRegistry.remove(id, s2)
    assert.equal(tunnelSocketRegistry.has(id), false)
  })

  test('multiple sockets per tunnel', () => {
    const id = uid()
    const s1 = mockSocket()
    const s2 = mockSocket()
    tunnelSocketRegistry.add(id, s1)
    tunnelSocketRegistry.add(id, s2)
    assert.equal(tunnelSocketRegistry.poolSize(id), 2)
  })

  test('multiple tunnels are independent', () => {
    const a = uid()
    const b = uid()
    const s1 = mockSocket()
    const s2 = mockSocket()
    tunnelSocketRegistry.add(a, s1)
    tunnelSocketRegistry.add(b, s2)
    assert.equal(tunnelSocketRegistry.resolve(a), s1)
    assert.equal(tunnelSocketRegistry.resolve(b), s2)
  })
})

describe('RoundRobinStrategy', () => {
  test('returns null for empty pool', () => {
    const rr = new RoundRobinStrategy()
    assert.equal(rr.pick([]), null)
  })

  test('returns single socket repeatedly', () => {
    const rr = new RoundRobinStrategy()
    const s = mockSocket()
    assert.equal(rr.pick([s]), s)
    assert.equal(rr.pick([s]), s)
  })

  test('rotates through sockets', () => {
    const rr = new RoundRobinStrategy()
    const s1 = mockSocket()
    const s2 = mockSocket()
    const s3 = mockSocket()
    const sockets = [s1, s2, s3]
    assert.equal(rr.pick(sockets), s1)
    assert.equal(rr.pick(sockets), s2)
    assert.equal(rr.pick(sockets), s3)
    assert.equal(rr.pick(sockets), s1)
  })
})
