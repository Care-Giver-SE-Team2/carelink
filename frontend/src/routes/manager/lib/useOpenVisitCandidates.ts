import { useQuery } from '@tanstack/react-query'
import { fetchOpenVisitCandidates } from '../../../shared/api/rostering'

/**
 * Who can take an unassigned visit, asked afresh each time the picker opens: bookings and
 * leave move under it, so a cached answer could offer somebody who is no longer free.
 */
export function useOpenVisitCandidates(visitId: number) {
  return useQuery({
    queryKey: ['open-visit-candidates', visitId],
    queryFn: ({ signal }) => fetchOpenVisitCandidates(visitId, signal),
    staleTime: 0,
    gcTime: 0,
  })
}
