import {apiLogger} from '#bootstrap'
import {apiRouter} from "#routes/api";
import {applyMiddlewares} from "@pfeiferio/express-middlewares";
import {createApp} from "#express-app/expressApp";
import {config} from "#lib/Config";
import {initRedis, redis} from "#lib/Redis/Client";
import {InMemoryStorage} from "#lib/InMemoryStorage";
import type {TokenStorage} from "#types/types";

const storage: TokenStorage = config.redis
  ? (initRedis({url: config.redis.url}), redis())
  : new InMemoryStorage()

const app = createApp();

app.use(applyMiddlewares({
  csrf: false,
  gracefulShutdown: false,
  accessLog: {
    enabled: true,
    output: "stdout"
  }
}))
app.use(apiRouter(config, storage))

app.listen(config.apiServer.port, config.apiServer.host, () => {
  apiLogger.info(`Listening on http://${config.apiServer.host}:${config.apiServer.port}`)
})

process.send?.('ready');
