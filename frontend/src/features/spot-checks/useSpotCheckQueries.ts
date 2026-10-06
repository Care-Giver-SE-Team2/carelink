import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback } from 'react'

import { listSpotChecks, listVisitsToCheck } from './api'
import type { SpotCheckQuery } from './types'

/**
 * Reads for the UC-MG08 screens. A write refreshes from the server rather than
 * patching the screen: one step can change a check's stage, raise an incident
 * and move the check to another visit, and only the server knows all of it.
 *
 * @author Wang Ziyu
 */

const SPOT_CHECKS = 'spot-checks'

export function useSpotChecks(query: SpotCheckQuery = {}) {
  return useQuery({
    queryKey: [SPOT_CHECKS, 'list', query.stage ?? 'all', query.caregiverId ?? 'all', query.elderId ?? 'all'],
    queryFn: ({ signal }) => listSpotChecks(query, signal),
  })
}

/** The elder's visits a manager may choose to check; nothing is asked until an elder is chosen. */
export function useVisitsToCheck(elderId: number | null) {
  return useQuery({
    queryKey: [SPOT_CHECKS, 'visits', elderId],
    queryFn: ({ signal }) => listVisitsToCheck(elderId as number, signal),
    enabled: elderId !== null,
  })
}

export function useRefreshSpotChecks() {
  const client = useQueryClient()
  return useCallback(() => client.invalidateQueries({ queryKey: [SPOT_CHECKS] }), [client])
}
