import {existsSync} from 'fs'
import {join} from 'path'
import {isSea} from 'node:sea'
import {loadConfig, config} from "#lib/Config";
import {TUNLI_DIR} from "#lib/defs";

export const validateConfig = (config: unknown): string[] => {
  const errors: string[] = []
  const c = config as Record<string, unknown>

  const checkString = (path: string, value: unknown) => {
    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`${path}: must be a non-empty string`)
    }
  }

  const checkPort = (path: string, value: unknown) => {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 65535) {
      errors.push(`${path}: must be an integer between 1 and 65535`)
    }
  }

  const checkServerConfig = (path: string, value: unknown) => {
    if (typeof value !== 'object' || value === null) {
      errors.push(`${path}: must be an object`)
      return
    }
    const v = value as Record<string, unknown>
    checkPort(`${path}.port`, v.port)
    checkString(`${path}.host`, v.host)
  }

  // log
  if (typeof c.log !== 'object' || c.log === null) {
    errors.push('log: must be an object')
  } else {
    checkString('log.file', (c.log as Record<string, unknown>).file)
  }

  // servers
  if (c.server !== false) checkServerConfig('server', c.server)
  checkServerConfig('apiServer', c.apiServer)
  checkServerConfig('socketServer', c.socketServer)
  if (typeof c.socketServer === 'object' && c.socketServer !== null) {
    const ss = c.socketServer as Record<string, unknown>
    checkString('socketServer.capturePath', ss.capturePath)
    checkString('socketServer.publicUrl', ss.publicUrl)
    if (ss.connectionPoolSize !== undefined) {
      if (typeof ss.connectionPoolSize !== 'number' || !Number.isInteger(ss.connectionPoolSize) || ss.connectionPoolSize < 1) {
        errors.push('socketServer.connectionPoolSize: must be a positive integer')
      }
    }
  }
  checkServerConfig('proxyServer', c.proxyServer)
  if (typeof c.proxyServer === 'object' && c.proxyServer !== null) {
    checkString('proxyServer.urlTemplate', (c.proxyServer as Record<string, unknown>).urlTemplate)
  }

  // auth
  if (typeof c.auth !== 'object' || c.auth === null) {
    errors.push('auth: must be an object')
  } else {
    checkString('auth.jwtSignatureSecret', (c.auth as Record<string, unknown>).jwtSignatureSecret)
  }

  // redis (optional)
  if (c.redis !== undefined && c.redis !== false) {
    if (typeof c.redis !== 'object' || c.redis === null) {
      errors.push('redis: must be an object or false')
    } else {
      checkString('redis.url', (c.redis as Record<string, unknown>).url)
    }
  }

  return errors
}

export const assertConfig = (config: unknown): void => {
  const errors = validateConfig(config)
  if (errors.length > 0) {
    console.error('Invalid configuration:')
    for (const error of errors) {
      console.error(`  - ${error}`)
    }
    process.exit(1)
  }
}

export const loadAndAssertConfig = (devConfDir: string): void => {
  if (isSea()) {
    const configPath = join(TUNLI_DIR, 'server.json')
    if (!existsSync(configPath)) {
      console.error(`Config file not found: ${configPath}`)
      console.error(`Create it before starting the server.`)
      process.exit(1)
    }
    loadConfig(TUNLI_DIR, ['server.json'])
  } else {
    loadConfig(devConfDir, ['.env.json'])
  }
  assertConfig(config)
}
