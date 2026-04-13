import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { DayOfWeekBucket } from '../../utils/stats'
import styles from './ChartCard.module.css'

type Props = { data: DayOfWeekBucket[] }

export default function DayOfWeekChart({ data }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Trajets par jour de la semaine</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="day" tick={{ fontSize: 13 }} />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={28} />
          <Tooltip
            formatter={(value: number, name: string) =>
              name === 'count' ? [value, 'Trajets'] : [`${value} km`, 'Distance']
            }
            labelFormatter={(l) => `${l}`}
          />
          <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
