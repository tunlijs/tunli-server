import fs from 'fs'
import path from 'path'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const LEVELS: Record<LogLevel, number> = {debug: 0, info: 1, warn: 2, error: 3}

export class Logger {
  readonly #stream: fs.WriteStream | null
  readonly #minLevel: number
  readonly #label: string
  readonly #stdout: boolean

  constructor(filePath: string | null, options?: {minLevel?: LogLevel, label?: string, stdout?: boolean}) {
    if (filePath) {
      fs.mkdirSync(path.dirname(filePath), {recursive: true})
      this.#stream = fs.createWriteStream(filePath, {flags: 'a'})
    } else {
      this.#stream = null
    }
    this.#minLevel = LEVELS[options?.minLevel ?? 'info']
    this.#label = options?.label ?? ''
    this.#stdout = options?.stdout ?? false
  }

  #write(level: LogLevel, args: unknown[]): void {
    if (LEVELS[level] < this.#minLevel) return
    const ts = new Date().toISOString()
    const label = this.#label ? ` [${this.#label}]` : ''
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')
    const line = `${ts} [${level.toUpperCase()}]${label} ${msg}\n`
    this.#stream?.write(line)
    if (this.#stdout) process.stdout.write(line)
  }

  debug(...args: unknown[]): void { this.#write('debug', args) }
  info(...args: unknown[]): void  { this.#write('info', args) }
  warn(...args: unknown[]): void  { this.#write('warn', args) }
  error(...args: unknown[]): void { this.#write('error', args) }

  child(label: string): ChildLogger {
    return new ChildLogger(this, label)
  }
}

export class ChildLogger {
  readonly #parent: Logger
  readonly #label: string

  constructor(parent: Logger, label: string) {
    this.#parent = parent
    this.#label = label
  }

  debug(...args: unknown[]): void { this.#parent.debug(`[${this.#label}]`, ...args) }
  info(...args: unknown[]): void  { this.#parent.info(`[${this.#label}]`, ...args) }
  warn(...args: unknown[]): void  { this.#parent.warn(`[${this.#label}]`, ...args) }
  error(...args: unknown[]): void { this.#parent.error(`[${this.#label}]`, ...args) }
}
