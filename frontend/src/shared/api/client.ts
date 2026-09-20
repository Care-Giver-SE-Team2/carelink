/**
 * Single place where the front end talks to the backend.
 *
 * Vite proxies /api to http://localhost:8080 in development (see vite.config.ts),
 * so no base URL and no CORS configuration are needed.
 *
 * `credentials: 'include'` matters: the session lives in an HttpOnly cookie, so
 * every request has to carry it. The CSRF token is read from the XSRF-TOKEN
 * cookie and echoed back in a header, which is why that one cookie is readable
 * by script while JSESSIONID is not.
 */
function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
  return match ? decodeURIComponent(match[1]) : ''
}

/** Thrown for any non-2xx response; `status` lets a caller handle e.g. a 404 as "not found" rather than an error. */
export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (method !== 'GET' && method !== 'HEAD') headers.set('X-XSRF-TOKEN', csrfToken())

  const response = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' })

  if (!response.ok) {
    // The backend returns RFC 9457 ProblemDetail for every error, so one shape covers all.
    const problem = await response.json().catch(() => null)
    throw new ApiError(problem?.detail ?? `Request failed with ${response.status}`, response.status)
  }
  const text = await response.text()
  return text ? (JSON.parse(text) as T) : (undefined as T)
}
