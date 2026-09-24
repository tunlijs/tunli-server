import {daemonClient} from '#daemon/DaemonClient'
import {loadAndAssertConfig} from '#lib/validateConfig'
import {createReadStream, watchFile} from 'fs'
import {join} from 'path'
import {SERVER_VERSION, TUNLI_DIR} from '#lib/defs'

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
    const logFile = join(TUNLI_DIR, 'server-daemon.log')
    let pos = 0
    const readFrom = (start: number) => {
      const s = createReadStream(logFile, {encoding: 'utf8', start})
      s.pipe(process.stdout, {end: false})
      s.on('end', () => {
        pos += s.bytesRead
      })
    }
    readFrom(0)
    watchFile(logFile, {interval: 300}, () => readFrom(pos))
    break
  }

  default:
    console.error('Usage: tunli-server <start|stop|restart|status|version|logs|checkconf>')
    process.exit(1)
}
