import { useState, useEffect, useMemo, useRef } from 'react'
import { useTrackers } from '../hooks/useTrackers'
import { useTrips } from '../hooks/useTrips'
import { useMetadata, useUpsertMetadata, useBulkAutoTag } from '../hooks/useMetadata'
import { useRouteRules, useUpsertRouteRule } from '../hooks/useRouteRules'
import { dateRangeForPeriod, type Period, type DateRange } from '../utils/dates'
import { tripRouteKey } from '../utils/routes'
import TrackerSelector from '../components/dashboard/TrackerSelector'
import PeriodSelector from '../components/dashboard/PeriodSelector'
import TripRow, { type EnrichedTrip } from '../components/trips/TripRow'
import TagBadge from '../components/trips/TagBadge'
import RouteComparison from '../components/trips/RouteComparison'
import SuggestionModal from '../components/trips/SuggestionModal'
import type { TripTag } from '../types/georide'
import styles from './TripsPage.module.css'

const ALL_TAGS: TripTag[] = ['commute', 'leisure', 'sport', 'track', 'other']

type Suggestion = {
  routeKey: string
  tag: TripTag
  similarTripIds: number[]
  tripLabel: string
}

function defaultCustomRange() {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

export default function TripsPage() {
  const [period,      setPeriod]      = useState<Period>('month')
  const [customRange, setCustomRange] = useState(defaultCustomRange)
  const [trackerId,   setTrackerId]   = useState<number | null>(null)
  const [activeTag,   setActiveTag]   = useState<TripTag | 'all'>('all')
  const [suggestion,  setSuggestion]  = useState<Suggestion | null>(null)

  const { data: trackers, isLoading: loadingTrackers } = useTrackers()

  useEffect(() => {
    if (trackers && trackers.length > 0 && trackerId === null) {
      setTrackerId(trackers[0].tracker_id)
    }
  }, [trackers, trackerId])

  const { from, to }: DateRange = period === 'custom'
    ? {
        from: customRange.from ? `${customRange.from}T00:00:00.000Z` : '',
        to:   customRange.to   ? `${customRange.to}T23:59:59.999Z`   : '',
      }
    : dateRangeForPeriod(period)

  const { data: trips,      isLoading: loadingTrips,    error: tripsError } = useTrips(trackerId, from, to)
  const { data: metadata,   isLoading: loadingMetadata                     } = useMetadata()
  const { data: routeRules, isLoading: loadingRules                        } = useRouteRules()
  const upsert        = useUpsertMetadata()
  const bulkAutoTagMut = useBulkAutoTag()
  const upsertRule    = useUpsertRouteRule()

  // Merge trips + metadata, sort newest first
  const enrichedTrips = useMemo<EnrichedTrip[]>(() => {
    if (!trips) return []
    const metaMap = new Map((metadata ?? []).map((m) => [m.georide_trip_id, m]))
    return [...trips]
      .sort((a, b) => b.start_time.localeCompare(a.start_time))
      .map((t) => ({ ...t, metadata: metaMap.get(t.trip_id) ?? null }))
  }, [trips, metadata])

  // ─── Auto-tag on load ────────────────────────────────────────────────────
  // When trips + rules are both ready, auto-tag untagged trips that match a rule.
  // autoTaggedRef prevents re-triggering for trips already attempted this session.
  const autoTaggedRef = useRef(new Set<number>())

  useEffect(() => {
    if (loadingTrips || loadingMetadata || loadingRules) return
    if (!routeRules?.length || !enrichedTrips.length) return

    const rulesMap = new Map(routeRules.map((r) => [r.route_key, r.tag]))
    const grouped  = new Map<TripTag, number[]>()

    for (const trip of enrichedTrips) {
      const rk = tripRouteKey(trip)
      if (!rk) continue
      const ruleTag = rulesMap.get(rk)
      if (!ruleTag) continue
      // Mark as processed *before* the tag check so that trips already tagged
      // (or manually untagged later) are never re-touched by this effect.
      if (autoTaggedRef.current.has(trip.trip_id)) continue
      autoTaggedRef.current.add(trip.trip_id)
      if (trip.metadata?.tag) continue                        // already tagged — don't overwrite
      if (!grouped.has(ruleTag)) grouped.set(ruleTag, [])
      grouped.get(ruleTag)!.push(trip.trip_id)
    }

    for (const [tag, tripIds] of grouped) {
      bulkAutoTagMut.mutate({ tripIds, tag })
    }
  }, [enrichedTrips, routeRules, loadingTrips, loadingMetadata, loadingRules])

  // ─── Tag save handler (with suggestion detection) ────────────────────────
  function handleSave(tripId: number, tag: TripTag | null, note: string | null) {
    upsert.mutate({ tripId, tag, note }, {
      onSuccess: () => {
        if (!tag) {
          setSuggestion(null)
          return
        }
        const trip = enrichedTrips.find((t) => t.trip_id === tripId)
        if (!trip) return
        const rk = tripRouteKey(trip)
        if (!rk) return

        const similar = enrichedTrips.filter(
          (t) => t.trip_id !== tripId && tripRouteKey(t) === rk && t.metadata?.tag !== tag
        )
        if (similar.length === 0) return

        const label =
          trip.start_address && trip.end_address && trip.start_address !== trip.end_address
            ? `${trip.start_address} → ${trip.end_address}`
            : rk

        setSuggestion({
          routeKey: rk,
          tag,
          similarTripIds: similar.map((t) => t.trip_id),
          tripLabel: label,
        })
      },
    })
  }

  // ─── Suggestion actions ───────────────────────────────────────────────────
  function handleApplyToAll() {
    if (!suggestion) return
    bulkAutoTagMut.mutate(
      { tripIds: suggestion.similarTripIds, tag: suggestion.tag },
      { onSuccess: () => setSuggestion(null) }
    )
  }

  function handleCreateRule() {
    if (!suggestion) return
    upsertRule.mutate(
      { routeKey: suggestion.routeKey, tag: suggestion.tag },
      { onSuccess: () => setSuggestion(null) }
    )
  }

  // Does a route rule already exist for this route key?
  const hasExistingRule = suggestion
    ? (routeRules ?? []).some((r) => r.route_key === suggestion.routeKey)
    : false

  // ─── Derived state ────────────────────────────────────────────────────────
  const tagCounts = useMemo(() => {
    const counts: Partial<Record<TripTag, number>> = {}
    for (const t of enrichedTrips) {
      if (t.metadata?.tag) counts[t.metadata.tag] = (counts[t.metadata.tag] ?? 0) + 1
    }
    return counts
  }, [enrichedTrips])

  const filtered = activeTag === 'all'
    ? enrichedTrips
    : enrichedTrips.filter((t) => t.metadata?.tag === activeTag)

  const loading = loadingTrackers || loadingTrips || loadingMetadata
  const error   = tripsError

  return (
    <div className={styles.page}>

      {/* Toolbar */}
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Trajets</h2>
        <div className={styles.controls}>
          {trackers && (
            <TrackerSelector trackers={trackers} value={trackerId} onChange={setTrackerId} />
          )}
          <PeriodSelector
            period={period}
            customFrom={customRange.from}
            customTo={customRange.to}
            onPeriodChange={setPeriod}
            onCustomChange={(f, t) => setCustomRange({ from: f, to: t })}
          />
        </div>
      </div>

      {/* Tag filter bar */}
      {enrichedTrips.length > 0 && (
        <div className={styles.filterBar}>
          <button
            className={`${styles.filterBtn} ${activeTag === 'all' ? styles.filterActive : ''}`}
            onClick={() => setActiveTag('all')}
          >
            Tous
            <span className={styles.filterCount}>{enrichedTrips.length}</span>
          </button>
          {ALL_TAGS.filter((tag) => (tagCounts[tag] ?? 0) > 0).map((tag) => (
            <button
              key={tag}
              className={`${styles.filterBtn} ${activeTag === tag ? styles.filterActive : ''}`}
              onClick={() => setActiveTag(tag)}
            >
              <TagBadge tag={tag} size="sm" />
              <span className={styles.filterCount}>{tagCounts[tag]}</span>
            </button>
          ))}
        </div>
      )}

      {/* States */}
      {error && (
        <div className={styles.error}>Erreur : {(error as Error).message}</div>
      )}
      {loading && <div className={styles.loading}>Chargement…</div>}
      {!loading && enrichedTrips.length === 0 && (
        <div className={styles.empty}>Aucun trajet sur cette période.</div>
      )}
      {!loading && enrichedTrips.length > 0 && filtered.length === 0 && (
        <div className={styles.empty}>Aucun trajet avec ce tag.</div>
      )}

      {/* Suggestion banner */}
      {suggestion && (
        <SuggestionModal
          tag={suggestion.tag}
          similarCount={suggestion.similarTripIds.length}
          tripLabel={suggestion.tripLabel}
          hasExistingRule={hasExistingRule}
          isApplying={bulkAutoTagMut.isPending}
          isCreatingRule={upsertRule.isPending}
          onApplyToAll={handleApplyToAll}
          onCreateRule={handleCreateRule}
          onDismiss={() => setSuggestion(null)}
        />
      )}

      {/* Trip list */}
      {filtered.length > 0 && (
        <div className={styles.list}>
          <div className={styles.listHeader}>
            <span>Date</span>
            <span>Distance / Durée</span>
            <span>Trajet</span>
            <span>Tag</span>
            <span>Note</span>
          </div>
          {filtered.map((trip) => (
            <TripRow
              key={trip.trip_id}
              trip={trip}
              isSaving={upsert.isPending && upsert.variables?.tripId === trip.trip_id}
              onSave={handleSave}
            />
          ))}
        </div>
      )}

      {/* Route comparison — only on unfiltered view */}
      {!loading && activeTag === 'all' && enrichedTrips.length >= 2 && (
        <RouteComparison
          trips={enrichedTrips}
          onBulkTag={(tripIds, tag, routeKey, tripLabel) => {
            bulkAutoTagMut.mutate({ tripIds, tag }, {
              onSuccess: () => {
                const hasRule = (routeRules ?? []).some((r) => r.route_key === routeKey)
                if (!hasRule) {
                  setSuggestion({ routeKey, tag, similarTripIds: [], tripLabel })
                }
              },
            })
          }}
        />
      )}

    </div>
  )
}
