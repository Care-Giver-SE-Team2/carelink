import { fetchElderList } from '../../../shared/api/profile'
import { ageFromDateOfBirth } from '../lib/age'

export type PlanStatus = 'published' | 'draft' | 'none'

export type ElderRow = {
  id: string
  name: string
  age: number
  street: string
  sector: string
  planStatus: PlanStatus
  planVersion: number | null
  primaryCaregiver: string | null
  nextVisitAt: string | null
}

/**
 * GET /api/elders, mapped down to ElderRow. primaryCaregiver and nextVisitAt
 * aren't sourced yet (rostering/visit modules), so they're always null until
 * those are wired up too.
 */
export async function fetchElders(): Promise<ElderRow[]> {
  const rows = await fetchElderList()
  return rows.map((r) => ({
    id: String(r.id),
    name: r.fullName,
    age: ageFromDateOfBirth(r.dateOfBirth),
    street: r.address ?? '',
    sector: r.sector ?? '',
    planStatus: r.planStatus,
    planVersion: r.planVersion,
    primaryCaregiver: null,
    nextVisitAt: null,
  }))
}
