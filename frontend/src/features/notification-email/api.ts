import { initialiseCsrf } from '../auth/api'
import { api } from '../../shared/api/client'

/** Current-family contact status; credentials are never returned or persisted in the browser.
 * @author Wang Zhili
 */
export interface NotificationEmail {
  email: string | null
  verifiedAt: string | null
  verificationExpiresAt: string | null
  configured: boolean
}
const contact = '/family/notification-email'
export function getNotificationEmail(signal: AbortSignal) {
  return api<NotificationEmail>(contact, { signal })
}
export async function changeNotificationEmail(method: 'POST' | 'DELETE', value: { email: string } | { token: string } | undefined, signal: AbortSignal) {
  await initialiseCsrf(signal)
  return api<NotificationEmail>(contact + (value && 'token' in value ? '/verify' : ''), {
    method, body: value ? JSON.stringify(value) : undefined, signal,
  })
}
