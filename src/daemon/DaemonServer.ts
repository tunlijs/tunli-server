import net from 'net'
import {type ChildProcess, spawn} from 'child_process'
import {unlinkSync} from 'fs'
import {isSea} from 'node:sea'
import {SERVER_DAEMON_SOCKET_PATH} from '#lib/defs'
import type {DaemonRequest, DaemonResponse, ProcessName, ProcessStatus} from '#daemon/protocol'
import type {ChildLogger} from '#lib/Logger'

export type ServerScripts = Partial<Record<ProcessName, string>>

type ManagedProcess = {
  name: ProcessName
  script: string
  child: ChildProcess | null
  status: ProcessStatus
}

export class DaemonServer {
  readonly #logger: ChildLogger
  readonly #processes: Map<ProcessName, ManagedProcess> = new Map()
  #server?: net.Server
  #shuttingDown = false

  constructor(scripts: ServerScripts, logger: ChildLogger) {
    this.#logger = logger
    for (const [name, script] of Object.entries(scripts) as [ProcessName, string][]) {
      this.#processes.set(name, {name, script, child: null, status: 'stopped'})
    }
  }

  async listen(): Promise<void> {
    try {
      unlinkSync(SERVER_DAEMON_SOCKET_PATH)
    } catch { /* stale socket */
    }

    this.#server = net.createServer((socket) => {
      let buffer = ''
      socket.on('data', (chunk) => {
        buffer += chunk.toString()
        const nl = buffer.indexOf('\n')
        if (nl === -1) return
        const line = buffer.slice(0, nl)
        buffer = buffer.slice(nl + 1)
        try {
          this.#handle(JSON.parse(line) as DaemonRequest, socket)
        } catch {
          this.#respond(socket, {type: 'error', message: 'Invalid request'})
        }
      })
    })

    await new Promise<void>((resolve) => this.#server!.listen(SERVER_DAEMON_SOCKET_PATH, resolve))
    this.#logger.info('Daemon listening')

    for (const proc of this.#processes.values()) {
      this.#spawn(proc)
    }

    process.on('SIGTERM', () => this.#shutdown())
    process.on('SIGINT', () => this.#shutdown())
  }

  #handle(req: DaemonRequest, socket: net.Socket): void {
    switch (req.type) {
      case 'status':
        this.#respond(socket, {
          type: 'status',
          processes: Object.fromEntries(
            [...this.#processes.entries()].map(([name, p]) => [name, p.status])
          ) as Record<ProcessName, ProcessStatus>,
        })
        break
      case 'shutdown':
        this.#respond(socket, {type: 'ok'})
        this.#shutdown()
        break
    }
  }

  #spawn(proc: ManagedProcess): void {
    if (this.#shuttingDown) return
    proc.status = 'starting'
    this.#logger.info(`Starting ${proc.name}`)

    let child: ChildProcess
    if (isSea()) {
      child = spawn(process.execPath, [], {
        env: {...process.env, TUNLI_SERVER_DAEMON: '', TUNLI_SERVER_PROCESS: proc.name},
        stdio: ['ignore', 'pipe', 'pipe'],
      })
    } else {
      const isTsxBinary = process.argv[1]?.includes('tsx')
      const nodeArgs = isTsxBinary
        ? [process.argv[1]!, proc.script]
        : [...process.execArgv, proc.script]
      child = spawn(process.execPath, nodeArgs, {stdio: ['ignore', 'pipe', 'pipe']})
    }
    proc.child = child

    child.stdout?.on('data', (chunk: Buffer) => this.#logger.info(`[${proc.name}] ${chunk.toString().trimEnd()}`))
    child.stderr?.on('data', (chunk: Buffer) => this.#logger.error(`[${proc.name}] ${chunk.toString().trimEnd()}`))

    child.once('spawn', () => {
      proc.status = 'running'
      this.#logger.info(`${proc.name} running (pid ${child.pid})`)
    })

    child.once('exit', (code) => {
      if (this.#shuttingDown) {
        proc.status = 'stopped'
        return
      }
      proc.status = 'crashed'
      this.#logger.warn(`${proc.name} exited with code ${code}, restarting in 1s`)
      setTimeout(() => this.#spawn(proc), 1000)
    })
  }

  #respond(socket: net.Socket, response: DaemonResponse): void {
    socket.write(JSON.stringify(response) + '\n')
  }

  #shutdown(): void {
    if (this.#shuttingDown) return
    this.#shuttingDown = true
    this.#logger.info('Daemon shutting down')
    for (const proc of this.#processes.values()) {
      proc.child?.kill('SIGTERM')
    }
    this.#server?.close()
    try {
      unlinkSync(SERVER_DAEMON_SOCKET_PATH)
    } catch { /* already gone */
    }
    process.exit(0)
  }
}
