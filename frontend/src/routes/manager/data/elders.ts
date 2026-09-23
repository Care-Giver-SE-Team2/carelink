import { fetchElderList } from '../../../shared/api/profile'
import { ageFromDateOfBirth } from '../lib/age'
import { primaryCaregiverName } from './caregivers'

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
 * GET /api/elders, mapped down to ElderRow. primaryCaregiver is sourced from
 * the local assignment store (data/caregivers.ts) until a real assignment
 * endpoint exists. nextVisitAt is the elder's nextVisitDate as an ISO
 * "yyyy-MM-dd" string (derived server-side from the published plan's start
 * date and its nodes' weekly schedule) — null when there is no published
 * plan or no scheduled visit. Format it for display with lib/nextVisit.
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
    primaryCaregiver: primaryCaregiverName(String(r.id)),
    nextVisitAt: r.nextVisitDate,
  }))
}
