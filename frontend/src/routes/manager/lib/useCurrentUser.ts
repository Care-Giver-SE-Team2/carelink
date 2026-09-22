import { useQuery } from '@tanstack/react-query'
import { getCurrentUser } from '../../../features/auth/api'

/** The signed-in manager, resolved from the server-side session (GET /api/auth/me).
 * staleTime keeps it from refetching on every remount/focus — who's signed in doesn't
 * change mid-session, and this hook is called from multiple components on the same page. */
export function useCurrentUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: ({ signal }) => getCurrentUser(signal),
    staleTime: 5 * 60 * 1000,
  })
}
