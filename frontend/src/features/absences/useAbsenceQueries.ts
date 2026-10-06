import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { getAbsence, listAbsences, listFamilyChanges } from './api'
import type { AbsenceStatus } from './types'

/**
 * Reads for the UC-MG04 screens. Every write refreshes from the server rather
 * than patching what is on screen: one decision can move a visit, settle a
 * change and change an absence's counts, and only the server knows all three.
 *
 * @author Wang Ziyu
 */

const ABSENCES = 'absences'
const FAMILY_CHANGES = 'roster-changes'

/** The manager's list, optionally one status only. */
export function useAbsences(status?: AbsenceStatus) {
  return useQuery({
    queryKey: [ABSENCES, 'list', status ?? 'all'],
    queryFn: ({ signal }) => listAbsences(status, signal),
  })
}

/** One absence in full. */
export function useAbsence(id: number) {
  return useQuery({
    queryKey: [ABSENCES, 'case', id],
    queryFn: ({ signal }) => getAbsence(id, signal),
    enabled: Number.isFinite(id),
  })
}

/** The family's changes. */
export function useFamilyChanges() {
  return useQuery({
    queryKey: [FAMILY_CHANGES],
    queryFn: ({ signal }) => listFamilyChanges(signal),
  })
}

/** Throws away every absence and change the screens hold, so the next render asks again. */
export function useRefreshAbsences() {
  const client = useQueryClient()
  return useCallback(async () => {
    await Promise.all([
      client.invalidateQueries({ queryKey: [ABSENCES] }),
      client.invalidateQueries({ queryKey: [FAMILY_CHANGES] }),
    ])
  }, [client])
}
