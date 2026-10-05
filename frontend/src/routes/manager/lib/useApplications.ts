import { useQuery } from '@tanstack/react-query'
import { fetchIntakeReviews } from '../../../shared/api/profile'

/**
 * Pending family applications, newest first (GET /api/intake-reviews). Shared by the
 * Applications screen and its nav count, so both always agree.
 */
export function useApplications() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: ({ signal }) => fetchIntakeReviews(signal),
  })
}

/** How many applications wait for an answer — the Applications nav count. */
export function usePendingApplicationCount() {
  return useQuery({
    queryKey: ['applications'],
    queryFn: ({ signal }) => fetchIntakeReviews(signal),
    select: (rows) => rows.length,
  })
}
