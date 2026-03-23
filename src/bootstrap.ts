import {loadAndAssertConfig} from "#lib/validateConfig";
import {Logger} from "#lib/Logger";
import {join} from 'path'
import {config} from "#lib/Config";

loadAndAssertConfig(join(import.meta.dirname, '../conf.d'))
export const logger = new Logger(config.log.file ?? null, {
  minLevel: 'debug',
  stdout: config.log.stdout === true
})

export const serverLogger = logger.child('server')
export const apiLogger = logger.child('api')
export const proxyLogger = logger.child('proxy')
export const socketLogger = logger.child('socket')
