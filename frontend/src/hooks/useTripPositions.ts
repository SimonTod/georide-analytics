import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { getTripPositions, type PositionsProgress } from '../api/georide'

export function useTripPositions(
  trackerId: number | null,
  from: string,
  to: string,
  enabled = true
) {
  const [progress, setProgress] = useState<PositionsProgress | null>(null)

  const query = useQuery({
    queryKey: ['positions', trackerId, from, to],
    queryFn: () => {
      setProgress(null)
      return getTripPositions(trackerId!, from, to, setProgress)
    },
    enabled: enabled && trackerId != null && !!from && !!to,
    staleTime: 30 * 60_000,
  })

  // Clear progress once the fetch is done
  useEffect(() => {
    if (!query.isFetching) setProgress(null)
  }, [query.isFetching])

  return { ...query, progress }
}
