import type { FamilyVisitPage } from '../../../features/schedule/types'
import { serviceLabel, visitDate, visitStatusLabels, visitTime } from '../../../features/schedule/presentation'
import styles from './FamilySchedule.module.css'

/**
 * Displays the returned page of planned visits and its server snapshot time.
 * @author Wang Zhili
 */
export function ScheduleVisitList({ visits, onPage, onCaregiver }: {
  visits: FamilyVisitPage
  onPage: (page: number) => void
  onCaregiver: (id: number) => void
}) {
  const pages = Math.ceil(visits.totalElements / visits.size)
  const snapshot = visits.items[0]?.asOf
  return (
    <>
      <div className={styles.summary} aria-live="polite">
        <strong>{visits.totalElements} {visits.totalElements === 1 ? 'visit' : 'visits'} this week</strong>
        {visits.items.length > 0 && <span>
          Showing {visits.page * visits.size + 1}–{visits.page * visits.size + visits.items.length} of {visits.totalElements}
        </span>}
      </div>
      {visits.items.length === 0 ? (
        <section className={styles.state}>
          <h2>{visits.page > 0 ? 'No visits on this page' : 'No visits this week'}</h2>
          <p>{visits.page > 0
            ? 'The schedule may have changed. Return to the first page to check it.'
            : 'Planned care visits will appear here. You can also check another week.'}</p>
          {visits.page > 0 && <button onClick={() => onPage(0)}>Back to first page</button>}
        </section>
      ) : (
        <ol className={styles.visits} aria-label="Scheduled visits">
          {visits.items.map((visit) => (
            <li key={visit.id} className={styles.card}>
              <div className={styles.cardTop}>
                <time dateTime={visit.scheduledStart}>{visitDate(visit.scheduledStart)}</time>
                <span className={styles.badge} data-status={visit.status}>
                  {visitStatusLabels[visit.status] ?? visit.status}
                </span>
              </div>
              <h2>{serviceLabel(visit.serviceType)}</h2>
              <p className={styles.time}>
                <time dateTime={visit.scheduledStart}>{visitTime(visit.scheduledStart)}</time>
                {visit.scheduledEnd
                  ? <> – <time dateTime={visit.scheduledEnd}>
                    {visitDate(visit.scheduledStart) !== visitDate(visit.scheduledEnd) && visitDate(visit.scheduledEnd) + ', '}
                    {visitTime(visit.scheduledEnd)}
                  </time></>
                  : <span> · End time to be confirmed</span>}
              </p>
              <div className={styles.caregiver}>
                <span className={styles.caregiverIcon} aria-hidden="true">{visit.caregiverId === null ? '–' : '✓'}</span>
                <span>{visit.caregiverId === null ? 'Caregiver awaiting assignment' : 'Caregiver assigned'}</span>
                <span className={styles.reference}>Visit #{visit.id}</span>
              </div>
              {visit.caregiverId !== null && <button
                className={styles.caregiverButton}
                aria-label={`View caregiver for visit ${visit.id}`}
                aria-haspopup="dialog"
                onClick={() => onCaregiver(visit.caregiverId!)}
              >View caregiver <span aria-hidden="true">→</span></button>}
            </li>
          ))}
        </ol>
      )}
      {pages > 1 && visits.items.length > 0 && <nav className={styles.pagination} aria-label="Schedule pages">
        <button onClick={() => onPage(visits.page - 1)} disabled={visits.page === 0}>Previous page</button>
        <span>Page {visits.page + 1} of {pages}</span>
        <button onClick={() => onPage(visits.page + 1)} disabled={visits.page + 1 >= pages}>Next page</button>
      </nav>}
      {snapshot && <p className={styles.snapshot}>
        Schedule checked <time dateTime={snapshot}>{visitDate(snapshot)}, {visitTime(snapshot)}</time>
      </p>}
    </>
  )
}
