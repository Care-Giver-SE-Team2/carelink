import { useQuery } from '@tanstack/react-query'
import { listIncidentQueue } from '../../../features/incidents/api'

/**
 * How many incidents still need attention (GET /api/incidents with no status filter —
 * open, acknowledged, in progress or escalated), for the nav's Exceptions count. Reads a
 * one-row page, since only `totalElements` is used. Re-polls every 30s so the count
 * follows the queue while the console sits open.
 */
export function useOpenExceptionCount() {
  return useQuery({
    queryKey: ['incidents', 'openCount'],
    queryFn: ({ signal }) => listIncidentQueue({ page: 0, size: 1 }, signal).then((queue) => queue.totalElements),
    refetchInterval: 30_000,
  })
}
