import type {DaemonResponse, ProcessName, ProcessStatsEntry} from "#daemon/protocol";
import type {Metrics} from "#stats/protocol";

type StatsResponse = Extract<DaemonResponse, { type: 'stats' }>
type Processes = Partial<Record<ProcessName, ProcessStatsEntry>>

export const formatNumber = (n: number): string => Math.round(n).toLocaleString('en-US')

export const formatBytes = (bytes: number): string => {
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let i = 0
  while (value >= 1024 && i < units.length - 1) {
    value /= 1024
    i++
  }
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`
}

export const formatDuration = (seconds: number): string => {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (d > 0) return `${d}d ${h}h`
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m`
  return `${seconds}s`
}

const metricsOf = (processes: Processes, name: ProcessName): Metrics | null =>
  processes[name]?.stats?.metrics ?? null

const val = (m: Metrics | null, key: string): number => m?.[key] ?? 0

const row = (label: string, value: string, note = ''): string =>
  `${label.padEnd(16)}${value.padStart(10)}${note ? `   ${note}` : ''}`

/**
 * Full stats view for `tunli-server stats`.
 * liveRate: requests/s measured by the caller between two samples (watch mode).
 */
export const formatStats = (res: StatsResponse, liveRate?: number): string => {
  const lines: string[] = [`tunli-server v${res.version} — up ${formatDuration(res.uptimeSec)}`, '']
  const socket = metricsOf(res.processes, 'socket')
  const socketStats = res.processes.socket?.stats

  if (!socket) {
    lines.push('Socket server: no data (not running or not responding)')
  } else {
    const lastMinute = val(socket, 'requestsLastMinute')
    const rate = liveRate !== undefined
      ? `${liveRate.toFixed(1)}/s now`
      : `${formatNumber(lastMinute)} last min (${(lastMinute / 60).toFixed(1)}/s)`

    lines.push(
      row('Users', formatNumber(val(socket, 'users')), '(distinct auth tokens)'),
      row('Tunnels', formatNumber(val(socket, 'tunnels'))),
      row('Connections', formatNumber(val(socket, 'connections'))),
      row('Share sessions', formatNumber(val(socket, 'shareSessions')), `(hosts: ${formatNumber(val(socket, 'shareHosts'))})`),
      '',
      row('Requests', formatNumber(val(socket, 'requestsTotal')), `${rate}, ${formatNumber(val(socket, 'requestsInFlight'))} in flight`),
      row('WebSockets', formatNumber(val(socket, 'websocketsOpen')), `open (${formatNumber(val(socket, 'websocketsTotal'))} total)`),
      row('Traffic in', formatBytes(val(socket, 'bytesIn'))),
      row('Traffic out', formatBytes(val(socket, 'bytesOut'))),
      row('Blocked (CIDR)', formatNumber(val(socket, 'blockedCidr'))),
      row('Tunnel errors', formatNumber(val(socket, 'tunnelErrors'))),
      `(counters since socket start, ${formatDuration(socketStats!.uptimeSec)} ago)`,
    )
  }

  const api = metricsOf(res.processes, 'api')
  if (api) {
    lines.push(
      '',
      row('Registrations', formatNumber(val(api, 'registrations'))),
      row('Tunnels created', formatNumber(val(api, 'subdomainsCreated'))),
      row('Tunnels renewed', formatNumber(val(api, 'subdomainsRenewed'))),
      `(counters since api start, ${formatDuration(res.processes.api!.stats!.uptimeSec)} ago)`,
    )
  }

  lines.push('', 'Processes')
  for (const [name, entry] of Object.entries(res.processes) as [ProcessName, ProcessStatsEntry][]) {
    const s = entry.stats
    lines.push(s
      ? `  ${name.padEnd(8)} ${entry.status.padEnd(9)} pid ${String(s.pid).padEnd(7)} up ${formatDuration(s.uptimeSec).padEnd(8)} rss ${formatBytes(s.rssBytes)}`
      : `  ${name.padEnd(8)} ${entry.status.padEnd(9)} no data`)
  }

  return lines.join('\n')
}

/** One-line summary for the periodic daemon log entry. */
export const formatStatsSummary = (processes: Processes): string => {
  const socket = metricsOf(processes, 'socket')
  if (!socket) return 'stats: socket server not responding'
  return 'stats: ' + [
    `users=${val(socket, 'users')}`,
    `tunnels=${val(socket, 'tunnels')}`,
    `connections=${val(socket, 'connections')}`,
    `shareSessions=${val(socket, 'shareSessions')}`,
    `requests=${val(socket, 'requestsTotal')}`,
    `requestsLastMinute=${val(socket, 'requestsLastMinute')}`,
    `inFlight=${val(socket, 'requestsInFlight')}`,
    `websockets=${val(socket, 'websocketsOpen')}`,
    `bytesIn=${val(socket, 'bytesIn')}`,
    `bytesOut=${val(socket, 'bytesOut')}`,
    `blockedCidr=${val(socket, 'blockedCidr')}`,
    `tunnelErrors=${val(socket, 'tunnelErrors')}`,
  ].join(' ')
}
