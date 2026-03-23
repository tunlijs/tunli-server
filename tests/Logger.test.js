import {test} from 'node:test'
import assert from 'node:assert/strict'
import {Logger} from '../dist/lib/Logger.js'

const captureStdout = (fn) => {
  const chunks = []
  const original = process.stdout.write.bind(process.stdout)
  process.stdout.write = (chunk) => { chunks.push(chunk); return true }
  try { fn() } finally { process.stdout.write = original }
  return chunks.join('')
}

test('Logger writes to stdout when enabled', () => {
  const logger = new Logger(null, {stdout: true})
  const output = captureStdout(() => logger.info('hello'))
  assert.ok(output.includes('[INFO]'))
  assert.ok(output.includes('hello'))
})

test('Logger includes log level', () => {
  const logger = new Logger(null, {stdout: true})
  const out = captureStdout(() => logger.warn('test'))
  assert.ok(out.includes('[WARN]'))
})

test('Logger respects minLevel', () => {
  const logger = new Logger(null, {stdout: true, minLevel: 'warn'})
  const out = captureStdout(() => logger.info('should not appear'))
  assert.equal(out, '')
})

test('Logger child includes label', () => {
  const logger = new Logger(null, {stdout: true})
  const child = logger.child('myservice')
  const out = captureStdout(() => child.info('msg'))
  assert.ok(out.includes('[myservice]'))
  assert.ok(out.includes('msg'))
})

test('Logger includes timestamp', () => {
  const logger = new Logger(null, {stdout: true})
  const out = captureStdout(() => logger.info('ts'))
  assert.match(out, /\d{4}-\d{2}-\d{2}T/)
})

test('Logger does not write to stdout when disabled', () => {
  const logger = new Logger(null, {stdout: false})
  const out = captureStdout(() => logger.info('silent'))
  assert.equal(out, '')
})
