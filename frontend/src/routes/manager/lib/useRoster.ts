import { useQueries, useQuery } from '@tanstack/react-query'
import { fetchDayRoster } from '../../../shared/api/visit'
import type { VisitResponse } from '../../../shared/api/visit'

/** One day's visits, cancelled ones left out. Keyed per date so the Week view's days are reused here. */
export function useDayVisits(date: string) {
  return useQuery({
    queryKey: ['roster', date],
    queryFn: ({ signal }) => fetchDayRoster(date, signal),
  })
}

/** Each day of a week's visits, in the order given; `data` is undefined until all seven arrive. */
export function useWeekVisits(dates: string[]) {
  return useQueries({
    queries: dates.map((date) => ({
      queryKey: ['roster', date],
      queryFn: ({ signal }: { signal: AbortSignal }) => fetchDayRoster(date, signal),
    })),
    combine: (results) => ({
      data: results.every((result) => result.data) ? results.map((result) => result.data as VisitResponse[]) : undefined,
      isError: results.some((result) => result.isError),
      isPending: results.some((result) => result.isPending),
    }),
  })
}
