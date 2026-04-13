import type { TripStats, StatsDelta } from '../../utils/stats'
import { formatDuration } from '../../utils/stats'
import styles from './StatsGrid.module.css'

type Props = {
  stats: TripStats
  delta?: StatsDelta
}

export default function StatsGrid({ stats, delta }: Props) {
  return (
    <div className={styles.grid}>
      <StatCard
        label="Distance totale"
        value={`${stats.totalKm.toLocaleString('fr-FR')} km`}
        delta={delta?.totalKm}
      />
      <StatCard
        label="Trajets"
        value={String(stats.tripCount)}
        delta={delta?.tripCount}
      />
      <StatCard
        label="Vitesse moyenne"
        value={`${stats.avgSpeedKmh} km/h`}
        delta={delta?.avgSpeedKmh}
      />
      <StatCard
        label="Vitesse max"
        value={`${stats.maxSpeedKmh} km/h`}
        delta={delta?.maxSpeedKmh}
      />
      <StatCard
        label="Temps de conduite"
        value={formatDuration(stats.totalDurationSec)}
      />
    </div>
  )
}

function StatCard({
  label,
  value,
  delta,
}: {
  label: string
  value: string
  delta?: number | null
}) {
  return (
    <div className={styles.card}>
      <span className={styles.value}>{value}</span>
      {delta != null && (
        <span className={`${styles.delta} ${delta >= 0 ? styles.up : styles.down}`}>
          {delta >= 0 ? '↑' : '↓'} {Math.abs(delta)}%
        </span>
      )}
      <span className={styles.label}>{label}</span>
    </div>
  )
}
