import { useQuery } from '@tanstack/react-query'
import { getTrackers } from '../api/georide'

export function useTrackers() {
  return useQuery({
    queryKey: ['trackers'],
    queryFn: getTrackers,
    staleTime: 5 * 60_000,
  })
}
