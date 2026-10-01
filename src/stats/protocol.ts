export type Metrics = Record<string, number>

export type ProcessStats = {
  pid: number
  uptimeSec: number
  rssBytes: number
  heapUsedBytes: number
  metrics: Metrics
}

export type StatsRequestMessage = { type: 'stats'; id: number }
export type StatsResponseMessage = { type: 'stats'; id: number; stats: ProcessStats }

export const isStatsRequest = (msg: unknown): msg is StatsRequestMessage =>
  typeof msg === 'object' && msg !== null
  && (msg as StatsRequestMessage).type === 'stats'
  && typeof (msg as StatsRequestMessage).id === 'number'

export const isStatsResponse = (msg: unknown, id: number): msg is StatsResponseMessage =>
  typeof msg === 'object' && msg !== null
  && (msg as StatsResponseMessage).type === 'stats'
  && (msg as StatsResponseMessage).id === id
