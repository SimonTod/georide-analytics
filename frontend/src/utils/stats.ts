import type { GeoRideTrackerTrip, GeoRideTrackerPosition } from '../types/georide'
import { mToKm } from '../api/georide'
import type { Period } from './dates'

export type TripStats = {
  totalKm: number
  tripCount: number
  avgSpeedKmh: number
  maxSpeedKmh: number
  totalDurationSec: number
}

export type MonthlyKm = {
  month: string
  km: number
}

export type SpeedBucket = {
  range: string
  count: number
}

export type HourBucket = {
  hour: number
  label: string
  count: number
}

export type DayOfWeekBucket = {
  day: string
  count: number
  km: number
}

export type SpeedPoint = {
  label: string
  avgSpeed: number
  tripCount: number
}

export type StatsDelta = {
  totalKm: number | null
  tripCount: number | null
  avgSpeedKmh: number | null
  maxSpeedKmh: number | null
}

export type PersonalRecords = {
  longestTrip: GeoRideTrackerTrip | null
  fastestTrip: GeoRideTrackerTrip | null
  mostKmDay: { date: string; km: number } | null
}

export function computeStats(trips: GeoRideTrackerTrip[]): TripStats {
  if (trips.length === 0) {
    return { totalKm: 0, tripCount: 0, avgSpeedKmh: 0, maxSpeedKmh: 0, totalDurationSec: 0 }
  }
  const totalKm = trips.reduce((s, t) => s + mToKm(t.distance), 0)
  const totalDurationSec = trips.reduce((s, t) => s + t.duration, 0)
  // Speeds are in km/h after normalization in the API client
  const avgSpeedKmh = Math.round(trips.reduce((s, t) => s + t.average_speed, 0) / trips.length * 10) / 10
  const maxSpeedKmh = Math.round(Math.max(...trips.map((t) => t.max_speed)) * 10) / 10
  return {
    totalKm: Math.round(totalKm * 10) / 10,
    tripCount: trips.length,
    avgSpeedKmh,
    maxSpeedKmh,
    totalDurationSec,
  }
}

export function computeStatsDelta(current: TripStats, previous: TripStats): StatsDelta {
  function pct(curr: number, prev: number): number | null {
    if (prev === 0) return null
    return Math.round((curr - prev) / prev * 100)
  }
  return {
    totalKm:    pct(current.totalKm,     previous.totalKm),
    tripCount:  pct(current.tripCount,   previous.tripCount),
    avgSpeedKmh: pct(current.avgSpeedKmh, previous.avgSpeedKmh),
    maxSpeedKmh: pct(current.maxSpeedKmh, previous.maxSpeedKmh),
  }
}

export function computeMonthlyKm(trips: GeoRideTrackerTrip[]): MonthlyKm[] {
  const map = new Map<string, number>()
  for (const trip of trips) {
    const d = new Date(trip.start_time)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    map.set(key, (map.get(key) ?? 0) + mToKm(trip.distance))
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, km]) => ({
      month: new Date(key + '-01').toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' }),
      km: Math.round(km * 10) / 10,
    }))
}

const SPEED_BUCKETS = [
  { min: 0,   max: 30  },
  { min: 30,  max: 50  },
  { min: 50,  max: 80  },
  { min: 80,  max: 100 },
  { min: 100, max: 120 },
  { min: 120, max: 150 },
  { min: 150, max: Infinity },
]

export function computeSpeedDistribution(trips: GeoRideTrackerTrip[]): SpeedBucket[] {
  return SPEED_BUCKETS.map(({ min, max }) => ({
    range: max === Infinity ? `>${min}` : `${min}-${max}`,
    // Speeds are already in km/h — no conversion needed
    count: trips.filter((t) => t.average_speed >= min && t.average_speed < max).length,
  }))
}

export function computeHourDistribution(trips: GeoRideTrackerTrip[]): HourBucket[] {
  const counts = new Array<number>(24).fill(0)
  for (const trip of trips) {
    counts[new Date(trip.start_time).getHours()]++
  }
  return counts.map((count, hour) => ({
    hour,
    label: `${String(hour).padStart(2, '0')}h`,
    count,
  }))
}

const DAY_NAMES = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam']

export function computeDayOfWeekDistribution(trips: GeoRideTrackerTrip[]): DayOfWeekBucket[] {
  const buckets = Array.from({ length: 7 }, (_, i) => ({ day: DAY_NAMES[i], count: 0, km: 0 }))
  for (const trip of trips) {
    const d = new Date(trip.start_time).getDay() // local day-of-week
    buckets[d].count++
    buckets[d].km = Math.round((buckets[d].km + mToKm(trip.distance)) * 10) / 10
  }
  // Reorder Mon→Sun (index 1..6, then 0)
  return [...buckets.slice(1), buckets[0]]
}

export function computeSpeedEvolution(
  trips: GeoRideTrackerTrip[],
  period: Period
): SpeedPoint[] {
  // For custom ranges, pick granularity from the actual trip span
  let granularity: 'week' | 'month' | 'year'
  if (period === 'custom') {
    if (trips.length < 2) {
      granularity = 'week'
    } else {
      const times = trips.map((t) => new Date(t.start_time).getTime())
      const spanDays = (Math.max(...times) - Math.min(...times)) / 86_400_000
      granularity = spanDays <= 14 ? 'week' : spanDays <= 90 ? 'month' : 'year'
    }
  } else {
    granularity = period
  }

  const map = new Map<string, { speeds: number[]; label: string }>()

  for (const trip of trips) {
    const d = new Date(trip.start_time)
    let key: string
    let label: string

    if (granularity === 'week') {
      key = d.toISOString().slice(0, 10)
      label = d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' })
    } else if (granularity === 'month') {
      const weekOfMonth = Math.ceil(d.getDate() / 7)
      key = `${d.getFullYear()}-${d.getMonth()}-W${weekOfMonth}`
      label = `Sem. ${weekOfMonth}`
    } else {
      key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      label = d.toLocaleDateString('fr-FR', { month: 'short' })
    }

    if (!map.has(key)) map.set(key, { speeds: [], label })
    map.get(key)!.speeds.push(trip.average_speed)
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, { speeds, label }]) => ({
      label,
      avgSpeed: Math.round(speeds.reduce((s, v) => s + v, 0) / speeds.length * 10) / 10,
      tripCount: speeds.length,
    }))
}

export function computePersonalRecords(trips: GeoRideTrackerTrip[]): PersonalRecords {
  if (trips.length === 0) return { longestTrip: null, fastestTrip: null, mostKmDay: null }

  const longestTrip = trips.reduce((best, t) => (t.distance > best.distance ? t : best))
  const fastestTrip = trips.reduce((best, t) => (t.max_speed > best.max_speed ? t : best))

  const byDay = new Map<string, number>()
  for (const trip of trips) {
    const day = new Date(trip.start_time).toLocaleDateString('fr-FR')
    byDay.set(day, (byDay.get(day) ?? 0) + mToKm(trip.distance))
  }
  const [date, km] = Array.from(byDay.entries()).reduce(
    (best, entry) => (entry[1] > best[1] ? entry : best)
  )

  return {
    longestTrip,
    fastestTrip,
    mostKmDay: { date, km: Math.round(km * 10) / 10 },
  }
}

export function groupPositionsByTrip(
  positions: GeoRideTrackerPosition[],
  trips: GeoRideTrackerTrip[]
): Array<[number, GeoRideTrackerPosition[]]> {
  return trips.map((trip) => {
    const pts = positions
      .filter((p) => p.fixtime >= trip.start_time && p.fixtime <= trip.end_time)
      .sort((a, b) => a.fixtime.localeCompare(b.fixtime))
    return [trip.trip_id, pts]
  })
}

export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}
