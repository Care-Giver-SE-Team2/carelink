import { api } from '../../shared/api/client'
import type { CurrentUser, SignInCredentials } from './types'

/**
 * Initialises the CSRF cookie for a state-changing request.
 * @param signal Cancels initialisation
 * @author Wang Zhili
 */
export function initialiseCsrf(signal?: AbortSignal): Promise<void> {
  return api<void>('/auth/csrf', { signal })
}

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
  await initialiseCsrf(signal)
  return api<CurrentUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
    signal,
  })
}
