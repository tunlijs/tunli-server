# Changelog

## [Unreleased]

### Added
- **CIDR-based IP filtering** — clients can pass `allowCidr` / `denyCidr` arrays on connect. Requests (HTTP and WebSocket upgrades) from IPs not matching the rules are blocked with 403. The tunnel socket receives a `client-blocked` event with the blocked IP.

### Changed
- `DaemonClient` and `DaemonServer` extracted into the shared `@tunli/daemon` package — daemon socket protocol, process lifecycle, and spawn logic are no longer duplicated per project
- `ChildLogger` now implements `LoggerInterface` from `@tunli/daemon`

---

## [0.3.0] - 2026-03-24

### Added
- **Share relay** — new `/share` Socket.IO namespace enabling private peer-to-peer tunnels (`tunli share` / `tunli connect`). The relay brokers binary data between host and client without inspection.
- `share-register` / `share-connect` — host registers with a public key, client connects by target public key
- `share-session-start` — signals the host to open its local TCP connection only when the client's TCP peer is ready (prevents premature connection failures)
- Bob's public key forwarded in `share-client` event for future allowlist support (Phase 2)

---

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
