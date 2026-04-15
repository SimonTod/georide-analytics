import { describe, it, expect } from 'vitest'
import { bucketCoord, tripRouteKey } from './routes'

describe('bucketCoord', () => {
  it('rounds to 3 decimal places', () => {
    expect(bucketCoord(48.85678)).toBe(48.857)
    expect(bucketCoord(2.35208)).toBe(2.352)
    expect(bucketCoord(48.85641)).toBe(48.856)
  })

  it('returns 0 for 0', () => {
    expect(bucketCoord(0)).toBe(0)
  })

  it('handles negative values', () => {
    expect(bucketCoord(-1.23456)).toBe(-1.235)
    expect(bucketCoord(-0.00049)).toBe(-0)
  })
})

describe('tripRouteKey', () => {
  const full = { start_lat: 48.85678, start_lon: 2.35208, end_lat: 43.29652, end_lon: 5.38108 }

  it('returns a correctly formatted key for a complete trip', () => {
    expect(tripRouteKey(full)).toBe('48.857,2.352||43.297,5.381')
  })

  it('returns null when start_lat is null', () => {
    expect(tripRouteKey({ ...full, start_lat: null })).toBeNull()
  })

  it('returns null when start_lon is null', () => {
    expect(tripRouteKey({ ...full, start_lon: null })).toBeNull()
  })

  it('returns null when end_lat is null', () => {
    expect(tripRouteKey({ ...full, end_lat: null })).toBeNull()
  })

  it('returns null when end_lon is null', () => {
    expect(tripRouteKey({ ...full, end_lon: null })).toBeNull()
  })

  it('returns null when start_lat is undefined', () => {
    expect(tripRouteKey({ ...full, start_lat: undefined })).toBeNull()
  })

  it('groups nearby coordinates to the same key (GPS tolerance ≈110 m)', () => {
    // Two coords within ~50 m of each other should bucket identically
    const key1 = tripRouteKey({ start_lat: 48.85601, start_lon: 2.35201, end_lat: 43.29601, end_lon: 5.38101 })
    const key2 = tripRouteKey({ start_lat: 48.85649, start_lon: 2.35249, end_lat: 43.29649, end_lon: 5.38149 })
    expect(key1).toBe(key2)
  })

  it('distinguishes coordinates more than ~110 m apart', () => {
    const key1 = tripRouteKey({ start_lat: 48.856, start_lon: 2.352, end_lat: 43.296, end_lon: 5.381 })
    const key2 = tripRouteKey({ start_lat: 48.857, start_lon: 2.353, end_lat: 43.297, end_lon: 5.382 })
    expect(key1).not.toBe(key2)
  })
})
