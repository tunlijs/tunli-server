export type ProcessName = 'api' | 'proxy' | 'socket' | 'router'
export type ProcessStatus = 'starting' | 'running' | 'crashed' | 'stopped'

import type {ProcessStats} from '#stats/protocol'

export type DaemonRequest =
  | { type: 'status' }
  | { type: 'stats' }
  | { type: 'shutdown' }

export type DaemonResponse =
  | { type: 'status'; version?: string; processes: Record<ProcessName, ProcessStatus> }
  | { type: 'stats'; version: string; uptimeSec: number; processes: Partial<Record<ProcessName, ProcessStatsEntry>> }
  | { type: 'ok' }
  | { type: 'error'; message: string }

export type ProcessStatsEntry = {
  status: ProcessStatus
  /** null if the process didn't answer (not running, no IPC, timeout) */
  stats: ProcessStats | null
}
