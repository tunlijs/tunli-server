/**
 * Counts events over a sliding window using one bucket per second.
 */
export class RateCounter {
  readonly #buckets: number[]
  readonly #seconds: number[]
  readonly #now: () => number

  constructor(windowSeconds = 60, now: () => number = Date.now) {
    this.#buckets = new Array(windowSeconds).fill(0)
    this.#seconds = new Array(windowSeconds).fill(-1)
    this.#now = now
  }

  hit(by = 1): void {
    const second = Math.floor(this.#now() / 1000)
    const i = second % this.#buckets.length
    if (this.#seconds[i] !== second) {
      this.#seconds[i] = second
      this.#buckets[i] = 0
    }
    this.#buckets[i]! += by
  }

  /** Number of events within the window. */
  count(): number {
    const oldest = Math.floor(this.#now() / 1000) - this.#buckets.length + 1
    let sum = 0
    for (let i = 0; i < this.#buckets.length; i++) {
      if (this.#seconds[i]! >= oldest) sum += this.#buckets[i]!
    }
    return sum
  }
}
