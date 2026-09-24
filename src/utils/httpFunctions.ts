import type {IncomingHttpHeaders, IncomingMessage} from "http";

export const createSocketHttpHeader = (line: string, headers: Record<string, string | string[]>): string => {
  return Object.keys(headers)
    .reduce<string[]>((head, key) => {
      const value = headers[key]
      if (!Array.isArray(value)) {
        head.push(`${key}: ${value}`)
        return head
      }
      for (const v of value) {
        head.push(`${key}: ${v}`)
      }
      return head
    }, [line])
    .join('\r\n') + '\r\n\r\n'
}

const parseHost = (host: string) => new URL(`http://${host}`)

/**
 * Normalizes a client-supplied target host to a bare, lowercase hostname
 * (no protocol, port or path). Returns undefined for invalid input.
 */
export const normalizeTargetHost = (val: unknown): string | undefined => {
  if (typeof val !== 'string' || !val.trim()) return undefined
  try {
    const raw = val.trim()
    return new URL(raw.includes('://') ? raw : `http://${raw}`).hostname.toLowerCase() || undefined
  } catch {
    return undefined
  }
}

/**
 * Rewrites an absolute Location header to the public tunnel host.
 * If targetHost is known, only redirects pointing to the tunnel's local target
 * are rewritten — redirects to foreign domains are left untouched.
 */
export const rewriteLocation = (headers: IncomingHttpHeaders, host: string, proto: string, targetHost?: string): void => {
  const value = headers['location']
  if (!value) return
  try {
    const url = new URL(value)
    if (targetHost && url.hostname.toLowerCase() !== targetHost) return
    const parsed = parseHost(host)
    url.hostname = parsed.hostname
    url.port = parsed.port
    url.protocol = proto + ':'
    headers['location'] = url.toString()
  } catch { /* not a full URL, leave as-is */
  }
}

export const rewriteAccessControlAllowOrigin = (headers: IncomingHttpHeaders, host: string, proto: string): void => {
  const value = headers['access-control-allow-origin']
  if (!value || value === '*') return
  try {
    const url = new URL(value as string)
    const parsed = parseHost(host)
    url.hostname = parsed.hostname
    url.port = parsed.port
    url.protocol = proto + ':'
    headers['access-control-allow-origin'] = url.origin
  } catch { /* not a valid origin, leave as-is */
  }
}

export const extractProtocolFromRequest = (req: IncomingMessage) => {
  let proto = req.headers['x-forwarded-proto']
  if (Array.isArray(proto)) proto = proto[0]
  return proto?.split(',')[0]?.trim() ?? 'http'
}

export const rewriteSetCookieDomain = (headers: IncomingHttpHeaders, host: string): void => {
  const key = 'set-cookie'
  let value = headers[key]
  if (!value) return
  if (!Array.isArray(value)) {
    value = [value]
  }
  const rewrite = (cookie: string) => cookie.replace(/;\s*domain=[^;]*/gi, `; Domain=${host}`)
  headers[key] = value.map(rewrite)
}

export const getReqHeaders = (req: IncomingMessage & { isSpdy?: boolean }): Record<string, string | string[]> => {
  const encrypted = !!(req.isSpdy || (req.socket as any).encrypted || (req.socket as any).pair)
  const headers = {...req.headers} as Record<string, string | string[]>
  const url = new URL(`${encrypted ? 'https' : 'http'}://${req.headers.host}`)
  const forwardValues = {
    for: req.socket.remoteAddress ?? '',
    port: url.port || (encrypted ? '443' : '80'),
    proto: encrypted ? 'https' : 'http',
  }
  for (const key of ['for', 'port', 'proto'] as const) {
    const previousValue = req.headers[`x-forwarded-${key}`] ?? ''
    headers[`x-forwarded-${key}`] = `${previousValue}${previousValue ? ',' : ''}${forwardValues[key]}`
  }
  headers['x-forwarded-host'] = (req.headers['x-forwarded-host'] ?? req.headers.host ?? '') as string
  return headers
}
