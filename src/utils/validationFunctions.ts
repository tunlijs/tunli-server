const SHA256_REGEX = /^[0-9a-f]{64}$/

export const isSha256 = (val: unknown): val is string => {
  if (typeof val !== 'string') return false
  return SHA256_REGEX.test(val)
}
