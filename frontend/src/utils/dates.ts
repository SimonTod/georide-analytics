export type Period = 'week' | 'month' | 'year' | 'custom'

export type DateRange = { from: string; to: string }

/** Returns ISO datetime strings for a given period.
 *  - `from` is the start of the first day at 00:00:00 local time
 *  - `to` is the current instant, so today's trips are always included
 */
export function dateRangeForPeriod(period: Exclude<Period, 'custom'>): DateRange {
  const now = new Date()
  // Use end of today — stable for the whole day, avoids flooding the API with
  // a new query key on every render (which would happen with now.toISOString()).
  const to = endOfDay(now)

  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    return { from: startOfDay(d), to }
  }

  if (period === 'month') {
    const d = new Date(now.getFullYear(), now.getMonth(), 1)
    return { from: startOfDay(d), to }
  }

  // year
  const d = new Date(now.getFullYear(), 0, 1)
  return { from: startOfDay(d), to }
}

function startOfDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}T00:00:00.000Z`
}

function endOfDay(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}T23:59:59.999Z`
}

export function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Format a date string for display */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

/** Date range for the period immediately before the given one */
export function previousPeriodRange(period: Exclude<Period, 'custom'>): DateRange {
  const now = new Date()

  if (period === 'week') {
    const to = new Date(now)
    to.setDate(to.getDate() - 7)
    const from = new Date(now)
    from.setDate(from.getDate() - 13)
    return { from: startOfDay(from), to: endOfDay(to) }
  }

  if (period === 'month') {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const to = new Date(now.getFullYear(), now.getMonth(), 0) // last day of previous month
    return { from: startOfDay(from), to: endOfDay(to) }
  }

  // year
  const from = new Date(now.getFullYear() - 1, 0, 1)
  const to = new Date(now.getFullYear() - 1, 11, 31)
  return { from: startOfDay(from), to: endOfDay(to) }
}

export const PERIOD_LABELS: Record<Period, string> = {
  week: '7 derniers jours',
  month: 'Ce mois',
  year: 'Cette année',
  custom: 'Personnalisée',
}
