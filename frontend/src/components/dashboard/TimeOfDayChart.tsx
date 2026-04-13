import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import type { HourBucket } from '../../utils/stats'
import styles from './ChartCard.module.css'

type Props = { data: HourBucket[] }

export default function TimeOfDayChart({ data }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Heure de départ des trajets</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11 }}
            interval={1}
          />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={28} />
          <Tooltip formatter={(v: number) => [v, 'Trajets']} labelFormatter={(l) => `Départs à ${l}`} />
          <Bar dataKey="count" fill="#f59e0b" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
