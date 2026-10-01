import type {ChildProcess} from "child_process";
import {isStatsResponse, type ProcessStats, type StatsRequestMessage} from "#stats/protocol";

let nextId = 1

/**
 * Asks a child process for its stats over IPC.
 * Resolves with null if the child has no IPC channel, exits, or doesn't answer in time.
 */
export const requestChildStats = (child: ChildProcess | null, timeoutMs = 1000): Promise<ProcessStats | null> => {
  if (!child?.connected || !child.send) return Promise.resolve(null)
  const id = nextId++

  return new Promise((resolve) => {
    const finish = (stats: ProcessStats | null) => {
      clearTimeout(timer)
      child.off('message', onMessage)
      child.off('exit', onExit)
      resolve(stats)
    }
    const onMessage = (msg: unknown) => {
      if (isStatsResponse(msg, id)) finish(msg.stats)
    }
    const onExit = () => finish(null)
    const timer = setTimeout(() => finish(null), timeoutMs)

    child.on('message', onMessage)
    child.once('exit', onExit)
    const request: StatsRequestMessage = {type: 'stats', id}
    try {
      child.send(request, (err) => {
        if (err) finish(null)
      })
    } catch {
      finish(null)
    }
  })
}
