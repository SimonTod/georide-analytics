import type { TripMetadata, TripTag, RouteRule } from '../types/georide'

const BASE_URL = '/api'

function getToken(): string {
  const token = localStorage.getItem('app_token')
  if (!token) throw new Error('App token not found in localStorage')
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
    throw new Error(`Backend API error ${res.status}: ${text}`)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export async function authenticateWithBackend(georideToken: string): Promise<string> {
  const res = await fetch(`${BASE_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ georide_token: georideToken }),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText)
    throw new Error(`Backend auth failed (${res.status}): ${text}`)
  }
  const { token } = await res.json() as { token: string }
  return token
}

export function getAllMetadata(): Promise<TripMetadata[]> {
  return request<TripMetadata[]>('/trips')
}

export function getTripMetadata(tripId: number): Promise<TripMetadata | null> {
  return request<TripMetadata | null>(`/trips/${tripId}`)
}

// Always send both fields — null clears, non-null sets.
export function upsertTripMetadata(
  tripId: number,
  data: { tag: TripTag | null; note: string | null }
): Promise<TripMetadata> {
  return request<TripMetadata>(`/trips/${tripId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  })
}

export function deleteTripMetadata(tripId: number): Promise<void> {
  return request<void>(`/trips/${tripId}`, { method: 'DELETE' })
}

export function bulkAutoTag(
  tripIds: number[],
  tag: TripTag
): Promise<{ applied: number }> {
  return request<{ applied: number }>('/trips/auto-tag', {
    method: 'POST',
    body: JSON.stringify({ trip_ids: tripIds, tag }),
  })
}

export function getRouteRules(): Promise<RouteRule[]> {
  return request<RouteRule[]>('/route-rules')
}

export function upsertRouteRule(routeKey: string, tag: TripTag): Promise<RouteRule> {
  return request<RouteRule>(`/route-rules/${encodeURIComponent(routeKey)}`, {
    method: 'PUT',
    body: JSON.stringify({ tag }),
  })
}

export function deleteRouteRule(routeKey: string): Promise<void> {
  return request<void>(`/route-rules/${encodeURIComponent(routeKey)}`, { method: 'DELETE' })
}
