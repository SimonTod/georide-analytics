import { type Period, PERIOD_LABELS } from '../../utils/dates'
import styles from './PeriodSelector.module.css'

type Props = {
  period: Period
  customFrom: string
  customTo: string
  onPeriodChange: (p: Period) => void
  onCustomChange: (from: string, to: string) => void
}

const PERIODS: Period[] = ['week', 'month', 'year', 'custom']
const TODAY = new Date().toISOString().slice(0, 10)

export default function PeriodSelector({
  period,
  customFrom,
  customTo,
  onPeriodChange,
  onCustomChange,
}: Props) {
  return (
    <div className={styles.root}>
      <div className={styles.group}>
        {PERIODS.map((p) => (
          <button
            key={p}
            className={`${styles.btn} ${period === p ? styles.active : ''}`}
            onClick={() => onPeriodChange(p)}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {period === 'custom' && (
        <div className={styles.dateRange}>
          <input
            type="date"
            className={styles.dateInput}
            value={customFrom}
            max={customTo || TODAY}
            onChange={(e) => onCustomChange(e.target.value, customTo)}
          />
          <span className={styles.dateSep}>→</span>
          <input
            type="date"
            className={styles.dateInput}
            value={customTo}
            min={customFrom}
            max={TODAY}
            onChange={(e) => onCustomChange(customFrom, e.target.value)}
          />
        </div>
      )}
    </div>
  )
}
