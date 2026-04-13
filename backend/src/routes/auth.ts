import { Hono } from 'hono'
import { HTTPException } from 'hono/http-exception'
import jwt from 'jsonwebtoken'
import { pool } from '../db/index.js'

const app = new Hono()

app.post('/', async (c) => {
  const body = await c.req.json<{ georide_token: string }>()
  const { georide_token } = body

  if (!georide_token || typeof georide_token !== 'string') {
    throw new HTTPException(400, { message: 'georide_token is required' })
  }

  const georideApiUrl = process.env.GEORIDE_API_URL ?? 'https://api.georide.com'

  // Verify the GeoRide token by calling GET /user — token is used ONCE and never stored
  let georideUser: { id: number; email: string }
  try {
    const res = await fetch(`${georideApiUrl}/user`, {
      headers: { Authorization: `Bearer ${georide_token}` },
    })
    if (!res.ok) {
      throw new HTTPException(401, { message: 'Invalid GeoRide token' })
    }
    georideUser = await res.json() as { id: number; email: string }
  } catch (err) {
    if (err instanceof HTTPException) throw err
    throw new HTTPException(502, { message: 'Could not reach GeoRide API' })
  }

  // Upsert user — we never store the GeoRide token
  const result = await pool.query<{ id: number }>(
    `INSERT INTO users (georide_user_id, email)
     VALUES ($1, $2)
     ON CONFLICT (georide_user_id) DO UPDATE SET email = EXCLUDED.email
     RETURNING id`,
    [georideUser.id, georideUser.email]
  )
  const userId = result.rows[0].id

  const secret = process.env.JWT_SECRET
  if (!secret) throw new HTTPException(500, { message: 'JWT_SECRET not configured' })

  const appToken = jwt.sign(
    { sub: userId, georide_user_id: georideUser.id },
    secret,
    { expiresIn: '30d', algorithm: 'HS256' }
  )

  return c.json({ token: appToken })
})

export default app
