import type { PersonalRecords as PR } from '../../utils/stats'
import { formatDuration } from '../../utils/stats'
import { mToKm } from '../../api/georide'
import { formatDate } from '../../utils/dates'
import styles from './PersonalRecords.module.css'

type Props = { records: PR }

export default function PersonalRecords({ records }: Props) {
  const { longestTrip, fastestTrip, mostKmDay } = records

  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Records personnels</h3>
      <div className={styles.list}>
        <Record
          icon="📍"
          label="Trajet le plus long"
          value={longestTrip ? `${mToKm(longestTrip.distance)} km` : '—'}
          sub={longestTrip ? `${formatDate(longestTrip.start_time)} · ${formatDuration(longestTrip.duration)}` : undefined}
        />
        <Record
          icon="⚡"
          label="Vitesse max atteinte"
          value={fastestTrip ? `${fastestTrip.max_speed} km/h` : '—'}
          sub={fastestTrip ? formatDate(fastestTrip.start_time) : undefined}
        />
        <Record
          icon="🗓️"
          label="Plus de km en un jour"
          value={mostKmDay ? `${mostKmDay.km} km` : '—'}
          sub={mostKmDay ? formatDate(mostKmDay.date) : undefined}
        />
      </div>
    </div>
  )
}

function Record({ icon, label, value, sub }: { icon: string; label: string; value: string; sub?: string }) {
  return (
    <div className={styles.record}>
      <span className={styles.icon}>{icon}</span>
      <div className={styles.content}>
        <span className={styles.label}>{label}</span>
        <span className={styles.value}>{value}</span>
        {sub && <span className={styles.sub}>{sub}</span>}
      </div>
    </div>
  )
}
