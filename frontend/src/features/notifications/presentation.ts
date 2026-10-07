import type { NotificationItem, Portal } from './types'

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Opened already; SENT means in the inbox and not yet opened. */
export function isRead(item: Pick<NotificationItem, 'status'>): boolean {
  return item.status === 'READ'
}

/** The client a path belongs to; the manager console when nothing else matches. */
export function portalOf(pathname: string): Portal {
  if (pathname.startsWith('/family')) return 'family'
  if (pathname.startsWith('/caregiver')) return 'caregiver'
  if (pathname.startsWith('/elder')) return 'elder'
  return 'manager'
}

/** Where a message leads in this client, or null when there is no screen for it there. */
export function linkFor(item: Pick<NotificationItem, 'resourceType' | 'resourceId'>, portal: Portal): string | null {
  const routes: Record<string, Partial<Record<Portal, string>>> = {
    INCIDENT: { manager: item.resourceId == null ? '/manager/exceptions' : `/manager/exceptions/${item.resourceId}`, caregiver: item.resourceId == null ? '/caregiver/incidents' : `/caregiver/incidents/${item.resourceId}` },
    ABSENCE: { manager: item.resourceId == null ? '/manager/absences' : `/manager/absences/${item.resourceId}` },
    ROSTER_CHANGE: { manager: '/manager/absences', family: '/family/changes', caregiver: '/caregiver' },
    SPOT_CHECK: { manager: '/manager/quality', family: '/family/spot-checks', caregiver: item.resourceId == null ? '/caregiver/spot-checks' : `/caregiver/spot-checks?spotCheckId=${item.resourceId}` },
    CREDENTIAL: { manager: '/manager/certifications', caregiver: '/caregiver' },
  }
  return (item.resourceType && routes[item.resourceType]?.[portal]) || null
}

/**
 * "Wed 7 Oct, 09:00" from the server's Singapore time (its offset is ignored). Read from the
 * text rather than through Date, so the browser's own time zone cannot move it.
 */
export function when(createdAt: string): string {
  const [date, time = ''] = createdAt.split('T')
  const [year, month, day] = date.split('-').map(Number)
  if (!year || !month || !day) return createdAt
  const weekday = WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()]
  return `${weekday} ${day} ${MONTHS[month - 1]}, ${time.slice(0, 5)}`
}
