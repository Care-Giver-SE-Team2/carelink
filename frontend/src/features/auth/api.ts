import { api } from '../../shared/api/client'
import type { CurrentUser, SignInCredentials } from './types'

/**
 * Initialises the CSRF cookie for a state-changing request.
 *
 * @param signal Cancels initialisation
 */
export function initialiseCsrf(signal?: AbortSignal): Promise<void> {
  return api<void>('/auth/csrf', { signal })
}

/**
 * Initialises CSRF protection and signs in using the server session.
 *
 * @param credentials Username and password supplied by the user
 * @param signal Cancels CSRF initialisation or the login request
 * @return The authenticated user's identity and roles
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

/**
 * Returns the user associated with the current authenticated session.
 *
 * The backend resolves the user from the JSESSIONID cookie.
 */
export function getCurrentUser(
  signal?: AbortSignal,
): Promise<CurrentUser> {
  return api<CurrentUser>('/auth/me', {
    signal,
  })
}

/**
 * Signs out the current user.
 *
 * Spring Security invalidates the authenticated server-side session.
 * CSRF is initialised first because logout is a state-changing request.
 */
export async function signOut(
  signal?: AbortSignal,
): Promise<void> {
  await initialiseCsrf(signal)

  await api<void>('/auth/logout', {
    method: 'POST',
    signal,
  })
}