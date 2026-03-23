import type {Redis} from "./Redis.js";

export const defaultOnErrorEvent = (err: Error, _redis: Redis): void => {
  console.error('Redis Client Error', err)
}
