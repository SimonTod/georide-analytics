import { useState } from 'react'
import {
  ComposedChart, Line, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, ResponsiveContainer,
} from 'recharts'
import type { EnrichedTrip } from './TripRow'
import type { TripTag } from '../../types/georide'
import { formatDuration } from '../../utils/stats'
import { tripRouteKey } from '../../utils/routes'
import { TripMapPopup, MapPinIcon, formatCoord } from './TripMapPopup'
import TagBadge from './TagBadge'
import styles from './RouteComparison.module.css'

const ALL_TAGS: TripTag[] = ['commute', 'leisure', 'sport', 'track', 'other']

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
type RouteGroup = {
  key: string
  label: string
  coordLabel: string
  avgStartLat: number
  avgStartLon: number
  avgEndLat: number
  avgEndLon: number
  trips: EnrichedTrip[]
  distanceRange: { min: number; max: number }
}

type TagAnalysis =
  | { kind: 'all-same'; tag: TripTag }
  | { kind: 'partial';  tag: TripTag; taggedCount: number; untaggedIds: number[] }
  | { kind: 'none';     allIds: number[] }
  | { kind: 'mixed';    counts: { tag: TripTag; count: number }[]; untaggedCount: number }

function analyzeGroupTags(trips: EnrichedTrip[]): TagAnalysis {
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

// ---------------------------------------------------------------------------
// buildGroups
// ---------------------------------------------------------------------------
function buildGroups(trips: EnrichedTrip[]): RouteGroup[] {
  const map = new Map<string, EnrichedTrip[]>()

  for (const trip of trips) {
    const key = tripRouteKey(trip)
    if (!key) continue
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(trip)
  }

  return Array.from(map.entries())
    .filter(([, ts]) => ts.length >= 2)
    .map(([key, ts]) => {
      const sorted = [...ts].sort((a, b) => a.start_time.localeCompare(b.start_time))
      const avg = (vals: number[]) => vals.reduce((s, v) => s + v, 0) / vals.length

      const avgStartLat = avg(ts.map((t) => t.start_lat!))
      const avgStartLon = avg(ts.map((t) => t.start_lon!))
      const avgEndLat   = avg(ts.map((t) => t.end_lat!))
      const avgEndLon   = avg(ts.map((t) => t.end_lon!))

      const coordLabel = `${formatCoord(avgStartLat, avgStartLon)} → ${formatCoord(avgEndLat, avgEndLon)}`

      const sAddr = ts[0].start_address?.trim()
      const eAddr = ts[0].end_address?.trim()
      const label  = sAddr && eAddr && sAddr !== eAddr ? `${sAddr} → ${eAddr}` : coordLabel

      const distances = ts.map((t) => t.distance / 1000)
      return {
        key,
        label,
        coordLabel,
        avgStartLat,
        avgStartLon,
        avgEndLat,
        avgEndLon,
        trips: sorted,
        distanceRange: { min: Math.min(...distances), max: Math.max(...distances) },
      }
    })
    .sort((a, b) => b.trips.length - a.trips.length)
}

// ---------------------------------------------------------------------------
// Chart helpers
// ---------------------------------------------------------------------------
type ChartPoint = { label: string; durationMin: number; avgSpeed: number }

function toChartData(trips: EnrichedTrip[]): ChartPoint[] {
  return trips.map((t) => ({
    label: new Date(t.start_time).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: '2-digit',
    }),
    durationMin: Math.round(t.duration / 60),
    avgSpeed:    t.average_speed,
  }))
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
type Props = {
  trips: EnrichedTrip[]
  onBulkTag?: (tripIds: number[], tag: TripTag, routeKey: string, tripLabel: string) => void
}

export default function RouteComparison({ trips, onBulkTag }: Props) {
  const groups = buildGroups(trips)
  const [openKeys, setOpenKeys] = useState<Set<string>>(new Set())
  const [hoveredMap, setHoveredMap] = useState<{ rect: DOMRect; group: RouteGroup } | null>(null)

  if (groups.length === 0) return null

  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })
  }

  return (
    <section className={styles.section}>
      <h3 className={styles.heading}>Comparaison de routes</h3>

      <div className={styles.groups}>
        {groups.map((group) => {
          const isOpen   = openKeys.has(group.key)
          const analysis = analyzeGroupTags(group.trips)
          const showCoordSubtitle = group.label !== group.coordLabel
          const { min, max } = group.distanceRange
          const distStr = Math.abs(max - min) < 0.5
            ? `~${min.toFixed(0)} km`
            : `${min.toFixed(0)}–${max.toFixed(0)} km`

          // Whether to render the tag info/action row (below the header)
          const showTagRow =
            analysis.kind === 'mixed' ||
            (!!onBulkTag && (analysis.kind === 'partial' || analysis.kind === 'none'))

          return (
            <div key={group.key} className={styles.group}>
              {/*
                <div role="button"> so we can nest real <button>s
                (map icon, tag buttons) without HTML violations.
              */}
              <div
                className={styles.groupHeader}
                role="button"
                tabIndex={0}
                onClick={() => toggle(group.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') toggle(group.key)
                }}
              >
                <div className={styles.routeInfo}>
                  <span className={styles.routeLabel}>{group.label}</span>
                  {showCoordSubtitle && (
                    <span className={styles.routeCoords}>{group.coordLabel}</span>
                  )}
                </div>

                <div className={styles.routeMeta}>
                  {/* Subtle tag badge when all trips share the same tag */}
                  {analysis.kind === 'all-same' && (
                    <span
                      className={styles.tagBadgeWrapper}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <TagBadge tag={analysis.tag} size="sm" />
                    </span>
                  )}

                  {/* Map preview icon */}
                  <button
                    className={styles.mapBtn}
                    title="Aperçu carte"
                    onClick={(e) => e.stopPropagation()}
                    onMouseEnter={(e) => {
                      e.stopPropagation()
                      setHoveredMap({ rect: e.currentTarget.getBoundingClientRect(), group })
                    }}
                    onMouseLeave={() => setHoveredMap(null)}
                  >
                    <MapPinIcon />
                  </button>

                  <span className={styles.distBadge}>{distStr}</span>
                  <span className={styles.countBadge}>{group.trips.length} trajets</span>
                  <span className={styles.chevron}>{isOpen ? '▲' : '▼'}</span>
                </div>
              </div>

              {/* Tag action row — outside the toggle area */}
              {showTagRow && (
                <div className={styles.tagRow}>
                  {analysis.kind === 'partial' && (
                    <>
                      <span className={styles.tagRowInfo}>
                        <TagBadge tag={analysis.tag} size="sm" />
                        <span className={styles.tagRowText}>
                          {analysis.taggedCount}/{group.trips.length} tagués
                        </span>
                      </span>
                      <button
                        className={styles.tagRowBtn}
                        onClick={() => onBulkTag!(analysis.untaggedIds, analysis.tag, group.key, group.label)}
                      >
                        Appliquer aux {analysis.untaggedIds.length} non tagués
                      </button>
                    </>
                  )}

                  {analysis.kind === 'none' && (
                    <>
                      <span className={styles.tagRowText}>
                        Taguer les {group.trips.length} trajets&nbsp;:
                      </span>
                      <div className={styles.tagRowPicker}>
                        {ALL_TAGS.map((tag) => (
                          <button
                            key={tag}
                            className={styles.tagRowOption}
                            onClick={() => onBulkTag!(analysis.allIds, tag, group.key, group.label)}
                          >
                            <TagBadge tag={tag} size="sm" />
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {analysis.kind === 'mixed' && (
                    <>
                      {analysis.counts.map(({ tag, count }) => (
                        <span key={tag} className={styles.tagRowInfo}>
                          <TagBadge tag={tag} size="sm" />
                          <span className={styles.tagRowCount}>×{count}</span>
                        </span>
                      ))}
                      {analysis.untaggedCount > 0 && (
                        <span className={styles.tagRowText}>
                          · {analysis.untaggedCount} non tagué{analysis.untaggedCount > 1 ? 's' : ''}
                        </span>
                      )}
                    </>
                  )}
                </div>
              )}

              {isOpen && (
                <div className={styles.body}>
                  <ResponsiveContainer width="100%" height={230}>
                    <ComposedChart
                      data={toChartData(group.trips)}
                      margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left"  tick={{ fontSize: 11 }} unit=" min"  width={52} domain={['auto', 'auto']} />
                      <YAxis yAxisId="right" tick={{ fontSize: 11 }} unit=" km/h" width={60} domain={['auto', 'auto']} orientation="right" />
                      <Tooltip
                        formatter={(value: number, name: string) =>
                          name === 'Durée'
                            ? [`${value} min (${formatDuration(value * 60)})`, name]
                            : [`${value} km/h`, name]
                        }
                      />
                      <Legend />
                      <Line yAxisId="left"  type="monotone" dataKey="durationMin" name="Durée"        stroke="#4f46e5" strokeWidth={2} dot={{ r: 4, fill: '#4f46e5' }} activeDot={{ r: 6 }} />
                      <Line yAxisId="right" type="monotone" dataKey="avgSpeed"    name="Vitesse moy." stroke="#f97316" strokeWidth={2} dot={{ r: 4, fill: '#f97316' }} activeDot={{ r: 6 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {hoveredMap && (
        <TripMapPopup
          startLat={hoveredMap.group.avgStartLat}
          startLon={hoveredMap.group.avgStartLon}
          endLat={hoveredMap.group.avgEndLat}
          endLon={hoveredMap.group.avgEndLon}
          triggerRect={hoveredMap.rect}
        />
      )}
    </section>
  )
}
