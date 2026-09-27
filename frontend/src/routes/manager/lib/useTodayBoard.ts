import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryClient } from '@tanstack/react-query'
import { getCurrentUser } from '../../../features/auth/api'
import { getEscalationChain, listIncidentQueue } from '../../../features/incidents/api'
import { fetchCaregivers } from '../../../shared/api/profile'
import { fetchDayRoster } from '../../../shared/api/visit'
import { fetchElders } from '../data/elders'
import { toEscalationSteps, toException, toKpis, toRoster } from '../data/today'
import type { Kpis } from '../data/today'

/** How often the exception queue re-polls; shown in its header. */
export const EXCEPTION_REFRESH_SECONDS = 30

/** Big enough for a day's open exceptions in one read; the backend caps it at 100. */
const QUEUE_PAGE_SIZE = 100

// Lookups shared with the rest of the manager pages: same keys and fetchers as
// useElders / useCaregivers / useCurrentUser, so they are read once, not per poll.
// 'static' returns what's cached and fetches only when nothing is.
const elders = (client: QueryClient) => client.query({ queryKey: ['elders'], queryFn: fetchElders, staleTime: 'static' })
const caregivers = (client: QueryClient) =>
  client.query({ queryKey: ['caregivers'], queryFn: fetchCaregivers, staleTime: 'static' })
const currentUser = (client: QueryClient) =>
  client.query({ queryKey: ['currentUser'], queryFn: ({ signal }) => getCurrentUser(signal), staleTime: 'static' })

/** Today's roster, fetched apart from how it's shown so a timeline view can reuse it. */
export function useTodayRoster() {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['roster', 'today'],
    queryFn: async ({ signal }) => {
      const [visits, elderRows, caregiverRows] = await Promise.all([
        fetchDayRoster(undefined, signal),
        elders(client),
        caregivers(client),
      ])
      return toRoster(visits, elderRows, caregiverRows)
    },
  })
}

/** Open exceptions, re-polled so the board (and the nav count) stays current. */
export function useExceptionQueue() {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['exceptions', 'open'],
    queryFn: async ({ signal }) => {
      const [queue, elderRows, user] = await Promise.all([
        listIncidentQueue({ page: 0, size: QUEUE_PAGE_SIZE }, signal),
        elders(client),
        currentUser(client),
      ])
      return queue.items.map((incident) => toException(incident, elderRows, user))
    },
    refetchInterval: EXCEPTION_REFRESH_SECONDS * 1000,
  })
}

/** Headline figures, counted from the roster and the queue once both have loaded. */
export function useTodayKpis(): { data: Kpis | undefined } {
  const roster = useTodayRoster()
  const exceptions = useExceptionQueue()
  return { data: roster.data && exceptions.data ? toKpis(roster.data, exceptions.data) : undefined }
}

/** The chain for one exception; idle until there is an exception to show it for. */
export function useEscalationChain(exceptionId: string | undefined) {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['escalationChain', exceptionId],
    queryFn: async ({ signal }) => {
      const [chain, user] = await Promise.all([
        getEscalationChain(Number(exceptionId!.replace(/^EXC-/, '')), signal),
        currentUser(client),
      ])
      return toEscalationSteps(chain, user.id)
    },
    enabled: exceptionId !== undefined,
  })
}
