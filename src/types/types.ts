export type ServerConfig = {
  port: number
  host: string
}

export type ApiConfig = ServerConfig

export type SocketServerConfig = ServerConfig & {
  capturePath: string
  publicUrl: string
  connectionPoolSize?: number
}

export type ProxyServerConfig = ServerConfig & {
  urlTemplate: string
}

export interface TokenStorage {
  get<T = unknown>(key: string): Promise<T | null>
  set(key: string, value: unknown, ttl?: number): Promise<unknown>
}

export type UpgradeHandler = (req: import('http').IncomingMessage, socket: import('stream').Duplex, head: Buffer) => void

export type AppConfig = {
  log: { file: string; stdout?: boolean }
  server: ServerConfig | false
  apiServer: ApiConfig
  socketServer: SocketServerConfig
  proxyServer: ProxyServerConfig
  auth: {
    jwtSignatureSecret: string
    minClientVersion?: string
  }
  redis?: { url: string } | false
}
