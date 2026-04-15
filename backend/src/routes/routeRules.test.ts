import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import jwt from 'jsonwebtoken'

const SECRET = 'test-secret'
process.env.JWT_SECRET = SECRET

jest.unstable_mockModule('../db/index.js', () => ({
  pool: { query: jest.fn() },
}))

const { pool } = await import('../db/index.js')
const { default: app } = await import('./routeRules.js')

// jest.Mock<() => Promise<unknown>> ensures ResolveType<T> = unknown (not never)
const mockQuery = pool.query as unknown as jest.Mock<() => Promise<unknown>>

function authHeaders(sub = 1): Record<string, string> {
  const token = jwt.sign({ sub, georide_user_id: 42 }, SECRET)
  return { Authorization: `Bearer ${token}` }
}

describe('routeRules routes', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  // -------------------------------------------------------------------------
  // GET /
  // -------------------------------------------------------------------------
  describe('GET /', () => {
    it('returns all route rules for the user', async () => {
      const rows = [{ id: 1, route_key: '48.857,2.352||43.297,5.381', tag: 'commute' }]
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 })
      const res = await app.request('/', { headers: authHeaders() })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(rows)
    })
  })

  // -------------------------------------------------------------------------
  // PUT /:routeKey
  // -------------------------------------------------------------------------
  describe('PUT /:routeKey', () => {
    it('returns 400 for an invalid tag', async () => {
      const res = await app.request('/somekey', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'invalid' }),
      })
      expect(res.status).toBe(400)
    })

    it.each(['commute', 'leisure', 'sport', 'track', 'other'])(
      'accepts valid tag "%s"',
      async (tag) => {
        const row = { id: 1, route_key: 'somekey', tag }
        mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 })
        const res = await app.request('/somekey', {
          method: 'PUT',
          headers: { ...authHeaders(), 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag }),
        })
        expect(res.status).toBe(200)
      }
    )

    it('passes the URL-decoded routeKey to the DB', async () => {
      const routeKey = '48.857,2.352||43.297,5.381'
      const encoded = encodeURIComponent(routeKey)
      const row = { id: 1, route_key: routeKey, tag: 'commute' }
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 })

      const res = await app.request(`/${encoded}`, {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'commute' }),
      })
      expect(res.status).toBe(200)
      expect(mockQuery).toHaveBeenCalledWith(
        expect.any(String),
        expect.arrayContaining([routeKey])
      )
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /:routeKey
  // -------------------------------------------------------------------------
  describe('DELETE /:routeKey', () => {
    it('returns 204', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      const res = await app.request('/somekey', {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(res.status).toBe(204)
    })
  })

  // -------------------------------------------------------------------------
  // Auth guard
  // -------------------------------------------------------------------------
  it('returns 401 when no token is provided', async () => {
    const res = await app.request('/')
    expect(res.status).toBe(401)
  })
})
