import {encodeBigInt, ensureCharset} from '@pfeiferio/custom-base'

const CHARSET = ensureCharset('0123456789abcdefghijklmnopqrstuvwxyz')
const TUNNEL_ID_LENGTH = 25

export const generateTunnelId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  const bigint = BigInt('0x' + Buffer.from(bytes).toString('hex'))
  return encodeBigInt(bigint, CHARSET).padStart(TUNNEL_ID_LENGTH, '0')
}

const TUNNEL_ID_REGEX = new RegExp(`^[0-9a-z]{${TUNNEL_ID_LENGTH}}$`)

export const isTunnelId = (val: unknown): val is string => {
  if (typeof val !== 'string') return false
  return TUNNEL_ID_REGEX.test(val)
}
