import type { TripTag } from '../types/georide'

/** Minimal shape required by analyzeGroupTags — EnrichedTrip satisfies this structurally. */
export type TaggableTrip = {
  trip_id: number
  metadata: { tag: TripTag | null } | null
}

export type TagAnalysis =
  | { kind: 'all-same'; tag: TripTag }
  | { kind: 'partial';  tag: TripTag; taggedCount: number; untaggedIds: number[] }
  | { kind: 'none';     allIds: number[] }
  | { kind: 'mixed';    counts: { tag: TripTag; count: number }[]; untaggedCount: number }

export function analyzeGroupTags(trips: TaggableTrip[]): TagAnalysis {
  const taggedTrips   = trips.filter((t) => t.metadata?.tag)
  const untaggedTrips = trips.filter((t) => !t.metadata?.tag)
  const tagSet        = new Set(taggedTrips.map((t) => t.metadata!.tag!))

  if (tagSet.size > 1) {
    const countMap = new Map<TripTag, number>()
    for (const t of taggedTrips) {
      const tag = t.metadata!.tag!
      countMap.set(tag, (countMap.get(tag) ?? 0) + 1)
    }
    return {
      kind:          'mixed',
      counts:        [...countMap.entries()].map(([tag, count]) => ({ tag, count })),
      untaggedCount: untaggedTrips.length,
    }
  }

  if (tagSet.size === 1) {
    const tag = [...tagSet][0]
    if (untaggedTrips.length === 0) return { kind: 'all-same', tag }
    return {
      kind:        'partial',
      tag,
      taggedCount: taggedTrips.length,
      untaggedIds: untaggedTrips.map((t) => t.trip_id),
    }
  }

  return { kind: 'none', allIds: trips.map((t) => t.trip_id) }
}
