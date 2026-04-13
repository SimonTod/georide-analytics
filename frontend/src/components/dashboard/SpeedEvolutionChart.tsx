import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts'
import type { SpeedPoint, TripStats } from '../../utils/stats'
import styles from './ChartCard.module.css'

type Props = {
  data: SpeedPoint[]
  avgSpeedKmh: TripStats['avgSpeedKmh']
}

export default function SpeedEvolutionChart({ data, avgSpeedKmh }: Props) {
  return (
    <div className={styles.card}>
      <h3 className={styles.title}>Évolution de la vitesse moyenne</h3>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis tick={{ fontSize: 12 }} unit=" km/h" width={60} />
          <Tooltip
            formatter={(v: number) => [`${v} km/h`, 'Vitesse moy.']}
            labelFormatter={(l) => `${l}`}
          />
          <ReferenceLine
            y={avgSpeedKmh}
            stroke="#e5e7eb"
            strokeDasharray="4 4"
            label={{ value: `Moy. ${avgSpeedKmh}`, fontSize: 11, fill: '#9ca3af', position: 'insideTopRight' }}
          />
          <Line
            type="monotone"
            dataKey="avgSpeed"
            stroke="#4f46e5"
            strokeWidth={2}
            dot={{ r: 4, fill: '#4f46e5' }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
