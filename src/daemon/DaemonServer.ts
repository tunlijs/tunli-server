import {type ChildProcess, spawn} from 'child_process'
import {isSea} from 'node:sea'
import {SERVER_DAEMON_SOCKET_PATH, SERVER_VERSION} from '#lib/defs'
import type {DaemonRequest, DaemonResponse, ProcessName, ProcessStatsEntry, ProcessStatus} from '#daemon/protocol'
import {requestChildStats} from '#stats/requestChildStats'
import {formatStatsSummary} from '#stats/formatStats'
import type {ChildLogger} from '#lib/Logger'
import {DaemonServer as DaemonServerExt} from '@tunli/daemon'

export type ServerScripts = Partial<Record<ProcessName, string>>

type ManagedProcess = {
  name: ProcessName
  script: string
  child: ChildProcess | null
  status: ProcessStatus
}

interface DaemonEventMap extends Record<string, Array<unknown>> {
  "status": [req: DaemonRequest]
  "shutdown": [req: DaemonRequest]
  "stats": [req: DaemonRequest]
}

const STATS_LOG_INTERVAL_MS = 5 * 60 * 1000

export class DaemonServer {
  readonly #processes: Map<ProcessName, ManagedProcess> = new Map()
  readonly #daemonServer = new DaemonServerExt<DaemonRequest, DaemonResponse, DaemonEventMap>(SERVER_DAEMON_SOCKET_PATH)
  readonly #startedAt = Date.now()

  constructor(scripts: ServerScripts, logger: ChildLogger) {
    this.#daemonServer.logger = logger
    for (const [name, script] of Object.entries(scripts) as [ProcessName, string][]) {
      this.#processes.set(name, {name, script, child: null, status: 'stopped'})
    }
  }

  async listen(): Promise<void> {

    this.#daemonServer.createServer((_req, socket) => {
      socket.write({type: 'error', message: 'Invalid request'})
    })

    this.#daemonServer.on('status', (_req, socket) => {
      socket.write({
        type: 'status',
        version: SERVER_VERSION,
        processes: Object.fromEntries(
          [...this.#processes.entries()].map(([name, p]) => [name, p.status])
        ) as Record<ProcessName, ProcessStatus>,
      })
    })

    this.#daemonServer.on('stats', (_req, socket) => {
      this.#collectStats()
        .then((processes) => socket.write({
          type: 'stats',
          version: SERVER_VERSION,
          uptimeSec: Math.round((Date.now() - this.#startedAt) / 1000),
          processes,
        }))
        .catch((e: unknown) => socket.write({type: 'error', message: `Failed to collect stats: ${e}`}))
    })

    this.#daemonServer.on('shutdown', (_req, socket) => {
      socket.write({type: 'ok'})
      this.#shutdown()
    })

    await this.#daemonServer.listen()

    for (const proc of this.#processes.values()) {
      this.#spawn(proc)
    }

    this.#daemonServer.onShutdown(() => this.#shutdown())

    setInterval(() => {
      this.#collectStats()
        .then((processes) => this.#daemonServer.logger.info(formatStatsSummary(processes)))
        .catch(() => { /* best effort */ })
    }, STATS_LOG_INTERVAL_MS).unref()
  }

  async #collectStats(): Promise<Partial<Record<ProcessName, ProcessStatsEntry>>> {
    const entries = await Promise.all([...this.#processes.values()].map(async (p) =>
      [p.name, {status: p.status, stats: await requestChildStats(p.child)}] as const
    ))
    return Object.fromEntries(entries)
  }

  #spawn(proc: ManagedProcess): void {
    if (this.#daemonServer.shuttingDown) return
    proc.status = 'starting'
    this.#daemonServer.logger.info(`Starting ${proc.name}`)

    let child: ChildProcess
    if (isSea()) {
      child = spawn(process.execPath, [], {
        env: {...process.env, TUNLI_SERVER_DAEMON: '', TUNLI_SERVER_PROCESS: proc.name},
        stdio: ['ignore', 'pipe', 'pipe', 'ipc'],
      })
    } else {
      const isTsxBinary = process.argv[1]?.includes('tsx')
      const nodeArgs = isTsxBinary
        ? [process.argv[1]!, proc.script]
        : [...process.execArgv, proc.script]
      child = spawn(process.execPath, nodeArgs, {stdio: ['ignore', 'pipe', 'pipe', 'ipc']})
    }
    proc.child = child

    child.stdout?.on('data', (chunk: Buffer) => this.#daemonServer.logger.info(`[${proc.name}] ${chunk.toString().trimEnd()}`))
    child.stderr?.on('data', (chunk: Buffer) => this.#daemonServer.logger.error(`[${proc.name}] ${chunk.toString().trimEnd()}`))

    child.once('spawn', () => {
      proc.status = 'running'
      this.#daemonServer.logger.info(`${proc.name} running (pid ${child.pid})`)
    })

    child.once('exit', (code) => {
      if (this.#daemonServer.shuttingDown) {
        proc.status = 'stopped'
        return
      }
      proc.status = 'crashed'
      this.#daemonServer.logger.warn(`${proc.name} exited with code ${code}, restarting in 1s`)
      setTimeout(() => this.#spawn(proc), 1000)
    })
  }

  #shutdown(): void {
    for (const proc of this.#processes.values()) {
      proc.child?.kill('SIGTERM')
    }

    this.#daemonServer.shutdown()

    process.exit(0)
  }
}
