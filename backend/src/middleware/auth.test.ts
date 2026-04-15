import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import { Hono } from 'hono'
import jwt from 'jsonwebtoken'
import { requireAuth, type AppVariables } from './auth.js'

const SECRET = 'test-secret'

function buildApp() {
  const app = new Hono<{ Variables: AppVariables }>()
  app.use('*', requireAuth)
  app.get('/ping', (c) => c.json(c.get('jwtPayload')))
  return app
}

describe('requireAuth', () => {
  beforeEach(() => {
    process.env.JWT_SECRET = SECRET
  })

  afterEach(() => {
    delete process.env.JWT_SECRET
  })

  it('returns 401 when Authorization header is missing', async () => {
    const res = await buildApp().request('/ping')
    expect(res.status).toBe(401)
  })

  it('returns 401 when scheme is not Bearer', async () => {
    const res = await buildApp().request('/ping', {
      headers: { Authorization: 'Basic sometoken' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 for an invalid (non-JWT) token', async () => {
    const res = await buildApp().request('/ping', {
      headers: { Authorization: 'Bearer not-a-valid-jwt' },
    })
    expect(res.status).toBe(401)
  })

  it('returns 401 when token is signed with the wrong secret', async () => {
    const token = jwt.sign({ sub: 1, georide_user_id: 42 }, 'wrong-secret')
    const res = await buildApp().request('/ping', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(401)
  })

  it('returns 500 when JWT_SECRET is not configured', async () => {
    delete process.env.JWT_SECRET
    const token = jwt.sign({ sub: 1, georide_user_id: 42 }, SECRET)
    const res = await buildApp().request('/ping', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(500)
  })

  it('returns 200 and forwards the JWT payload for a valid token', async () => {
    const payload = { sub: 7, georide_user_id: 99 }
    const token = jwt.sign(payload, SECRET)
    const res = await buildApp().request('/ping', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json() as Record<string, unknown>
    expect(body.sub).toBe(7)
    expect(body.georide_user_id).toBe(99)
  })
})
