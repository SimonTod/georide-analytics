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

export function getTrackers(): Promise<GeoRideTracker[]> {
  return request<GeoRideTracker[]>('/user/trackers')
}

export function getTrips(
  trackerId: number,
  from: string,
  to: string
): Promise<GeoRideTrackerTrip[]> {
  return request<GeoRideTrackerTrip[]>(
    `/tracker/${trackerId}/trips?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
}

// date format: YYYYMMDDTHHmmSS
export function getTripPositions(
  trackerId: number,
  from: string,
  to: string
): Promise<GeoRideTrackerPosition[]> {
  return request<GeoRideTrackerPosition[]>(
    `/tracker/${trackerId}/trips/positions?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
  )
}

/** Convert m/s to km/h, rounded to 1 decimal */
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
