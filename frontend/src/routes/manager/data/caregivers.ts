/**
 * Caregiver directory + primary-caregiver assignment store, mocked
 * client-side: no GET /api/caregivers or assignment endpoint exists yet
 * (rostering module only exposes GET /api/rostering-runs/{id}). Swap
 * fetchCaregivers()/assignCaregiver() for real API calls once those
 * endpoints land — the shape here already matches
 * profile.domain.model.Caregiver plus a workload/eligibility view.
 */

export type Caregiver = {
  id: string
  name: string
  sector: string
  firstAidValid: boolean
  workloadHoursToday: number
}

const MAX_HOURS_PER_DAY = 8.0

export const CAREGIVERS: Caregiver[] = [
  { id: 'CG-01', name: 'Aisyah N.', sector: 'S31', firstAidValid: true, workloadHoursToday: 5.2 },
  { id: 'CG-02', name: 'Devi Raman', sector: 'S31', firstAidValid: true, workloadHoursToday: 3.0 },
  { id: 'CG-03', name: 'Rosnah Ismail', sector: 'S31', firstAidValid: true, workloadHoursToday: 6.8 },
  { id: 'CG-04', name: 'Farah Latif', sector: 'S28', firstAidValid: false, workloadHoursToday: 4.5 },
  { id: 'CG-05', name: 'Wei Jie Tan', sector: 'S19', firstAidValid: true, workloadHoursToday: 2.1 },
  { id: 'CG-06', name: 'Kumar Selvam', sector: 'S42', firstAidValid: true, workloadHoursToday: 7.5 },
  { id: 'CG-07', name: 'Noraini Yusof', sector: 'S31', firstAidValid: true, workloadHoursToday: 1.5 },
  { id: 'CG-08', name: 'Benjamin Tay', sector: 'S28', firstAidValid: true, workloadHoursToday: 4.0 },
  { id: 'CG-09', name: 'Priya Menon', sector: 'S19', firstAidValid: false, workloadHoursToday: 3.2 },
  { id: 'CG-10', name: 'Muthu Krishnan', sector: 'S31', firstAidValid: true, workloadHoursToday: 6.1 },
  { id: 'CG-11', name: 'Grace Lim', sector: 'S42', firstAidValid: true, workloadHoursToday: 0.8 },
  { id: 'CG-12', name: 'Haziq Rahman', sector: 'S31', firstAidValid: true, workloadHoursToday: 7.9 },
]

export function fetchCaregivers(): Caregiver[] {
  return CAREGIVERS
}

export function maxHoursPerDay(): number {
  return MAX_HOURS_PER_DAY
}

/** Deterministic mock "prior visits" count for an elder/caregiver pair, so the
 * list has some continuity signal without a real visit history to query. */
export function priorVisitCount(elderId: string, caregiverId: string): number {
  const key = `${elderId}:${caregiverId}`
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return hash % 4
}

type Assignment = { caregiverId: string; since: string }

/** elderId -> current primary-caregiver assignment. In-memory only; resets on reload. */
const assignments = new Map<string, Assignment>()

function today(): string {
  return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

export function getAssignment(elderId: string): Assignment | undefined {
  return assignments.get(elderId)
}

export function assignCaregiver(elderId: string, caregiverId: string): void {
  assignments.set(elderId, { caregiverId, since: today() })
}

export function removeAssignment(elderId: string): void {
  assignments.delete(elderId)
}

/** Primary-caregiver display name for data/elders.ts — null while unassigned. */
export function primaryCaregiverName(elderId: string): string | null {
  const assignment = assignments.get(elderId)
  if (!assignment) return null
  return CAREGIVERS.find((c) => c.id === assignment.caregiverId)?.name ?? null
}
