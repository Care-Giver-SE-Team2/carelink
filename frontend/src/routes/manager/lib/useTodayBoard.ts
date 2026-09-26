import { useQuery } from '@tanstack/react-query'
import {
  fetchEscalationChain,
  fetchExceptionQueue,
  fetchTodayKpis,
  fetchTodayRoster,
} from '../data/today'

/** How often the exception queue re-polls; shown in its header. */
export const EXCEPTION_REFRESH_SECONDS = 30

/** Today's roster, fetched apart from how it's shown so a timeline view can reuse it. */
export function useTodayRoster() {
  return useQuery({ queryKey: ['roster', 'today'], queryFn: fetchTodayRoster })
}

export function useTodayKpis() {
  return useQuery({ queryKey: ['kpis', 'today'], queryFn: fetchTodayKpis })
}

/** Open exceptions, re-polled so the board (and the nav count) stays current. */
export function useExceptionQueue() {
  return useQuery({
    queryKey: ['exceptions', 'open'],
    queryFn: fetchExceptionQueue,
    refetchInterval: EXCEPTION_REFRESH_SECONDS * 1000,
  })
}

/** The chain for one exception; idle until there is an exception to show it for. */
export function useEscalationChain(exceptionId: string | undefined) {
  return useQuery({
    queryKey: ['escalationChain', exceptionId],
    queryFn: () => fetchEscalationChain(exceptionId!),
    enabled: exceptionId !== undefined,
  })
}
