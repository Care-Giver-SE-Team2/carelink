import { api } from './client'

/** Mirrors identity.controller.dto.CurrentUserResponse. */
export type CurrentUser = {
  id: number
  username: string
  displayName: string
  roles: string[]
}

/** Primes the XSRF-TOKEN cookie that POST /auth/login needs in its X-XSRF-TOKEN header. */
export function fetchCsrf(): Promise<void> {
  return api<void>('/auth/csrf')
}

export async function login(username: string, password: string): Promise<CurrentUser> {
  await fetchCsrf()
  return api<CurrentUser>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}
