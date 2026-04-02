import {ipV4, IPv4Network} from '@pfeiferio/ipv4'

export const normalizeCidrList = (val: unknown): IPv4Network[] => {
  if (!Array.isArray(val)) return []
  return val.map(v => {
    try {
      return ipV4(v).network()
    } catch {
      return null
    }
  }).filter(Boolean) as IPv4Network[]
}
