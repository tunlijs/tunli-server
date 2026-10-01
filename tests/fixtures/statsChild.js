// Child process used by stats.test.js: answers stats requests over IPC (or deliberately doesn't).
import {exposeStats, inc} from '../../dist/stats/metrics.js'

if (process.argv[2] !== 'silent') {
  inc('requestsTotal', 3)
  exposeStats()
}
process.send?.('ready')
setInterval(() => {}, 1000)
