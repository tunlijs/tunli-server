import {resolve} from 'path'
import {homedir} from 'os'

export const SERVER_VERSION = '0.4.0'

export const DEF_TIME_YEAR_IN_SECONDS = 365 * 24 * 60 * 60

export const DEF_TIME_MONTHS_IN_SECONDS = 60 * 60 * 24 * 30

export const TUNLI_DIR = resolve(homedir(), '.tunli')
export const SERVER_DAEMON_SOCKET_PATH = resolve(TUNLI_DIR, 'server.sock')
