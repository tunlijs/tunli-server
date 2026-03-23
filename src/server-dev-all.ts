import {spawn} from 'child_process'

const servers = [
  'src/server-socket.ts',
  'src/server-proxy.ts',
  'src/server-api.ts',
  'src/server-router.ts',
]

for (const entry of servers) {
  const proc = spawn('npx', ['tsx', '--watch', entry], {stdio: 'inherit'})
  proc.on('exit', (code) => console.log(`[${entry}] exited with code ${code}`))
}
