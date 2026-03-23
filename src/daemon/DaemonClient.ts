import net from 'net'
import {spawn} from 'child_process'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {isSea} from 'node:sea'
import {SERVER_DAEMON_SOCKET_PATH} from '#lib/defs'
import type {DaemonRequest, DaemonResponse} from '#daemon/protocol'

const ext = import.meta.url.endsWith('.ts') ? '.ts' : '.js'
const DAEMON_MAIN_PATH = join(dirname(fileURLToPath(import.meta.url)), `../daemon-main${ext}`)

export class DaemonClient {

  async send(request: DaemonRequest): Promise<DaemonResponse> {
    return new Promise((resolve, reject) => {
      const socket = net.connect(SERVER_DAEMON_SOCKET_PATH)
      let buffer = ''

      socket.on('connect', () => {
        socket.write(JSON.stringify(request) + '\n')
      })

      socket.on('data', (chunk) => {
        buffer += chunk.toString()
        const nl = buffer.indexOf('\n')
        if (nl === -1) return
        socket.destroy()
        try {
          resolve(JSON.parse(buffer.slice(0, nl)) as DaemonResponse)
        } catch {
          reject(new Error('Invalid daemon response'))
        }
      })

      socket.on('error', reject)
    })
  }

  static isRunning(): Promise<boolean> {
    return new Promise((resolve) => {
      const socket = net.connect(SERVER_DAEMON_SOCKET_PATH)
      socket.on('connect', () => { socket.destroy(); resolve(true) })
      socket.on('error', () => resolve(false))
    })
  }

  static spawnDaemon(): void {
    if (isSea()) {
      spawn(process.execPath, [], {
        env: {...process.env, TUNLI_SERVER_DAEMON: '1'},
        detached: true,
        stdio: 'ignore',
      }).unref()
      return
    }

    const isTsxBinary = (process.argv[1] ?? '').includes('tsx')
    const nodeArgs = isTsxBinary
      ? [process.argv[1]!, DAEMON_MAIN_PATH]
      : [...process.execArgv, DAEMON_MAIN_PATH]
    spawn(process.execPath, nodeArgs, {detached: true, stdio: 'ignore'}).unref()
  }

  static async start(): Promise<void> {
    DaemonClient.spawnDaemon()
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100))
      if (await DaemonClient.isRunning()) return
    }
    throw new Error('Server daemon did not start within 5 seconds')
  }

  static async stop(): Promise<void> {
    await new DaemonClient().send({type: 'shutdown'})
    const deadline = Date.now() + 5000
    while (Date.now() < deadline) {
      await new Promise(r => setTimeout(r, 100))
      if (!await DaemonClient.isRunning()) return
    }
    throw new Error('Server daemon did not stop within 5 seconds')
  }
}
