import { useQuery } from '@tanstack/react-query'
import { fetchElders } from '../data/elders'

export function useElders() {
  return useQuery({
    queryKey: ['elders'],
    queryFn: fetchElders,
  })
}
