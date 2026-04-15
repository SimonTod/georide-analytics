import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import jwt from 'jsonwebtoken'

const SECRET = 'test-secret'
process.env.JWT_SECRET = SECRET

jest.unstable_mockModule('../db/index.js', () => ({
  pool: { query: jest.fn() },
}))

const { pool } = await import('../db/index.js')
const { default: app } = await import('./metadata.js')

// jest.Mock<() => Promise<unknown>> ensures ResolveType<T> = unknown (not never)
const mockQuery = pool.query as unknown as jest.Mock<() => Promise<unknown>>

function authHeaders(sub = 1): Record<string, string> {
  const token = jwt.sign({ sub, georide_user_id: 42 }, SECRET)
  return { Authorization: `Bearer ${token}` }
}

describe('metadata routes', () => {
  beforeEach(() => {
    mockQuery.mockReset()
  })

  // -------------------------------------------------------------------------
  // POST /auto-tag
  // -------------------------------------------------------------------------
  describe('POST /auto-tag', () => {
    it('returns 400 for an invalid tag', async () => {
      const res = await app.request('/auto-tag', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: [1, 2], tag: 'invalid' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for empty trip_ids array', async () => {
      const res = await app.request('/auto-tag', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: [], tag: 'commute' }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 200 with the number of applied rows', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 3 })
      const res = await app.request('/auto-tag', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ trip_ids: [1, 2, 3], tag: 'commute' }),
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual({ applied: 3 })
    })
  })

  // -------------------------------------------------------------------------
  // GET /
  // -------------------------------------------------------------------------
  describe('GET /', () => {
    it('returns all metadata rows for the user', async () => {
      const rows = [{ georide_trip_id: 1, tag: 'commute', note: null }]
      mockQuery.mockResolvedValueOnce({ rows, rowCount: 1 })
      const res = await app.request('/', { headers: authHeaders() })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(rows)
    })
  })

  // -------------------------------------------------------------------------
  // GET /:tripId
  // -------------------------------------------------------------------------
  describe('GET /:tripId', () => {
    it('returns null when no metadata exists for the trip', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 })
      const res = await app.request('/42', { headers: authHeaders() })
      expect(res.status).toBe(200)
      expect(await res.json()).toBeNull()
    })

    it('returns the metadata row when found', async () => {
      const row = { georide_trip_id: 42, tag: 'leisure', note: 'nice ride' }
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 })
      const res = await app.request('/42', { headers: authHeaders() })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(row)
    })
  })

  // -------------------------------------------------------------------------
  // PUT /:tripId
  // -------------------------------------------------------------------------
  describe('PUT /:tripId', () => {
    it('returns 400 for an invalid tag value', async () => {
      const res = await app.request('/42', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'invalid' }),
      })
      expect(res.status).toBe(400)
    })

    it('accepts null tag (clears the field)', async () => {
      const row = { georide_trip_id: 42, tag: null, note: null }
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 })
      const res = await app.request('/42', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: null }),
      })
      expect(res.status).toBe(200)
    })

    it('upserts and returns the saved row', async () => {
      const row = { georide_trip_id: 42, tag: 'sport', note: 'fast ride' }
      mockQuery.mockResolvedValueOnce({ rows: [row], rowCount: 1 })
      const res = await app.request('/42', {
        method: 'PUT',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag: 'sport', note: 'fast ride' }),
      })
      expect(res.status).toBe(200)
      expect(await res.json()).toEqual(row)
    })
  })

  // -------------------------------------------------------------------------
  // DELETE /:tripId
  // -------------------------------------------------------------------------
  describe('DELETE /:tripId', () => {
    it('returns 204', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 })
      const res = await app.request('/42', {
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
