import { describe, it, expect, vi } from 'vitest'

vi.mock('../api/georide', () => ({
  mToKm: (m: number) => m / 1000,
}))

import { computeStats, formatDuration } from './stats'
import type { GeoRideTrackerTrip } from '../types/georide'

function makeTrip(overrides: Partial<GeoRideTrackerTrip>): GeoRideTrackerTrip {
  return {
    trip_id: 1,
    tracker_id: 1,
    distance: 10000,
    duration: 600,
    average_speed: 60,
    max_speed: 80,
    start_time: '2026-01-01T08:00:00Z',
    end_time: '2026-01-01T08:10:00Z',
    start_lat: 48.857,
    start_lon: 2.352,
    end_lat: 43.297,
    end_lon: 5.381,
    start_address: '',
    end_address: '',
    ...overrides,
  }
}

describe('formatDuration', () => {
  it('formats 0 seconds as 0m', () => {
    expect(formatDuration(0)).toBe('0m')
  })

  it('formats values under 1 hour as minutes only', () => {
    expect(formatDuration(600)).toBe('10m')
    expect(formatDuration(3540)).toBe('59m')
  })

  it('formats exactly 1 hour', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
  })

  it('formats values over 1 hour with hours and minutes', () => {
    expect(formatDuration(5400)).toBe('1h 30m')
    expect(formatDuration(7325)).toBe('2h 2m')
  })
})

describe('computeStats', () => {
  it('returns all zeroes for an empty array', () => {
    expect(computeStats([])).toEqual({
      totalKm: 0,
      tripCount: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      totalDurationSec: 0,
    })
  })

  it('computes totalKm by converting meters via mToKm', () => {
    const trips = [makeTrip({ distance: 20000 }), makeTrip({ distance: 30000 })]
    expect(computeStats(trips).totalKm).toBe(50)
  })

  it('counts trips correctly', () => {
    const trips = [makeTrip({}), makeTrip({ trip_id: 2 }), makeTrip({ trip_id: 3 })]
    expect(computeStats(trips).tripCount).toBe(3)
  })

  it('averages speed across trips', () => {
    const trips = [makeTrip({ average_speed: 60 }), makeTrip({ average_speed: 70 })]
    expect(computeStats(trips).avgSpeedKmh).toBe(65)
  })

  it('picks the highest max_speed', () => {
    const trips = [makeTrip({ max_speed: 80 }), makeTrip({ max_speed: 120 }), makeTrip({ max_speed: 95 })]
    expect(computeStats(trips).maxSpeedKmh).toBe(120)
  })

  it('sums duration in seconds', () => {
    const trips = [makeTrip({ duration: 1200 }), makeTrip({ duration: 1800 })]
    expect(computeStats(trips).totalDurationSec).toBe(3000)
  })
})
