import {daemonClient} from '#daemon/DaemonClient'
import {loadAndAssertConfig} from '#lib/validateConfig'
import {closeSync, createReadStream, mkdirSync, openSync, statSync, watchFile} from 'fs'
import {dirname, join} from 'path'
import {SERVER_VERSION} from '#lib/defs'
import {config} from '#lib/Config'
import {formatStats} from '#stats/formatStats'
import type {DaemonResponse} from '#daemon/protocol'

const command = process.argv[2]

switch (command) {
  case 'start': {
    loadAndAssertConfig(join(import.meta.dirname, '../conf.d'))
    if (await daemonClient().isRunning()) {
      console.log('Server is already running')
      process.exit(0)
    }
    process.stdout.write('Starting server... ')
    await daemonClient().start()
    console.log('done')
    break
  }

  case 'stop': {
    if (!await daemonClient().isRunning()) {
      console.log('Server is not running')
      process.exit(0)
    }
    process.stdout.write('Stopping server... ')
    await daemonClient().stop()
    console.log('done')
    break
  }

  case 'restart': {
    loadAndAssertConfig(join(import.meta.dirname, '../conf.d'))
    if (await daemonClient().isRunning()) {
      process.stdout.write('Stopping server... ')
      await daemonClient().stop()
      console.log('done')
    }
    process.stdout.write('Starting server... ')
    await daemonClient().start()
    console.log('done')
    break
  }

  case 'status': {
    if (!await daemonClient().isRunning()) {
      console.log(`Server: stopped (v${SERVER_VERSION})`)
      process.exit(0)
    }
    const response = await daemonClient().send({type: 'status'})
    if (response.type !== 'status') {
      console.error('Unexpected response from daemon')
      process.exit(1)
    }
    // version is missing if the running daemon predates 0.4.1
    const runningVersion = response.version
    console.log(runningVersion === SERVER_VERSION
      ? `Server: running (v${SERVER_VERSION})`
      : `Server: running (v${runningVersion ?? 'unknown'}, installed v${SERVER_VERSION} — restart to update)`)
    for (const [name, status] of Object.entries(response.processes)) {
      console.log(`  ${name}: ${status}`)
    }
    break
  }

  case 'stats': {
    const args = process.argv.slice(3)
    const json = args.includes('--json')
    const watch = args.includes('--watch') || args.includes('-w')

    if (!await daemonClient().isRunning()) {
      console.error('Server is not running')
      process.exit(1)
    }

    // a daemon from before 0.5.0 silently ignores unknown requests, so don't wait forever
    const fetchStats = () => Promise.race([
      daemonClient().send({type: 'stats'}),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000).unref()),
    ])

    const fetchOrExit = async (): Promise<Extract<DaemonResponse, { type: 'stats' }>> => {
      const res = await fetchStats()
      if (res?.type === 'stats') return res
      console.error(res === null
        ? 'The running daemon does not support stats. Run `tunli-server restart` to update it.'
        : `Unexpected response from daemon${res.type === 'error' ? `: ${res.message}` : ''}`)
      process.exit(1)
    }

    if (!watch) {
      const res = await fetchOrExit()
      console.log(json ? JSON.stringify(res, null, 2) : formatStats(res))
      break
    }

    let previous: { at: number; requests: number } | null = null
    const tick = async () => {
      const res = await fetchOrExit()
      const at = Date.now()
      const requests = res.processes.socket?.stats?.metrics.requestsTotal
      let liveRate: number | undefined
      // a lower count means the socket process restarted — skip the rate for this sample
      if (previous && requests !== undefined && requests >= previous.requests) {
        liveRate = (requests - previous.requests) / ((at - previous.at) / 1000)
      }
      if (requests !== undefined) previous = {at, requests}

      if (json) {
        console.log(JSON.stringify(res))
      } else {
        process.stdout.write('\x1B[2J\x1B[H' + formatStats(res, liveRate) + '\n\nRefreshing every 2s — Ctrl+C to exit\n')
      }
      setTimeout(tick, 2000)
    }
    await tick()
    break
  }

  case 'version':
  case '--version':
  case '-v': {
    console.log(SERVER_VERSION)
    break
  }

  case 'checkconf': {
    loadAndAssertConfig(join(import.meta.dirname, '../conf.d'))
    console.log('Config OK')
    break
  }

  case 'logs': {
    loadAndAssertConfig(join(import.meta.dirname, '../conf.d'))
    const logFile = config.log.file
    // the daemon may not have written anything yet — make sure the file exists
    mkdirSync(dirname(logFile), {recursive: true})
    closeSync(openSync(logFile, 'a'))

    let pos = 0
    let reading = false
    const readNew = () => {
      if (reading) return
      let size: number
      try {
        size = statSync(logFile).size
      } catch {
        return // file removed (e.g. rotation) — wait until it reappears
      }
      if (size < pos) pos = 0 // truncated
      if (size === pos) return
      reading = true
      createReadStream(logFile, {encoding: 'utf8', start: pos, end: size - 1})
        .on('data', (chunk) => process.stdout.write(chunk))
        .on('error', (e) => console.error(`Failed to read ${logFile}: ${e.message}`))
        .on('close', () => {
          pos = size
          reading = false
          readNew()
        })
    }
    readNew()
    watchFile(logFile, {interval: 300}, readNew)
    break
  }

  default:
    console.error('Usage: tunli-server <start|stop|restart|status|stats [--json] [--watch]|version|logs|checkconf>')
    process.exit(1)
}
