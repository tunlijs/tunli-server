import {EventEmitter} from 'node:events'
import {createClient} from "redis";
import type {RedisInitOptions} from "./Client.js";
import {defaultOnErrorEvent} from "./utils.js";

type RedisClient = ReturnType<typeof createClient>
type RedisEventName = 'error' | 'ready' | 'end' | 'reconnecting'

export class Redis {

  readonly #client: RedisClient
  readonly #keyPrefix: string
  readonly #eventEmitter = new EventEmitter()
  #connectionPromise: Promise<unknown> | null = null

  constructor(client: RedisClient, options: Required<RedisInitOptions>) {
    client
      .on('error', (err: Error) => this.#eventEmitter.emit('error', err, this))
      .on('ready', () => this.#eventEmitter.emit('ready', this))
      .on('end', () => this.#eventEmitter.emit('end', this))
      .on('reconnecting', () => this.#eventEmitter.emit('reconnecting', this))

    this.#client = client
    this.#keyPrefix = `${options.keyPrefix}/${options.instanceName}/`
    this.#eventEmitter.on('error', defaultOnErrorEvent)
  }

  get client(): RedisClient {
    return this.#client
  }

  #createKey(key: string): string {
    return this.#keyPrefix + key
  }

  createKey(key: string): string {
    return this.#createKey(key)
  }

  async enforceConnection(): Promise<void> {
    return this.#enforceConnection()
  }

  async #enforceConnection(): Promise<void> {
    if (this.#client.isReady) return

    if (this.#client.isOpen) {
      await this.#connectionPromise
      return
    }

    this.#connectionPromise = this.#client.connect()
    await this.#connectionPromise
  }

  async del(key: string | string[]): Promise<number> {
    await this.#enforceConnection()
    const keys = (Array.isArray(key) ? key : [key]).map((k) => this.#createKey(k))
    if (!keys.length) return 0
    return this.#client.del(keys)
  }

  async set(key: string, value: unknown, ttl?: number): Promise<unknown> {
    await this.#enforceConnection()
    return this.#client.set(this.#createKey(key), JSON.stringify(value), ttl ? {EX: ttl} : {})
  }

  async get<T = unknown>(key: string): Promise<T | null> {
    await this.#enforceConnection()
    const value = await this.#client.get(this.#createKey(key))
    return value === null ? null : JSON.parse(value) as T
  }

  async mGet<T = unknown>(keys: string[]): Promise<(T | null)[]> {
    await this.#enforceConnection()
    const result = await this.#client.mGet(keys.map((k) => this.#createKey(k)))
    return result.map((x: string | null) => x === null ? null : JSON.parse(x) as T)
  }

  async hGet<T = unknown>(primaryKey: string, secondaryKey: string): Promise<T | null> {
    await this.#enforceConnection()
    const value = await this.#client.hGet(this.#createKey(primaryKey), secondaryKey)
    return value === null ? null : JSON.parse(value) as T
  }

  async hGetAll<T = unknown>(key: string): Promise<Record<string, T>> {
    await this.#enforceConnection()
    const raw = await this.#client.hGetAll(this.#createKey(key))
    return Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, JSON.parse(v as string) as T]))
  }

  async hSet(primaryKey: string, secondaryKey: string | Record<string, unknown>, value?: unknown): Promise<void> {
    await this.#enforceConnection()
    if (typeof secondaryKey === 'object') {
      const values = Object.fromEntries(Object.entries(secondaryKey).map(([k, v]) => [k, JSON.stringify(v)]))
      await this.#client.hSet(this.#createKey(primaryKey), values)
    } else {
      await this.#client.hSet(this.#createKey(primaryKey), secondaryKey, JSON.stringify(value))
    }
  }

  async hDel(primaryKey: string, secondaryKey: string | string[]): Promise<number> {
    await this.#enforceConnection()
    const keys = Array.isArray(secondaryKey) ? secondaryKey : [secondaryKey]
    if (!keys.length) return 0
    return this.#client.hDel(this.#createKey(primaryKey), keys)
  }

  async incr(key: string): Promise<number> {
    await this.#enforceConnection()
    return this.#client.incr(this.#createKey(key))
  }

  async incrBy(key: string, incrementValue: number): Promise<number> {
    await this.#enforceConnection()
    return this.#client.incrBy(this.#createKey(key), incrementValue)
  }

  on(eventName: RedisEventName, listener: (...args: unknown[]) => void): this {
    if (eventName === 'error') this.#eventEmitter.off('error', defaultOnErrorEvent)
    this.#eventEmitter.on(eventName, listener)
    return this
  }

  off(eventName: RedisEventName, listener: (...args: unknown[]) => void): this {
    this.#eventEmitter.off(eventName, listener)
    return this
  }

  once(eventName: RedisEventName, listener: (...args: unknown[]) => void): this {
    this.#eventEmitter.once(eventName, listener)
    return this
  }
}
