import { createRequestHandler } from '@remix-run/express'
import express from 'express'
import path from 'path'
import payload from 'payload'
import dotenv from 'dotenv'
import invariant from 'tiny-invariant'
import compression from 'compression'
import morgan from 'morgan'

dotenv.config()

const viteDevServer =
  process.env.NODE_ENV === 'production'
    ? null
    : await import('vite').then(vite =>
        vite.createServer({
          server: { middlewareMode: true }
        })
      )

const app = express()
app.use(
  viteDevServer
    ? viteDevServer.middlewares
    : express.static(path.resolve(process.cwd(), '.build/client'))
)

const build = viteDevServer
  ? () => viteDevServer.ssrLoadModule('virtual:remix/server-build')
  : await import(path.resolve(process.cwd(), './build/server/index.js'))

invariant(process.env.PAYLOAD_SECRET, 'PAYLOAD_SECRET is required')

await payload.init({
  secret: process.env.PAYLOAD_SECRET,
  express: app
})

app.use(payload.authenticate)

// Express Server setup
app.use(compression())

app.use(express.static('public', { maxAge: '1h' }))

app.use(morgan('tiny'))

// and your app is "just a request handler"
app.all(
  '*',
  createRequestHandler({
    build,
    getLoadContext(req, res) {
      return {
        payload: req.payload,
        user: req?.user,
        res
      }
    }
  })
)

app.listen(3000, () => {
  console.log('App listening on http://localhost:3000')
})
