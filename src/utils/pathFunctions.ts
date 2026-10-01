import {homedir} from 'os'
import {isAbsolute, join, resolve} from 'path'

/**
 * Resolves a path from the config file: expands a leading `~` to the home
 * directory and resolves relative paths against baseDir (the config directory).
 */
export const resolveConfigPath = (path: string, baseDir: string): string => {
  if (path === '~') return homedir()
  if (path.startsWith('~/')) return join(homedir(), path.slice(2))
  return isAbsolute(path) ? path : resolve(baseDir, path)
}
