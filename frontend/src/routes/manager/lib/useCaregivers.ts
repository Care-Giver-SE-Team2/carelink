import { useQuery } from '@tanstack/react-query'
import { fetchCaregivers } from '../../../shared/api/profile'

export function useCaregivers() {
  return useQuery({
    queryKey: ['caregivers'],
    queryFn: fetchCaregivers,
  })
}
