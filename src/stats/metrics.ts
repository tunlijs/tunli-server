import {RateCounter} from "#stats/RateCounter";
import {isStatsRequest, type Metrics, type ProcessStats, type StatsResponseMessage} from "#stats/protocol";

export type CounterName =
  | 'requestsTotal'
  | 'requestsInFlight'
  | 'websocketsTotal'
  | 'websocketsOpen'
  | 'bytesIn'
  | 'bytesOut'
  | 'blockedCidr'
  | 'tunnelErrors'
  | 'registrations'
  | 'subdomainsCreated'
  | 'subdomainsRenewed'

const counters = new Map<CounterName, number>()

export const requestRate = new RateCounter(60)

export const inc = (name: CounterName, by = 1): void => {
  counters.set(name, (counters.get(name) ?? 0) + by)
}

export const dec = (name: CounterName, by = 1): void => inc(name, -by)

export const getCounters = (): Metrics => Object.fromEntries(counters)

export const collectProcessStats = (metrics: Metrics): ProcessStats => {
  const mem = process.memoryUsage()
  return {
    pid: process.pid,
    uptimeSec: Math.round(process.uptime()),
    rssBytes: mem.rss,
    heapUsedBytes: mem.heapUsed,
    metrics,
  }
}

/**
 * Answers stats requests from the daemon over the IPC channel.
 * No-op when the process was started without IPC (e.g. standalone dev run).
 */
export const exposeStats = (collect: () => Metrics = getCounters): void => {
  if (!process.send) return
  process.on('message', (msg: unknown) => {
    if (!isStatsRequest(msg)) return
    let metrics: Metrics
    try {
      metrics = collect()
    } catch {
      metrics = {}
    }
    const response: StatsResponseMessage = {type: 'stats', id: msg.id, stats: collectProcessStats(metrics)}
    process.send?.(response)
  })
}
