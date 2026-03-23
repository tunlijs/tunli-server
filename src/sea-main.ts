// SEA (Single Executable Application) entry point.
// Bundled by esbuild into a single file.
// Mode is selected via env vars: TUNLI_SERVER_DAEMON=1 (daemon), TUNLI_SERVER_PROCESS=api|proxy|socket (server processes), otherwise CLI.

if (process.env.TUNLI_SERVER_DAEMON === '1') {
  await import('./daemon-main.js')
} else if (process.env.TUNLI_SERVER_PROCESS === 'router') {
  await import('./server-router.js')
} else if (process.env.TUNLI_SERVER_PROCESS === 'api') {
  await import('./server-api.js')
} else if (process.env.TUNLI_SERVER_PROCESS === 'proxy') {
  await import('./server-proxy.js')
} else if (process.env.TUNLI_SERVER_PROCESS === 'socket') {
  await import('./server-socket.js')
} else {
  await import('./cli.js')
}
