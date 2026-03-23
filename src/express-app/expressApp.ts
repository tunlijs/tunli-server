import express, {type Express} from 'express'

export type CreateAppOptions = {
  trustProxy: boolean | number | string | string[]
  strictRouting: boolean
  queryParser: 'simple' | 'extended' | ((str: string) => Record<string, unknown>)
}

export const createApp = (options?: CreateAppOptions): Express => {
  const app = express()
  app.disable('x-powered-by')
  app.set('trust proxy', options?.trustProxy ?? 1)
  app.set('case sensitive routing', true)
  app.set('strict routing', options?.strictRouting ?? true)
  app.set('query parser', options?.queryParser ?? 'simple')

  return app
}
