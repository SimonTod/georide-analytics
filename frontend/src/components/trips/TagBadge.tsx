import type { TripTag } from '../../types/georide'
import styles from './TagBadge.module.css'

export const TAG_LABELS: Record<TripTag, string> = {
  commute:  'Trajet domicile',
  leisure:  'Loisir',
  sport:    'Sport',
  track:    'Circuit',
  other:    'Autre',
}

export const TAG_COLORS: Record<TripTag, string> = {
  commute:  '#3b82f6',
  leisure:  '#10b981',
  sport:    '#f97316',
  track:    '#ef4444',
  other:    '#8b5cf6',
}

type Props = { tag: TripTag; size?: 'sm' | 'md' }

export default function TagBadge({ tag, size = 'md' }: Props) {
  return (
    <span
      className={`${styles.badge} ${size === 'sm' ? styles.sm : ''}`}
      style={{ background: TAG_COLORS[tag] }}
    >
      {TAG_LABELS[tag]}
    </span>
  )
}
