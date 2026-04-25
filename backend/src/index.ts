import 'dotenv/config'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import authRoute from './routes/auth.js'
import metadataRoute from './routes/metadata.js'
import routeRulesRoute from './routes/routeRules.js'

const app = new Hono()

app.use('*', logger())
app.use(
  '*',
  cors({
    origin: process.env.FRONTEND_URL ?? 'http://localhost:5173',
    allowHeaders: ['Content-Type', 'Authorization'],
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    credentials: true,
  })
)

app.route('/auth', authRoute)
app.route('/trips', metadataRoute)
app.route('/route-rules', routeRulesRoute)

app.get('/health', (c) => c.json({ status: 'ok' }))

const port = Number(process.env.PORT ?? 3001)
console.log(`Backend listening on http://[::]:${port}`)

serve({ fetch: app.fetch, port, hostname: '::' })

export default app
