import {createClient} from "redis";
import {Redis} from "./Redis.js";

export interface RedisInitOptions {
  /** @default 'default' */
  instanceName?: string
  /** @default 'redis://localhost:6379' */
  url?: string
  /** @default 'tunli' */
  keyPrefix?: string
}

const redisStack: Record<string, Redis> = {}

export const initRedis = (options: RedisInitOptions = {}): Redis => {
  const instanceName = options.instanceName ?? 'default'
  const url = options.url ?? 'redis://localhost:6379'
  const keyPrefix = options.keyPrefix ?? 'tunli'

  if (redisStack[instanceName]) {
    return redisStack[instanceName]
  }

  const client = createClient({url})
  redisStack[instanceName] = new Redis(client, {instanceName, url, keyPrefix})

  return redisStack[instanceName]
}

export const redis = (instanceName = 'default'): Redis => {
  if (!redisStack[instanceName]) {
    throw new Error(`Redis client for "${instanceName}" not initialized`)
  }
  return redisStack[instanceName]
}
