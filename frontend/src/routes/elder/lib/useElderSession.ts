import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'

import { getCurrentUser, signOut } from '../../../features/auth/api'
import { ApiError } from '../../../shared/api/client'

function isUnauthenticated(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401
}

/**
 * The signed-in elder, resolved from the server-side session (GET /api/auth/me).
 * A 401 is not retried: the session is gone, and ElderShell sends the user back to sign in.
 */
export function useElderUser() {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: ({ signal }) => getCurrentUser(signal),
    staleTime: 5 * 60 * 1000,
    retry: (failureCount, error) => !isUnauthenticated(error) && failureCount < 3,
  })
}

export function isSessionExpired(error: unknown): boolean {
  return isUnauthenticated(error)
}

/**
 * Ends the session and returns to the landing page. A 401 from sign-out means the session
 * had already expired, which is the same outcome, so it is treated as success.
 */
export function useElderSignOut() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [signingOut, setSigningOut] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSignOut() {
    if (signingOut) {
      return
    }

    setSigningOut(true)
    setError(null)

    try {
      await signOut()
    } catch (failure: unknown) {
      if (!isUnauthenticated(failure)) {
        setError('Unable to sign out. Please try again.')
        setSigningOut(false)
        return
      }
    }

    queryClient.clear()
    navigate('/', { replace: true })
  }

  return { signOut: handleSignOut, signingOut, error }
}
