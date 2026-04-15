import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAllMetadata, upsertTripMetadata, bulkAutoTag } from '../api/backend'
import type { TripTag } from '../types/georide'

export function useMetadata() {
  return useQuery({
    queryKey: ['metadata'],
    queryFn: getAllMetadata,
    staleTime: 5 * 60_000,
  })
}

export function useUpsertMetadata() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      tripId,
      tag,
      note,
    }: {
      tripId: number
      tag: TripTag | null
      note: string | null
    }) => upsertTripMetadata(tripId, { tag, note }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metadata'] }),
  })
}

export function useBulkAutoTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ tripIds, tag }: { tripIds: number[]; tag: TripTag }) =>
      bulkAutoTag(tripIds, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['metadata'] }),
  })
}
