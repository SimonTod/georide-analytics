import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getRouteRules, upsertRouteRule, deleteRouteRule } from '../api/backend'
import type { TripTag } from '../types/georide'

export function useRouteRules() {
  return useQuery({
    queryKey: ['route-rules'],
    queryFn: getRouteRules,
    staleTime: 10 * 60_000,
  })
}

export function useUpsertRouteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ routeKey, tag }: { routeKey: string; tag: TripTag }) =>
      upsertRouteRule(routeKey, tag),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['route-rules'] }),
  })
}

export function useDeleteRouteRule() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (routeKey: string) => deleteRouteRule(routeKey),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['route-rules'] }),
  })
}
