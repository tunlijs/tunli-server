import {SERVER_DAEMON_SOCKET_PATH} from '#lib/defs'
import type {DaemonRequest, DaemonResponse} from '#daemon/protocol'
import {DaemonClient, resolveDaemonFile} from '@tunli/daemon'

const DAEMON_MAIN_PATH = resolveDaemonFile(import.meta, '../daemon-main')

let _daemonClient: DaemonClient<DaemonRequest, DaemonResponse> | null = null

export function daemonClient(): DaemonClient<DaemonRequest, DaemonResponse> {
  return _daemonClient ??= new DaemonClient<DaemonRequest, DaemonResponse>(SERVER_DAEMON_SOCKET_PATH, DAEMON_MAIN_PATH, 'TUNLI_SERVER_DAEMON')
}
