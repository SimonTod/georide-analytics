import type { GeoRideTracker, GeoRideTrackerTrip, GeoRideTrackerPosition } from '../types/georide'

const BASE_URL = import.meta.env.VITE_GEORIDE_API_URL as string

function getToken(): string {
  const token = sessionStorage.getItem('georide_token')
  if (!token) throw new Error('GeoRide token not found in sessionStorage')
  return token
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...options?.headers,
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`GeoRide API error ${res.status}: ${text}`)
  }
  return res.json() as Promise<T>
}

export type LoginResult = { authToken: string; id: number; email: string }

export async function login(email: string, password: string): Promise<LoginResult> {
  const res = await fetch(`${BASE_URL}/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Login failed (${res.status}): ${text}`)
  }
  return res.json() as Promise<LoginResult>
}

export async function logout(): Promise<void> {
  await request('/user/logout', { method: 'POST' })
}

export async function getTrackers(): Promise<GeoRideTracker[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await request<any[]>('/user/trackers')
  console.debug('[GeoRide] raw trackers:', raw)
  // Normalize camelCase or snake_case fields from the API
  return raw.map((t) => ({
    tracker_id:                t.tracker_id                ?? t.trackerId,
    tracker_name:              t.tracker_name              ?? t.trackerName ?? t.name,
    latitude:                  t.latitude,
    longitude:                 t.longitude,
    speed:                     t.speed,
    moving:                    t.moving,
    is_locked:                 t.is_locked                 ?? t.isLocked,
    odometer:                  t.odometer,
    external_battery_voltage:  t.external_battery_voltage  ?? t.externalBatteryVoltage,
    model:                     t.model,
    version:                   t.version,
    role:                      t.role,
  }))
}

export async function getTrips(
  trackerId: number,
  from: string,
  to: string
): Promise<GeoRideTrackerTrip[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = await request<any[]>(
    `/tracker/${trackerId}/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
  // Normalize camelCase API response → our snake_case internal type
  // Speeds are in knots → convert to km/h. Duration is in milliseconds → seconds.
  return raw.map((t) => ({
    trip_id:       t.id          ?? t.trip_id,
    tracker_id:    t.trackerId   ?? t.tracker_id,
    average_speed: knotsToKmh(t.averageSpeed ?? t.average_speed),
    max_speed:     knotsToKmh(t.maxSpeed    ?? t.max_speed),
    distance:      t.distance,
    duration:      Math.round((t.duration ?? 0) / 1000), // ms → seconds
    start_time:    t.startTime   ?? t.start_time,
    end_time:      t.endTime     ?? t.end_time,
    start_lat:     t.startLat    ?? t.start_lat,
    start_lon:     t.startLon    ?? t.start_lon,
    end_lat:       t.endLat      ?? t.end_lat,
    end_lon:       t.endLon      ?? t.end_lon,
    start_address: t.startAddress ?? t.start_address,
    end_address:   t.endAddress  ?? t.end_address,
  }))
}

// The positions API uses ISO 8601 dates and rejects ranges longer than ~31 days.
// For longer periods we split into 28-day chunks and concatenate.
const POSITIONS_CHUNK_DAYS = 28

export type PositionsProgress = { loaded: number; total: number }

export async function getTripPositions(
  trackerId: number,
  from: string,
  to: string,
  onProgress?: (p: PositionsProgress) => void
): Promise<GeoRideTrackerPosition[]> {
  const fromDate = new Date(from)
  const toDate   = new Date(to)
  const diffDays = (toDate.getTime() - fromDate.getTime()) / 86_400_000

  if (diffDays <= POSITIONS_CHUNK_DAYS) {
    return fetchPositionsChunk(trackerId, from, to)
  }

  const total = Math.ceil(diffDays / POSITIONS_CHUNK_DAYS)
  const all: GeoRideTrackerPosition[] = []
  let cursor = new Date(fromDate)
  let loaded = 0

  while (cursor < toDate) {
    const chunkEnd = new Date(cursor)
    chunkEnd.setDate(chunkEnd.getDate() + POSITIONS_CHUNK_DAYS)
    if (chunkEnd > toDate) chunkEnd.setTime(toDate.getTime())

    const chunk = await fetchPositionsChunk(trackerId, cursor.toISOString(), chunkEnd.toISOString())
    all.push(...chunk)
    loaded++
    onProgress?.({ loaded, total })

    cursor = new Date(chunkEnd.getTime() + 1)

    // Pause between chunks — GeoRide rate limit is undocumented; 1 s is conservative
    if (cursor < toDate) await sleep(1_000)
  }

  return all
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// Backoff delays for 429 retries (ms). GeoRide sends no Retry-After header.
const RETRY_DELAYS = [10_000, 20_000, 40_000]

/** Fetch one chunk of positions.
 *  - 404 "NoPosition" → empty array (valid: no rides in that window)
 *  - 429 → exponential backoff, up to 3 retries (10 s / 20 s / 40 s)
 */
async function fetchPositionsChunk(
  trackerId: number,
  from: string,
  to: string,
  attempt = 0
): Promise<GeoRideTrackerPosition[]> {
  const f = encodeURIComponent(from)
  const t = encodeURIComponent(to)
  const res = await fetch(
    `${BASE_URL}/tracker/${trackerId}/trips/positions?from=${f}&to=${t}`,
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getToken()}`,
      },
    }
  )

  if (res.status === 404) return []   // no positions in this window

  if (res.status === 429 && attempt < RETRY_DELAYS.length) {
    await sleep(RETRY_DELAYS[attempt])
    return fetchPositionsChunk(trackerId, from, to, attempt + 1)
  }

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`GeoRide API error ${res.status}: ${text}`)
  }

  return res.json() as Promise<GeoRideTrackerPosition[]>
}

/** Convert knots to km/h, rounded to 1 decimal */
export function knotsToKmh(knots: number): number {
  return Math.round(knots * 1.852 * 10) / 10
}

/** Convert m/s to km/h, rounded to 1 decimal (used for position speed) */
export function msToKmh(ms: number): number {
  return Math.round(ms * 3.6 * 10) / 10
}

/** Convert meters to km, rounded to 2 decimals */
export function mToKm(m: number): number {
  return Math.round(m / 10) / 100
}

/** Format seconds as "Xh Ym" */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h === 0) return `${m}m`
  return `${h}h ${m}m`
}
