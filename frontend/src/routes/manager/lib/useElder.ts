import { useQuery } from '@tanstack/react-query'
import { fetchElder } from '../../../shared/api/profile'
import type { ElderResponse } from '../../../shared/api/profile'
import type { ElderRow } from '../data/elders'
import { ageFromDateOfBirth } from './age'

/** The subset of ElderRow that GET /api/elders/{id} can fill in today; plan/roster fields stay mocked. */
export type ElderSummary = Pick<ElderRow, 'id' | 'name' | 'age' | 'sector'>

function toElderSummary(elder: ElderResponse): ElderSummary {
  return {
    id: String(elder.id),
    name: elder.fullName,
    age: ageFromDateOfBirth(elder.dateOfBirth),
    sector: elder.sector ?? '',
  }
}

export function useElder(id: string | undefined) {
  return useQuery({
    queryKey: ['elder', id],
    queryFn: async () => toElderSummary(await fetchElder(id!)),
    enabled: id !== undefined,
  })
}
