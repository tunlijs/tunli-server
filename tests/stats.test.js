import {test, describe, after} from 'node:test'
import assert from 'node:assert/strict'
import {fork} from 'node:child_process'
import {resolve} from 'node:path'
import {once} from 'node:events'
import {RateCounter} from '../dist/stats/RateCounter.js'
import {formatBytes, formatDuration, formatStats, formatStatsSummary} from '../dist/stats/formatStats.js'
import {requestChildStats} from '../dist/stats/requestChildStats.js'
import {tunnelSocketRegistry} from '../dist/lib/TunnelSocketRegistry.js'

const FIXTURE = resolve(import.meta.dirname, 'fixtures/statsChild.js')

describe('RateCounter', () => {
  test('counts hits within the window', () => {
    let now = 1_000_000
    const rate = new RateCounter(60, () => now)
    rate.hit()
    rate.hit(2)
    now += 30_000
    rate.hit()
    assert.equal(rate.count(), 4)
  })

  test('drops hits older than the window', () => {
    let now = 1_000_000
    const rate = new RateCounter(60, () => now)
    rate.hit(5)
    now += 61_000
    rate.hit()
    assert.equal(rate.count(), 1)
  })

  test('reuses buckets after wrap-around without carrying old counts', () => {
    let now = 1_000_000
    const rate = new RateCounter(60, () => now)
    rate.hit(10)
    now += 60_000 // same bucket index, one window later
    rate.hit()
    assert.equal(rate.count(), 1)
  })
})

describe('format helpers', () => {
  test('formatBytes', () => {
    assert.equal(formatBytes(512), '512 B')
    assert.equal(formatBytes(1536), '1.5 KB')
    assert.equal(formatBytes(5 * 1024 ** 3), '5.0 GB')
  })

  test('formatDuration', () => {
    assert.equal(formatDuration(42), '42s')
    assert.equal(formatDuration(125), '2m')
    assert.equal(formatDuration(3 * 3600 + 120), '3h 2m')
    assert.equal(formatDuration(2 * 86400 + 5 * 3600), '2d 5h')
  })
})

const proc = (metrics, uptimeSec = 100) => ({
  status: 'running',
  stats: {pid: 1, uptimeSec, rssBytes: 50 * 1024 ** 2, heapUsedBytes: 0, metrics},
})

describe('formatStats', () => {
  const res = {
    type: 'stats', version: '0.5.0', uptimeSec: 3600,
    processes: {
      api: proc({registrations: 4}),
      socket: proc({users: 2, tunnels: 3, connections: 24, requestsTotal: 1234, requestsLastMinute: 120, bytesOut: 2048}),
      proxy: {status: 'crashed', stats: null},
    },
  }

  test('shows socket and api metrics', () => {
    const out = formatStats(res)
    assert.match(out, /tunli-server v0\.5\.0 — up 1h 0m/)
    assert.match(out, /Users\s+2/)
    assert.match(out, /Connections\s+24/)
    assert.match(out, /Requests\s+1,234\s+120 last min \(2\.0\/s\)/)
    assert.match(out, /Traffic out\s+2\.0 KB/)
    assert.match(out, /Registrations\s+4/)
    assert.match(out, /proxy\s+crashed\s+no data/)
  })

  test('uses the live rate in watch mode', () => {
    assert.match(formatStats(res, 12.5), /12\.5\/s now/)
  })

  test('handles a missing socket server', () => {
    const out = formatStats({...res, processes: {api: proc({})}})
    assert.match(out, /Socket server: no data/)
  })

  test('summary line', () => {
    assert.match(formatStatsSummary(res.processes), /^stats: users=2 tunnels=3 connections=24 .*requests=1234/)
    assert.equal(formatStatsSummary({}), 'stats: socket server not responding')
  })
})

describe('requestChildStats', () => {
  const children = []
  const start = async (...args) => {
    const child = fork(FIXTURE, args, {stdio: ['ignore', 'ignore', 'ignore', 'ipc']})
    children.push(child)
    await once(child, 'message') // 'ready'
    return child
  }
  after(() => children.forEach(c => c.kill()))

  test('returns the child stats over IPC', async () => {
    const child = await start()
    const stats = await requestChildStats(child)
    assert.equal(stats.pid, child.pid)
    assert.equal(stats.metrics.requestsTotal, 3)
    assert.ok(stats.rssBytes > 0)
  })

  test('answers concurrent requests independently', async () => {
    const child = await start()
    const [a, b] = await Promise.all([requestChildStats(child), requestChildStats(child)])
    assert.equal(a.pid, child.pid)
    assert.equal(b.pid, child.pid)
  })

  test('resolves null on timeout', async () => {
    const child = await start('silent')
    assert.equal(await requestChildStats(child, 200), null)
  })

  test('resolves null when the child exits', async () => {
    const child = await start('silent')
    const pending = requestChildStats(child, 5000)
    child.kill()
    assert.equal(await pending, null)
  })

  test('resolves null without a child', async () => {
    assert.equal(await requestChildStats(null), null)
  })
})

describe('TunnelSocketRegistry counts', () => {
  test('tunnelCount and connectionCount', () => {
    const before = {t: tunnelSocketRegistry.tunnelCount, c: tunnelSocketRegistry.connectionCount}
    const id = 'stats-' + Math.random().toString(36).slice(2)
    const a = {id: 'a'}, b = {id: 'b'}
    tunnelSocketRegistry.add(id, a)
    tunnelSocketRegistry.add(id, b)
    assert.equal(tunnelSocketRegistry.tunnelCount, before.t + 1)
    assert.equal(tunnelSocketRegistry.connectionCount, before.c + 2)
    tunnelSocketRegistry.remove(id, a)
    tunnelSocketRegistry.remove(id, b)
    assert.equal(tunnelSocketRegistry.tunnelCount, before.t)
  })
})
