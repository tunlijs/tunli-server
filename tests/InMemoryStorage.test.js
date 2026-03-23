import {test} from 'node:test'
import assert from 'node:assert/strict'
import {InMemoryStorage} from '../dist/lib/InMemoryStorage.js'

test('get returns null for missing key', async () => {
  const storage = new InMemoryStorage()
  assert.equal(await storage.get('missing'), null)
})

test('set and get a value', async () => {
  const storage = new InMemoryStorage()
  await storage.set('key', 'value')
  assert.equal(await storage.get('key'), 'value')
})

test('set and get an object', async () => {
  const storage = new InMemoryStorage()
  await storage.set('obj', {foo: 'bar'})
  assert.deepEqual(await storage.get('obj'), {foo: 'bar'})
})

test('set overwrites existing value', async () => {
  const storage = new InMemoryStorage()
  await storage.set('key', 'first')
  await storage.set('key', 'second')
  assert.equal(await storage.get('key'), 'second')
})

test('keys are isolated between instances', async () => {
  const a = new InMemoryStorage()
  const b = new InMemoryStorage()
  await a.set('key', 'from-a')
  assert.equal(await b.get('key'), null)
})

test('expired entry returns null', async (t) => {
  const storage = new InMemoryStorage()
  await storage.set('key', 'value', 0.001) // 1ms TTL
  await new Promise(r => setTimeout(r, 10))
  assert.equal(await storage.get('key'), null)
})

test('non-expired entry is returned', async () => {
  const storage = new InMemoryStorage()
  await storage.set('key', 'value', 60)
  assert.equal(await storage.get('key'), 'value')
})

test('entry without TTL does not expire', async () => {
  const storage = new InMemoryStorage()
  await storage.set('key', 'value')
  await new Promise(r => setTimeout(r, 10))
  assert.equal(await storage.get('key'), 'value')
})
