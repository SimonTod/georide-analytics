import type { GeoRideTracker } from '../../types/georide'
import styles from './TrackerSelector.module.css'

type Props = {
  trackers: GeoRideTracker[]
  value: number | null
  onChange: (id: number) => void
}

export default function TrackerSelector({ trackers, value, onChange }: Props) {
  if (trackers.length <= 1) return null

  return (
    <select
      className={styles.select}
      value={value ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {trackers.map((t) => (
        <option key={t.tracker_id} value={t.tracker_id}>
          {t.tracker_name}
        </option>
      ))}
    </select>
  )
}
