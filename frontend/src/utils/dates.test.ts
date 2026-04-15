import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { dateRangeForPeriod, previousPeriodRange, PERIOD_LABELS } from './dates'

// Fixed instant: 2026-04-15 12:00 UTC.
// Tests rely on UTC (TZ=UTC) so local and UTC components match.
const FIXED_NOW = new Date('2026-04-15T12:00:00.000Z')

describe('dateRangeForPeriod', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('week: from 6 days ago (inclusive) to end of today', () => {
    const { from, to } = dateRangeForPeriod('week')
    expect(from).toBe('2026-04-09T00:00:00.000Z')
    expect(to).toBe('2026-04-15T23:59:59.999Z')
  })

  it('month: from first day of current month to end of today', () => {
    const { from, to } = dateRangeForPeriod('month')
    expect(from).toBe('2026-04-01T00:00:00.000Z')
    expect(to).toBe('2026-04-15T23:59:59.999Z')
  })

  it('year: from Jan 1 of current year to end of today', () => {
    const { from, to } = dateRangeForPeriod('year')
    expect(from).toBe('2026-01-01T00:00:00.000Z')
    expect(to).toBe('2026-04-15T23:59:59.999Z')
  })
})

describe('previousPeriodRange', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(FIXED_NOW)
  })
  afterEach(() => vi.useRealTimers())

  it('week: the 7-day window ending 7 days before now', () => {
    const { from, to } = previousPeriodRange('week')
    expect(from).toBe('2026-04-02T00:00:00.000Z') // now - 13 days
    expect(to).toBe('2026-04-08T23:59:59.999Z')   // now - 7 days
  })

  it('month: the full previous calendar month', () => {
    const { from, to } = previousPeriodRange('month')
    expect(from).toBe('2026-03-01T00:00:00.000Z')
    expect(to).toBe('2026-03-31T23:59:59.999Z')
  })

  it('year: the full previous calendar year', () => {
    const { from, to } = previousPeriodRange('year')
    expect(from).toBe('2025-01-01T00:00:00.000Z')
    expect(to).toBe('2025-12-31T23:59:59.999Z')
  })
})

describe('PERIOD_LABELS', () => {
  it('has labels for all 4 period keys', () => {
    expect(Object.keys(PERIOD_LABELS)).toHaveLength(4)
    expect(PERIOD_LABELS).toHaveProperty('week')
    expect(PERIOD_LABELS).toHaveProperty('month')
    expect(PERIOD_LABELS).toHaveProperty('year')
    expect(PERIOD_LABELS).toHaveProperty('custom')
  })

  it('each label is a non-empty string', () => {
    for (const label of Object.values(PERIOD_LABELS)) {
      expect(typeof label).toBe('string')
      expect(label.length).toBeGreaterThan(0)
    }
  })
})
