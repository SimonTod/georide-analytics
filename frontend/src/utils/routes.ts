/**
 * Coordinate bucketing for route grouping.
 * 3 decimal places ≈ 110 m precision — enough to match the same route
 * while tolerating minor GPS variance.
 */
export function bucketCoord(v: number): number {
  return Math.round(v * 1_000) / 1_000
}

/**
 * Build a stable route key from a trip's start/end coordinates.
 * Returns null when any coordinate is missing.
 */
export function tripRouteKey(trip: {
  start_lat?: number | null
  start_lon?: number | null
  end_lat?: number | null
  end_lon?: number | null
}): string | null {
  const { start_lat: sLat, start_lon: sLon, end_lat: eLat, end_lon: eLon } = trip
  if (sLat == null || sLon == null || eLat == null || eLon == null) return null
  return `${bucketCoord(sLat)},${bucketCoord(sLon)}||${bucketCoord(eLat)},${bucketCoord(eLon)}`
}
