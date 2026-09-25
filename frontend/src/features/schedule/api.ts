import { api } from '../../shared/api/client'
import type { FamilyVisitPage, ScheduleQuery } from './types'

/**
 * Reads a page of visits for an elder the current family can access.
 * @param query Elder, inclusive date range and pagination
 * @param signal Cancels an outstanding request
 * @return Matching visits and the total number in the date range
 * @author Wang Zhili
 */
export function listFamilyVisits(
  { elderId, dateFrom, dateTo, page, size }: ScheduleQuery,
  signal?: AbortSignal,
): Promise<FamilyVisitPage> {
  const query = new URLSearchParams({
    elderId: String(elderId),
    dateFrom,
    dateTo,
    page: String(page),
    size: String(size),
  })
  return api<FamilyVisitPage>('/visits?' + query, { signal })
}
