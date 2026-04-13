import { useQuery } from '@tanstack/react-query'
import { getTrips } from '../api/georide'

export function useTrips(trackerId: number | null, from: string, to: string) {
  return useQuery({
    queryKey: ['trips', trackerId, from, to],
    queryFn: () => getTrips(trackerId!, from, to),
    enabled: trackerId != null && !!from && !!to,
    staleTime: 2 * 60_000,
  })
}
