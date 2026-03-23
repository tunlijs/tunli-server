import {sha256} from "#utils/hashFunctions"
import {interpolate} from "@pfeiferio/string-interpolate"
import type {IncomingMessage} from "http";

type TunnelIdSource =
  | { isSubdomain: true; parts: [string, string] }
  | { isSubdomain: false; parts: [string, string]; path: string }

export type TunnelExtractResult = {
  match: boolean
  tunnelId?: string
  url: string
}

export function parseTunnelIdSource(baseUrl: string): (req: IncomingMessage) => TunnelExtractResult {
  if (!baseUrl) throw new Error('urlTemplate is not configured')

  const placeholder = sha256(crypto.randomUUID())

  let parsed: URL
  try {
    parsed = new URL(interpolate(baseUrl, {id: placeholder}), 'http://localhost')
  } catch {
    throw new Error(`Invalid urlTemplate: "${baseUrl}"`)
  }

  const isSubdomain = parsed.hostname.includes(placeholder)
  const parts = (isSubdomain ? parsed.hostname : parsed.pathname).split(placeholder)

  if (parts.length < 2) throw new Error(`urlTemplate does not contain an {{id}} placeholder: "${baseUrl}"`)
  if (parts.length > 2) throw new Error(`urlTemplate contains multiple {{id}} occurrences: "${baseUrl}"`)
  if (!isSubdomain && !parsed.pathname.endsWith('/')) throw new Error(`urlTemplate must end with '/' when {{id}} is in the path: "${baseUrl}"`)

  const source: TunnelIdSource = {
    isSubdomain,
    parts: parts as [string, string],
    path: parsed.pathname.replace(/\/$/, ''),
  }

  return (req: IncomingMessage): TunnelExtractResult => {
    const result = extractTunnelId(source, buildFullUrl(req))
    result.url = ((!source.isSubdomain && result.url) ? result.url : req.url) || '/'
    return result as TunnelExtractResult
  }
}

function extractTunnelId(source: TunnelIdSource, fullUrl: string):
  Omit<TunnelExtractResult, 'url'> & Partial<Pick<TunnelExtractResult, 'url'>> {

  const [before, after] = source.parts
  const uri = new URL(fullUrl)

  if (source.isSubdomain) {
    if (!uri.hostname.startsWith(before) || !uri.hostname.endsWith(after)) {
      return {match: false}
    }
    const tunnelId = uri.hostname.slice(before.length, after.length > 0 ? -after.length : undefined)
    return {match: !!tunnelId, tunnelId}
  }

  if (!uri.pathname.startsWith(before)) {
    return {match: false}
  }

  const segments = uri.pathname.slice(before.length).split(after, 2)

  if (segments.length !== 2 && after !== '/') {
    return {match: false}
  }

  const tunnelId = segments[0]!
  const remainingPath = '/' + uri.pathname.substring(before.length + tunnelId.length + after.length) + uri.search

  return {match: true, tunnelId, url: remainingPath || '/'}
}

const STANDARD_PORTS: Record<string, string> = {http: '80', https: '443'}

function buildFullUrl(req: IncomingMessage): string {
  const protocol = (req.headers['x-forwarded-proto'] as string) ?? 'http'
  const host = (req.headers['x-forwarded-host'] as string) ?? req.headers.host ?? 'localhost'
  const port = req.headers['x-forwarded-port'] as string | undefined

  const needsPort = port && port !== STANDARD_PORTS[protocol] && !host.includes(':')
  const fullHost = needsPort ? `${host}:${port}` : host

  return `${protocol}://${fullHost}${req.url ?? '/'}`
}
