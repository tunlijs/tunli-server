import {test, describe} from 'node:test'
import assert from 'node:assert/strict'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {resolveConfigPath} from '../dist/utils/pathFunctions.js'

describe('resolveConfigPath', () => {
  test('expands ~/ to the home directory', () => {
    assert.equal(resolveConfigPath('~/.tunli/server-daemon.log', '/etc/tunli'), join(homedir(), '.tunli/server-daemon.log'))
  })

  test('expands bare ~', () => {
    assert.equal(resolveConfigPath('~', '/etc/tunli'), homedir())
  })

  test('keeps absolute paths', () => {
    assert.equal(resolveConfigPath('/var/log/tunli.log', '/etc/tunli'), '/var/log/tunli.log')
  })

  test('resolves relative paths against the base dir', () => {
    assert.equal(resolveConfigPath('logs/server.log', '/etc/tunli'), '/etc/tunli/logs/server.log')
  })

  test('does not expand ~ in the middle of a path', () => {
    assert.equal(resolveConfigPath('foo/~/bar', '/etc/tunli'), '/etc/tunli/foo/~/bar')
  })
})
