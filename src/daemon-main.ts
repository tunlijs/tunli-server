import {mkdirSync} from 'fs'
import {fileURLToPath} from 'url'
import {dirname, join} from 'path'
import {DaemonServer, type ServerScripts} from '#daemon/DaemonServer'
import {Logger} from '#lib/Logger'
import {TUNLI_DIR} from '#lib/defs'
import {loadAndAssertConfig} from '#lib/validateConfig'
import {config} from '#lib/Config'

mkdirSync(TUNLI_DIR, {recursive: true})
loadAndAssertConfig(join(dirname(fileURLToPath(import.meta.url)), '../conf.d'))
if (config.log.file) mkdirSync(dirname(config.log.file), {recursive: true})

const logger = new Logger(config.log.file ?? null, {
  minLevel: 'debug',
  stdout: config.log.stdout === true
})

const daemonLogger = logger.child('daemon')

const ext = import.meta.url.endsWith('.ts') ? '.ts' : '.js'
const dir = dirname(fileURLToPath(import.meta.url))

const scripts: ServerScripts = {
  api: join(dir, `server-api${ext}`),
  proxy: join(dir, `server-proxy${ext}`),
  socket: join(dir, `server-socket${ext}`),
}

if (config.server) {
  scripts.router = join(dir, `server-router${ext}`)
}

const daemon = new DaemonServer(scripts, daemonLogger)

await daemon.listen()
