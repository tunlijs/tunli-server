# Roadmap

## v0.2.0

### Security
- **JWT expiration** — tokens currently only contain `iat`, no `exp`. Add `expiresIn` to `jwt.sign()` so tokens expire independently of storage TTL
- **Rate limiting** — `/api/v2/register` and `/api/v2/create-proxy` have no rate limiting and are open to abuse

### Reliability
- **Graceful shutdown** — `server-api`, `server-proxy` and `server-socket` have no SIGTERM/SIGINT handlers; open connections are dropped hard on kill
- **Router connection timeouts** — `server-router.ts` has no timeout handling for hung connections, which can accumulate over time

### Developer Experience
- **InMemoryStorage startup warning** — when `redis: false`, log a visible warning that all sessions will be lost on restart
