import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import { pool } from '../db/index.js'
import { requireAuth, type AppVariables } from '../middleware/auth.js'

const VALID_TAGS = ['commute', 'leisure', 'sport', 'track', 'other'] as const
type Tag = typeof VALID_TAGS[number]

const app = new Hono<{ Variables: AppVariables }>()

app.use('*', requireAuth)

// GET /trips/metadata — all metadata for the current user
app.get('/', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const result = await pool.query(
    `SELECT georide_trip_id, tag, note, created_at, updated_at
     FROM trip_metadata
     WHERE user_id = $1
     ORDER BY updated_at DESC`,
    [userId]
  )
  return c.json(result.rows)
})

// GET /trips/:tripId/metadata
app.get('/:tripId', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const tripId = Number(c.req.param('tripId'))
  if (!Number.isInteger(tripId)) throw new HTTPException(400, { message: 'Invalid trip id' })

  const result = await pool.query(
    `SELECT georide_trip_id, tag, note, created_at, updated_at
     FROM trip_metadata
     WHERE user_id = $1 AND georide_trip_id = $2`,
    [userId, tripId]
  )
  if (result.rowCount === 0) return c.json(null)
  return c.json(result.rows[0])
})

// PUT /trips/:tripId/metadata — upsert
app.put('/:tripId', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const tripId = Number(c.req.param('tripId'))
  if (!Number.isInteger(tripId)) throw new HTTPException(400, { message: 'Invalid trip id' })

  const body = await c.req.json<{ tag?: string; note?: string }>()

  if (body.tag !== undefined && !VALID_TAGS.includes(body.tag as Tag)) {
    throw new HTTPException(400, {
      message: `tag must be one of: ${VALID_TAGS.join(', ')}`,
    })
  }

  const result = await pool.query(
    `INSERT INTO trip_metadata (user_id, georide_trip_id, tag, note)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (user_id, georide_trip_id) DO UPDATE
       SET tag  = COALESCE(EXCLUDED.tag,  trip_metadata.tag),
           note = COALESCE(EXCLUDED.note, trip_metadata.note)
     RETURNING georide_trip_id, tag, note, created_at, updated_at`,
    [userId, tripId, body.tag ?? null, body.note ?? null]
  )
  return c.json(result.rows[0])
})

// DELETE /trips/:tripId/metadata
app.delete('/:tripId', async (c) => {
  const { sub: userId } = c.get('jwtPayload')
  const tripId = Number(c.req.param('tripId'))
  if (!Number.isInteger(tripId)) throw new HTTPException(400, { message: 'Invalid trip id' })

  await pool.query(
    'DELETE FROM trip_metadata WHERE user_id = $1 AND georide_trip_id = $2',
    [userId, tripId]
  )
  return c.body(null, 204)
})

export default app
