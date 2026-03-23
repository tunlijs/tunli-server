import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateConfig} from '../dist/lib/validateConfig.js'

const validConfig = () => ({
  log: {file: '/tmp/test.log'},
  server: {port: 10000, host: '0.0.0.0'},
  apiServer: {port: 10001, host: '0.0.0.0'},
  proxyServer: {port: 8082, host: '0.0.0.0', urlTemplate: 'http://localhost/{{id}}'},
  socketServer: {port: 10010, host: 'localhost', capturePath: '/$tunnel', publicUrl: 'https://relay.example.com'},
  auth: {jwtSignatureSecret: 'secret'},
})

test('valid config returns no errors', () => {
  assert.deepEqual(validateConfig(validConfig()), [])
})

test('missing log returns error', () => {
  const c = validConfig()
  delete c.log
  assert.ok(validateConfig(c).some(e => e.startsWith('log:')))
})

test('invalid port returns error', () => {
  const c = validConfig()
  c.server.port = 99999
  assert.ok(validateConfig(c).some(e => e.includes('server.port')))
})

test('missing host returns error', () => {
  const c = validConfig()
  c.apiServer.host = ''
  assert.ok(validateConfig(c).some(e => e.includes('apiServer.host')))
})

test('missing jwtSignatureSecret returns error', () => {
  const c = validConfig()
  c.auth.jwtSignatureSecret = ''
  assert.ok(validateConfig(c).some(e => e.includes('auth.jwtSignatureSecret')))
})

test('missing socketServer.publicUrl returns error', () => {
  const c = validConfig()
  c.socketServer.publicUrl = ''
  assert.ok(validateConfig(c).some(e => e.includes('socketServer.publicUrl')))
})

test('redis false is valid', () => {
  const c = {...validConfig(), redis: false}
  assert.deepEqual(validateConfig(c), [])
})

test('redis with valid url is valid', () => {
  const c = {...validConfig(), redis: {url: 'redis://localhost:6379'}}
  assert.deepEqual(validateConfig(c), [])
})

test('redis with empty url returns error', () => {
  const c = {...validConfig(), redis: {url: ''}}
  assert.ok(validateConfig(c).some(e => e.includes('redis.url')))
})

test('server false is valid (router disabled)', () => {
  const c = {...validConfig(), server: false}
  assert.deepEqual(validateConfig(c), [])
})

test('connectionPoolSize omitted is valid', () => {
  assert.deepEqual(validateConfig(validConfig()), [])
})

test('connectionPoolSize valid positive integer', () => {
  const c = validConfig()
  c.socketServer.connectionPoolSize = 8
  assert.deepEqual(validateConfig(c), [])
})

test('connectionPoolSize zero returns error', () => {
  const c = validConfig()
  c.socketServer.connectionPoolSize = 0
  assert.ok(validateConfig(c).some(e => e.includes('connectionPoolSize')))
})

test('connectionPoolSize float returns error', () => {
  const c = validConfig()
  c.socketServer.connectionPoolSize = 2.5
  assert.ok(validateConfig(c).some(e => e.includes('connectionPoolSize')))
})

test('connectionPoolSize string returns error', () => {
  const c = validConfig()
  c.socketServer.connectionPoolSize = '8'
  assert.ok(validateConfig(c).some(e => e.includes('connectionPoolSize')))
})

test('multiple errors are all reported', () => {
  const c = validConfig()
  c.apiServer.port = 0
  c.auth.jwtSignatureSecret = ''
  const errors = validateConfig(c)
  assert.ok(errors.length >= 2)
})
