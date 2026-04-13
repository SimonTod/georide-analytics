import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { MonthlyKm } from '../../utils/stats'
import styles from './ChartCard.module.css'

type Props = { data: MonthlyKm[] }

export default function KmPerMonthChart({ data }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Kilomètres par mois</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="month" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit=" km" width={56} />
          <Tooltip formatter={(v: number) => [`${v} km`, 'Distance']} />
          <Bar dataKey="km" fill="#4f46e5" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
