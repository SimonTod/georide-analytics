export type GeoRideTracker = {
  tracker_id: number
  tracker_name: string
  latitude: number
  longitude: number
  speed: number
  moving: boolean
  is_locked: boolean
  odometer: number // meters
  external_battery_voltage: number
  model: string
  version: string
  role: string
}

export type GeoRideTrackerTrip = {
  trip_id: number
  tracker_id: number
  average_speed: number // m/s
  max_speed: number     // m/s
  distance: number      // meters
  duration: number      // seconds
  start_time: string    // ISO
  end_time: string      // ISO
  start_lat: number
  start_lon: number
  end_lat: number
  end_lon: number
  start_address: string
  end_address: string
}

export type GeoRideTrackerPosition = {
  fixtime: string   // ISO
  latitude: number
  longitude: number
  altitude: number
  speed: number     // m/s
  address: string
}

export type TripTag = 'commute' | 'leisure' | 'sport' | 'track' | 'other'

export type TripMetadata = {
  georide_trip_id: number
  tag: TripTag | null
  note: string | null
  created_at: string
  updated_at: string
}

export type RouteRule = {
  id: number
  route_key: string
  tag: TripTag
  created_at: string
}
