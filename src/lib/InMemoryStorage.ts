import type {TokenStorage} from "#types/types";

type Entry = {
  value: unknown
  expiresAt: number | null
}

export class InMemoryStorage implements TokenStorage {
  readonly #store = new Map<string, Entry>()

  get<T = unknown>(key: string): Promise<T | null> {
    const entry = this.#store.get(key)
    if (!entry) return Promise.resolve(null)
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.#store.delete(key)
      return Promise.resolve(null)
    }
    return Promise.resolve(entry.value as T)
  }

  set(key: string, value: unknown, ttl?: number): Promise<unknown> {
    this.#store.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : null,
    })
    return Promise.resolve()
  }
}
