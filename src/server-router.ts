import {createServer, request as httpRequest} from 'http'
import {connect} from 'net'
import {config} from '#lib/Config'
import {serverLogger} from '#bootstrap'

const getTarget = (host: string): { host: string; port: number } => {
  if (host.startsWith('api.')) return config.apiServer
  if (host.startsWith('relay.')) return config.socketServer
  return config.proxyServer
}

const server = createServer((req, res) => {
  const target = getTarget(req.headers.host ?? '')

  const proxy = httpRequest(
    {host: target.host, port: target.port, path: req.url, method: req.method, headers: req.headers},
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode!, proxyRes.headers)
      proxyRes.pipe(res)
    }
  )

  proxy.on('error', () => { res.writeHead(502); res.end() })
  req.pipe(proxy)
})

server.on('upgrade', (req, socket, head) => {
  const target = getTarget(req.headers.host ?? '')
  const conn = connect(target.port, target.host, () => {
    const headers = Object.entries(req.headers)
      .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
      .join('\r\n')
    conn.write(`${req.method} ${req.url} HTTP/${req.httpVersion}\r\n${headers}\r\n\r\n`)
    if (head.length > 0) conn.write(head)
    conn.pipe(socket)
    socket.pipe(conn)
  })
  conn.on('error', () => socket.destroy())
  socket.on('error', () => conn.destroy())
})

if (!config.server) process.exit(0)

const {port, host} = config.server

server.listen(port, host, () => {
  serverLogger.info(`Router listening on http://${host}:${port}`)
})

process.send?.('ready')
