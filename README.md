# tunli-server

The server component of [tunli](https://github.com/tunlijs/tunli-server) — a self-hosted reverse tunnel that exposes local services to the public internet via a unique subdomain.

Clients connect over a persistent WebSocket connection. Incoming HTTP requests on their subdomain are forwarded through that connection to the local service and back.

---

## How it works

1. A client registers and receives an auth token
2. The client connects to the relay and claims a subdomain (e.g. `abc123.tunli.app`)
3. Incoming requests to that subdomain are forwarded to the client over the WebSocket connection
4. The client forwards them to the local service and sends the response back

---

## Requirements

- A domain with wildcard DNS (`*.yourdomain.com`)
- nginx for SSL termination
- Redis (optional — falls back to in-memory storage)

---

## Installation

Download the latest binary from the [releases page](../../releases) and place it somewhere in your `$PATH`.

```bash
curl -L https://github.com/tunlijs/tunli-server/releases/latest/download/tunli-linux.tar.gz | tar -xz -C /usr/local/bin
```

---

## Configuration

On first run, create `~/.tunli/server.json`:

```json
{
  "log": {
    "file": "~/.tunli/server-daemon.log"
  },
  "server": {
    "port": 10000,
    "host": "0.0.0.0"
  },
  "apiServer": {
    "port": 10001,
    "host": "0.0.0.0"
  },
  "proxyServer": {
    "port": 8082,
    "host": "0.0.0.0",
    "urlTemplate": "https://{{ id }}.yourdomain.com"
  },
  "socketServer": {
    "port": 10010,
    "host": "localhost",
    "capturePath": "/$tunnel_connection",
    "publicUrl": "https://relay.yourdomain.com"
  },
  "auth": {
    "jwtSignatureSecret": "<random secret>"
  },
  "redis": {
    "url": "redis://localhost:6379"
  }
}
```

Set `"redis": false` to use in-memory storage instead (not recommended for production).

Generate a secure JWT secret with:

```bash
# Node.js
node -e "console.log(require('crypto').randomBytes(64).toString('base64'))"

# OpenSSL
openssl rand -base64 64
```

Validate your config:

```bash
tunli-server checkconf
```

---

## Usage

```bash
tunli-server start     # Start the server daemon
tunli-server stop      # Stop the server daemon
tunli-server restart   # Restart the server daemon
tunli-server status    # Show daemon and process status
tunli-server logs      # Tail the daemon log
tunli-server checkconf # Validate the configuration
```

---

## nginx

See [`example/nginx.conf`](example/nginx.conf) for a working nginx configuration.

The built-in router (`config.server`) handles subdomain-based routing internally:
- `api.yourdomain.com` → API server
- `relay.yourdomain.com` → Socket relay
- `*.yourdomain.com` → Tunnel proxy

nginx only needs a single server block pointing to the router port.

> **Note:** The built-in router is intended for quick setup only and is not recommended for production. For production, set `"server": false` in your config and point nginx directly at each server's port (`apiServer`, `socketServer`, `proxyServer`).

---

## Client

See [tunli-client](https://github.com/tunlijs/tunli-client) for the client CLI.
