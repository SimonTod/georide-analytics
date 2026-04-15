import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { pool } from '../db/index.js'
import { requireAuth, type AppVariables } from '../middleware/auth.js'

const VALID_TAGS = ['commute', 'leisure', 'sport', 'track', 'other'] as const
type Tag = typeof VALID_TAGS[number]

const app = new Hono<{ Variables: AppVariables }>()

app.use('*', requireAuth)

// GET /route-rules
app.get('/', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const result = await pool.query(
    'SELECT id, route_key, tag, created_at FROM route_rules WHERE user_id = $1 ORDER BY created_at DESC',
    [userId]
  )
  return c.json(result.rows)
})

// PUT /route-rules/:routeKey — upsert (routeKey is URL-encoded)
app.put('/:routeKey', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const routeKey = c.req.param('routeKey')   // Hono decodes automatically
  const body = await c.req.json<{ tag: string }>()

  if (!VALID_TAGS.includes(body.tag as Tag)) {
    throw new HTTPException(400, { message: `tag must be one of: ${VALID_TAGS.join(', ')}` })
  }

  const result = await pool.query(
    `INSERT INTO route_rules (user_id, route_key, tag)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, route_key) DO UPDATE
       SET tag = EXCLUDED.tag, updated_at = now()
     RETURNING id, route_key, tag, created_at`,
    [userId, routeKey, body.tag]
  )
  return c.json(result.rows[0])
})

// DELETE /route-rules/:routeKey
app.delete('/:routeKey', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const routeKey = c.req.param('routeKey')
  await pool.query(
    'DELETE FROM route_rules WHERE user_id = $1 AND route_key = $2',
    [userId, routeKey]
  )
  return c.body(null, 204)
})

export default app
