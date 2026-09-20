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

/**
 * HTTP failure with its response status and readable message.
 * @author Wang Zhili
 */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

/**
 * Sends a session-authenticated JSON request and accepts empty success responses.
 * @param path API path relative to /api
 * @param init Request method, body, headers and cancellation signal
 * @return Parsed response, or undefined when the response is empty
 * @author Wang Zhili
 */
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  headers.set('Accept', 'application/json')
  if (init.body) headers.set('Content-Type', 'application/json')
  if (method !== 'GET' && method !== 'HEAD') headers.set('X-XSRF-TOKEN', csrfToken())

  const response = await fetch(`/api${path}`, { ...init, headers, credentials: 'include' })

  if (!response.ok) {
    const problem = await response.json().catch(() => null)
    throw new ApiError(response.status, problem?.detail ?? `Request failed with ${response.status}`)
  }
  const body = await response.text()
  return body.trim() ? (JSON.parse(body) as T) : (undefined as T)
}
