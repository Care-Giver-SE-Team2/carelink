import { useQuery } from '@tanstack/react-query'
import { listIncidentQueue } from '../../../features/incidents/api'

/** Re-polled so the counts follow the queue while the console sits open. */
const REFRESH_MS = 30_000

/**
 * How many incidents still need attention (GET /api/incidents with no status filter —
 * open, acknowledged, in progress or escalated). The one source for both the nav's
 * Exceptions count and the Today board's Open exceptions figure: they share this query
 * key, so they always show the same number. Reads a one-row page, since only
 * `totalElements` is used.
 */
export function useOpenExceptionCount() {
  return useQuery({
    queryKey: ['incidents', 'openCount'],
    queryFn: ({ signal }) => listIncidentQueue({ page: 0, size: 1 }, signal).then((queue) => queue.totalElements),
    refetchInterval: REFRESH_MS,
  })
}
