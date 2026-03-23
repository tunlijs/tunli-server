import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {
  createSocketHttpHeader,
  rewriteLocation,
  rewriteAccessControlAllowOrigin,
  rewriteSetCookieDomain,
} from '../dist/utils/httpFunctions.js'

// createSocketHttpHeader

describe('createSocketHttpHeader', () => {
  test('includes status line', () => {
    const result = createSocketHttpHeader('HTTP/1.1 200 OK', {})
    assert.ok(result.startsWith('HTTP/1.1 200 OK'))
  })

  test('includes single-value headers', () => {
    const result = createSocketHttpHeader('GET / HTTP/1.1', {'content-type': 'application/json'})
    assert.ok(result.includes('content-type: application/json'))
  })

  test('expands array headers', () => {
    const result = createSocketHttpHeader('GET / HTTP/1.1', {'set-cookie': ['a=1', 'b=2']})
    assert.ok(result.includes('set-cookie: a=1'))
    assert.ok(result.includes('set-cookie: b=2'))
  })

  test('ends with \\r\\n\\r\\n', () => {
    assert.ok(createSocketHttpHeader('GET / HTTP/1.1', {'x-foo': 'bar'}).endsWith('\r\n\r\n'))
  })
})

// rewriteLocation

describe('rewriteLocation', () => {
  test('rewrites host and protocol', () => {
    const headers = {'location': 'http://localhost:3000/path?q=1'}
    rewriteLocation(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['location'], 'https://abc.tunli.app/path?q=1')
  })

  test('preserves path and query', () => {
    const headers = {'location': 'http://localhost:8080/foo/bar?x=1&y=2'}
    rewriteLocation(headers, 'abc.tunli.app', 'https')
    const url = new URL(headers['location'])
    assert.equal(url.pathname, '/foo/bar')
    assert.equal(url.search, '?x=1&y=2')
  })

  test('no-op if location is missing', () => {
    const headers = {}
    rewriteLocation(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['location'], undefined)
  })

  test('no-op if location is a relative URL', () => {
    const headers = {'location': '/relative/path'}
    rewriteLocation(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['location'], '/relative/path')
  })

  test('handles http protocol', () => {
    const headers = {'location': 'https://localhost/path'}
    rewriteLocation(headers, 'abc.tunli.app', 'http')
    assert.ok(headers['location'].startsWith('http://'))
  })

  test('preserves non-standard port from host', () => {
    const headers = {'location': 'http://localhost:3000/path'}
    rewriteLocation(headers, 'abc.myserver.com:8443', 'https')
    assert.equal(headers['location'], 'https://abc.myserver.com:8443/path')
  })
})

// rewriteAccessControlAllowOrigin

describe('rewriteAccessControlAllowOrigin', () => {
  test('rewrites specific origin', () => {
    const headers = {'access-control-allow-origin': 'http://localhost:3000'}
    rewriteAccessControlAllowOrigin(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['access-control-allow-origin'], 'https://abc.tunli.app')
  })

  test('leaves wildcard untouched', () => {
    const headers = {'access-control-allow-origin': '*'}
    rewriteAccessControlAllowOrigin(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['access-control-allow-origin'], '*')
  })

  test('no-op if header is missing', () => {
    const headers = {}
    rewriteAccessControlAllowOrigin(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['access-control-allow-origin'], undefined)
  })

  test('no-op if value is invalid', () => {
    const headers = {'access-control-allow-origin': 'not-a-url'}
    rewriteAccessControlAllowOrigin(headers, 'abc.tunli.app', 'https')
    assert.equal(headers['access-control-allow-origin'], 'not-a-url')
  })

  test('preserves non-standard port from host', () => {
    const headers = {'access-control-allow-origin': 'http://localhost:3000'}
    rewriteAccessControlAllowOrigin(headers, 'abc.myserver.com:8443', 'https')
    assert.equal(headers['access-control-allow-origin'], 'https://abc.myserver.com:8443')
  })
})

// rewriteSetCookieDomain

describe('rewriteSetCookieDomain', () => {
  test('rewrites domain attribute', () => {
    const headers = {'set-cookie': ['session=abc; Domain=localhost; Path=/']}
    rewriteSetCookieDomain(headers, 'abc.tunli.app')
    assert.ok(headers['set-cookie'][0].includes('Domain=abc.tunli.app'))
    assert.ok(!headers['set-cookie'][0].includes('Domain=localhost'))
  })

  test('rewrites domain in all cookies', () => {
    const headers = {'set-cookie': ['a=1; Domain=localhost', 'b=2; Domain=localhost']}
    rewriteSetCookieDomain(headers, 'abc.tunli.app')
    assert.ok(headers['set-cookie'].every(c => c.includes('Domain=abc.tunli.app')))
  })

  test('handles single cookie string', () => {
    const headers = {'set-cookie': 'a=1; Domain=localhost; Path=/'}
    rewriteSetCookieDomain(headers, 'abc.tunli.app')
    assert.ok(Array.isArray(headers['set-cookie']))
    assert.ok(headers['set-cookie'][0].includes('Domain=abc.tunli.app'))
  })

  test('no-op if set-cookie is missing', () => {
    const headers = {}
    rewriteSetCookieDomain(headers, 'abc.tunli.app')
    assert.equal(headers['set-cookie'], undefined)
  })

  test('leaves cookies without domain untouched', () => {
    const headers = {'set-cookie': ['session=abc; Path=/']}
    rewriteSetCookieDomain(headers, 'abc.tunli.app')
    assert.ok(!headers['set-cookie'][0].includes('Domain='))
  })

  test('is case-insensitive for domain attribute', () => {
    const headers = {'set-cookie': ['a=1; DOMAIN=localhost']}
    rewriteSetCookieDomain(headers, 'abc.tunli.app')
    assert.ok(headers['set-cookie'][0].includes('Domain=abc.tunli.app'))
  })
})
