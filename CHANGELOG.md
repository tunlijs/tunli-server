# Changelog

## [0.2.0] - 2026-03-23

### Added
- **Connection pool** — clients can now maintain multiple parallel Socket.IO connections per tunnel (default: 8). Requests are distributed across available connections using a round-robin strategy.
- `socketServer.connectionPoolSize` config option to control the pool size per tunnel
- `connectionPoolSize` field in the `/api/v2/connect-info` response so clients can read the expected pool size from the server

### Changed
- `TunnelSocketRegistry` now manages a pool of sockets per tunnel ID instead of a single connection
- Connecting with the same tunnel ID no longer returns an error — multiple connections are accepted up to the pool limit

---

## [0.1.0] - 2026-03-23

Initial release.
