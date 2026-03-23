export type ProcessName = 'api' | 'proxy' | 'socket' | 'router'
export type ProcessStatus = 'starting' | 'running' | 'crashed' | 'stopped'

export type DaemonRequest =
  | { type: 'status' }
  | { type: 'shutdown' }

export type DaemonResponse =
  | { type: 'status'; processes: Record<ProcessName, ProcessStatus> }
  | { type: 'ok' }
  | { type: 'error'; message: string }
