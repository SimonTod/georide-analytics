import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import type { SpeedBucket } from '../../utils/stats'
import styles from './ChartCard.module.css'

type Props = { data: SpeedBucket[] }

export default function SpeedDistributionChart({ data }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Distribution des vitesses moyennes</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="range" tick={{ fontSize: 12 }} unit=" km/h" />
          <YAxis tick={{ fontSize: 12 }} allowDecimals={false} width={32} />
          <Tooltip formatter={(v: number) => [v, 'Trajets']} labelFormatter={(l) => `${l} km/h`} />
          <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
