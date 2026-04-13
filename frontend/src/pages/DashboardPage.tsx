import { useState, useEffect } from 'react'
import { useTrackers } from '../hooks/useTrackers'
import { useTrips } from '../hooks/useTrips'
import { dateRangeForPeriod, previousPeriodRange, type Period, type DateRange } from '../utils/dates'
import {
  computeStats,
  computeStatsDelta,
  computeMonthlyKm,
  computeSpeedDistribution,
  computeHourDistribution,
  computeDayOfWeekDistribution,
  computeSpeedEvolution,
  computePersonalRecords,
} from '../utils/stats'
import StatsGrid from '../components/dashboard/StatsGrid'
import KmPerMonthChart from '../components/dashboard/KmPerMonthChart'
import SpeedDistributionChart from '../components/dashboard/SpeedDistributionChart'
import SpeedEvolutionChart from '../components/dashboard/SpeedEvolutionChart'
import TimeOfDayChart from '../components/dashboard/TimeOfDayChart'
import DayOfWeekChart from '../components/dashboard/DayOfWeekChart'
import PersonalRecords from '../components/dashboard/PersonalRecords'
import RouteHeatmap from '../components/dashboard/RouteHeatmap'
import PeriodSelector from '../components/dashboard/PeriodSelector'
import TrackerSelector from '../components/dashboard/TrackerSelector'
import styles from './DashboardPage.module.css'

function defaultCustomRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  from.setDate(from.getDate() - 29)
  return {
    from: from.toISOString().slice(0, 10),
    to:   to.toISOString().slice(0, 10),
  }
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>('month')
  const [customRange, setCustomRange] = useState<{ from: string; to: string }>(defaultCustomRange)
  const [trackerId, setTrackerId] = useState<number | null>(null)

  const { data: trackers, isLoading: loadingTrackers, error: trackersError } = useTrackers()

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

  const prevRange: DateRange = period !== 'custom'
    ? previousPeriodRange(period as Exclude<Period, 'custom'>)
    : { from: '', to: '' }

  const { data: trips,     isLoading: loadingTrips,    error: tripsError    } = useTrips(trackerId, from, to)
  const { data: prevTrips, isLoading: loadingPrevTrips                       } = useTrips(trackerId, prevRange.from, prevRange.to)

  const stats     = trips     ? computeStats(trips)     : null
  const prevStats = prevTrips ? computeStats(prevTrips) : null
  const delta     = period !== 'custom' && stats && prevStats
    ? computeStatsDelta(stats, prevStats)
    : undefined

  const monthlyKm   = trips ? computeMonthlyKm(trips)              : []
  const speedDist   = trips ? computeSpeedDistribution(trips)      : []
  const hourDist    = trips ? computeHourDistribution(trips)        : []
  const dayOfWeek   = trips ? computeDayOfWeekDistribution(trips)  : []
  const speedEvo    = trips ? computeSpeedEvolution(trips, period) : []
  const records     = trips ? computePersonalRecords(trips)        : null

  const error   = trackersError || tripsError
  const loading = loadingTrackers || loadingTrips || loadingPrevTrips

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <h2 className={styles.heading}>Dashboard</h2>
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

      {error && (
        <div className={styles.error}>
          Erreur : {(error as Error).message}
        </div>
      )}

      {loading && <div className={styles.loading}>Chargement…</div>}

      {!loading && trips && trips.length === 0 && (
        <div className={styles.empty}>Aucun trajet sur cette période.</div>
      )}

      {stats && (
        <>
          <StatsGrid stats={stats} delta={delta} />

          <div className={styles.charts}>
            <KmPerMonthChart data={monthlyKm} />
            <SpeedEvolutionChart data={speedEvo} avgSpeedKmh={stats.avgSpeedKmh} />
            <SpeedDistributionChart data={speedDist} />
            <DayOfWeekChart data={dayOfWeek} />
            <TimeOfDayChart data={hourDist} />
            {records && <PersonalRecords records={records} />}
          </div>

          <RouteHeatmap
            trackerId={trackerId}
            from={from}
            to={to}
            trips={trips ?? []}
          />
        </>
      )}
    </div>
  )
}
