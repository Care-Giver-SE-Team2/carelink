import { useEffect, useRef } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { intakeDate, intakeStatus, statusLabels } from '../../../features/intake/presentation'
import type { IntakeStatus } from '../../../features/intake/types'
import { useIntakeApplications } from '../../../features/intake/useIntakeQueries'
import { IntakeIcon, IntakeLoading, StatusBadge } from './IntakeLayout'
import { IntakeFeedback } from './IntakeFeedback'
import styles from './FamilyIntake.module.css'

/**
 * Lists only the signed-in family's applications, with status filters and pagination.
 * @author Wang Zhili
 */
export function IntakeListPage() {
  const [params, setParams] = useSearchParams()
  const candidate = Number(params.get('page') ?? 0)
  const page =
    Number.isInteger(candidate) && candidate >= 0 && candidate <= 2147483647 ? candidate : 0
  const status = intakeStatus(params.get('status'))
  const activeFilter = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    activeFilter.current?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'instant',
    })
  }, [status])
  const { resource, refresh } = useIntakeApplications({ page, size: 20, status })
  const changeQuery = (nextPage: number, nextStatus = status) => {
    const next = new URLSearchParams()
    if (nextStatus) next.set('status', nextStatus)
    if (nextPage > 0) next.set('page', String(nextPage))
    setParams(next)
  }
  const backSearch = params.toString() ? '?' + params.toString() : ''

  return (
    <>
      <section className={styles.hero}>
        <div>
          <p className={styles.eyebrow}>YOUR FAMILY'S CARE</p>
          <h1>My applications</h1>
          <p className={styles.subtitle}>
            A little clarity, at every step.
            <br />
            Follow your loved one's care application here.
          </p>
        </div>
        <span className={styles.heroIcon}>
          <IntakeIcon name="file" />
        </span>
      </section>
      <Link className={styles.createLink} to="/family/intake/new">
        New application
        <IntakeIcon name="arrow" />
      </Link>
      <div className={styles.filters} role="group" aria-label="Filter applications by status">
        <button
          ref={!status ? activeFilter : undefined}
          aria-pressed={!status}
          onClick={() => setParams({})}
        >
          All applications
        </button>
        {(Object.keys(statusLabels) as IntakeStatus[]).map((value) => (
          <button
            ref={status === value ? activeFilter : undefined}
            key={value}
            aria-pressed={status === value}
            onClick={() => changeQuery(0, value)}
          >
            {statusLabels[value]}
          </button>
        ))}
      </div>
      <div className={styles.toolbar}>
        <span aria-live="polite">
          {resource.status === 'success'
            ? resource.data.totalElements +
              (resource.data.totalElements === 1 ? ' application' : ' applications')
            : 'Your applications'}
        </span>
        <button
          className={styles.textButton}
          onClick={refresh}
          disabled={resource.status === 'loading'}
        >
          <IntakeIcon name="refresh" />
          Refresh
        </button>
      </div>
      {resource.status === 'loading' && <IntakeLoading />}
      {resource.status === 'error' && <IntakeFeedback error={resource.error} onRetry={refresh} />}
      {resource.status === 'success' && (
        <>
          {resource.data.items.length === 0 ? (
            <section className={styles.state}>
              <span className={styles.emptyIcon}>
                <IntakeIcon name="file" />
              </span>
              <h2>
                {page > 0
                  ? 'No applications on this page'
                  : status
                    ? 'No matching applications'
                    : 'No applications yet'}
              </h2>
              <p>
                {status
                  ? 'Choose another status to see your other applications.'
                  : 'Your submitted care applications will appear here.'}
              </p>
              {(status || page > 0) && (
                <button onClick={() => setParams({})}>View all applications</button>
              )}
            </section>
          ) : (
            <ul className={styles.cards}>
              {resource.data.items.map((item) => (
                <li key={item.id}>
                  <Link className={styles.card} to={'/family/intake/' + item.id + backSearch}>
                    <div className={styles.cardTop}>
                      <span className={styles.reference}>APPLICATION #{item.id}</span>
                      <StatusBadge status={item.status} />
                    </div>
                    <h2>{item.targetElderName}</h2>
                    <p className={styles.address}>{item.targetAddress}</p>
                    <div className={styles.cardBottom}>
                      <div>
                        <span className={styles.smallLabel}>Submitted</span>
                        <time dateTime={item.createdAt}>{intakeDate(item.createdAt)}</time>
                      </div>
                      <span className={styles.openCard} aria-hidden="true">
                        <IntakeIcon name="arrow" />
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {resource.data.items.length > 0 && resource.data.totalElements > resource.data.size && (
            <nav className={styles.pagination} aria-label="Application pages">
              <button onClick={() => changeQuery(page - 1)} disabled={page === 0}>
                Previous
              </button>
              <span>
                Page {page + 1} of {Math.ceil(resource.data.totalElements / resource.data.size)}
              </span>
              <button
                onClick={() => changeQuery(page + 1)}
                disabled={(page + 1) * resource.data.size >= resource.data.totalElements}
              >
                Next
              </button>
            </nav>
          )}
          <p className={styles.footnote}>Application times are shown in Singapore time.</p>
        </>
      )}
    </>
  )
}
