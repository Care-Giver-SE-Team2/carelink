import { api } from '../../shared/api/client'
import type { CurrentUser, SignInCredentials } from './types'

/**
 * Initialises CSRF protection and signs in using the server's session cookie.
 * @param credentials Username and password supplied by the user
 * @param signal Cancels CSRF initialisation or the login request
 * @return The authenticated user's identity and roles
 * @author Wang Zhili
 */
export async function signInWithSession(
  credentials: SignInCredentials,
  signal?: AbortSignal,
): Promise<CurrentUser> {
  await api<void>('/auth/csrf', { signal })
  return api<CurrentUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    signal,
  })
}
