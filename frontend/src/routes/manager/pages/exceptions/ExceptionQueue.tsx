import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { claimIncident } from '../../../../features/incidents/api'
import {
  awaitingTakeOver,
  categoryLabels,
  clockNow,
  countdown,
  incidentTime,
  problemDetail,
  severityLabels,
  severityTones,
  statusLabels,
} from '../../../../features/incidents/presentation'
import type { IncidentSeverity, IncidentStatus } from '../../../../features/incidents/types'
import { useIncidentQueue } from '../../../../features/incidents/useIncidentQueries'
import { ManagerShell } from '../../components/ManagerShell'
import { ExceptionFeedback } from './ExceptionFeedback'
import styles from './Exceptions.module.css'

const STATUS_FILTERS: IncidentStatus[] = [
  'OPEN',
  'ACKNOWLEDGED',
  'IN_PROGRESS',
  'UNRESOLVED_ESCALATED',
  'RESOLVED',
]

const SEVERITY_FILTERS: IncidentSeverity[] = ['HIGH', 'MEDIUM', 'LOW']

const PAGE_SIZE = 20

function asStatus(value: string | null): IncidentStatus | undefined {
  return value && STATUS_FILTERS.includes(value as IncidentStatus)
    ? (value as IncidentStatus)
    : undefined
}

function asSeverity(value: string | null): IncidentSeverity | undefined {
  return value && SEVERITY_FILTERS.includes(value as IncidentSeverity)
    ? (value as IncidentSeverity)
    : undefined
}

/**
 * UC-MG05 step 2 — the exception queue (design sheet 1a, right column).
 *
 * Everything that still owes somebody an answer, nearest response deadline
 * first, which is the order the backend returns them in. The countdown is
 * rendered from the browser's clock and is a reading, not a decision: whether
 * "Take over" appears depends on the incident's status alone, because the
 * browser's clock and the server's are not the same clock.
 */
export default function ExceptionQueue() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const status = asStatus(params.get('status'))
  const severity = asSeverity(params.get('severity'))
  const { resource, refresh } = useIncidentQueue({ page: 0, size: PAGE_SIZE, status, severity })

  const [claiming, setClaiming] = useState<number | null>(null)
  const [claimError, setClaimError] = useState<unknown>(null)

  const now = clockNow()

  function filterBy(name: string, value: string) {
    const next = new URLSearchParams(params)
    if (value) next.set(name, value)
    else next.delete(name)
    setParams(next)
  }

  /* Taking over from the queue goes straight into the workbench: the manager
     who pressed it is the one now answerable, and the next thing they need is
     the timeline, not the list they came from. */
  async function takeOver(id: number) {
    setClaiming(id)
    setClaimError(null)
    try {
      await claimIncident(id)
      navigate('/manager/exceptions/' + id)
    } catch (error) {
      setClaimError(error)
      refresh()
    } finally {
      setClaiming(null)
    }
  }

  return (
    <ManagerShell>
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <h1>Exception queue</h1>
          <span className={styles.meta}>
            {resource.status === 'success'
              ? `${resource.data.totalElements} in the queue`
              : 'Loading…'}
          </span>
          <button
            type="button"
            className={styles.textButton}
            onClick={refresh}
            disabled={resource.status === 'loading'}
          >
            Refresh
          </button>
        </div>

        <div className={styles.filters}>
          <label>
            Status
            <select value={status ?? ''} onChange={(event) => filterBy('status', event.target.value)}>
              <option value="">Still needs attention</option>
              {STATUS_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {statusLabels[value]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Severity
            <select
              value={severity ?? ''}
              onChange={(event) => filterBy('severity', event.target.value)}
            >
              <option value="">Any severity</option>
              {SEVERITY_FILTERS.map((value) => (
                <option key={value} value={value}>
                  {severityLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {claimError !== null && (
          <p className={styles.inlineError} role="alert">
            {problemDetail(claimError)}
          </p>
        )}

        {resource.status === 'loading' && <p className={styles.note}>Loading the queue…</p>}
        {resource.status === 'error' && (
          <ExceptionFeedback error={resource.error} onRetry={refresh} />
        )}

        {resource.status === 'success' &&
          (resource.data.items.length === 0 ? (
            <p className={styles.note}>
              Nothing is waiting. Exceptions appear here the moment one is raised.
            </p>
          ) : (
            <ul className={styles.cards}>
              {resource.data.items.map((incident) => {
                const remaining = countdown(incident.respondBy, now)
                return (
                  <li key={incident.id} className={styles.card}>
                    <div className={styles.cardHead}>
                      <span
                        className={styles.severityTag}
                        style={{ borderColor: severityTones[incident.severity] }}
                      >
                        {severityLabels[incident.severity]}
                      </span>
                      <span className={styles.reference}>EXC-{incident.id}</span>
                      <span className={styles.statusTag}>{statusLabels[incident.status]}</span>
                      <span className={styles.countdown}>
                        {remaining ?? 'no response deadline'}
                      </span>
                    </div>

                    <h2 className={styles.cardTitle}>
                      {categoryLabels[incident.category]} — Elder #{incident.elderId}
                    </h2>
                    <p className={styles.cardDescription}>
                      {incident.description ?? 'No description was recorded.'}
                    </p>

                    <p className={styles.cardMeta}>
                      responder{' '}
                      {incident.responderUserId === null
                        ? 'unassigned'
                        : '#' + incident.responderUserId}
                    </p>
                    <p className={styles.cardMeta}>
                      raised {incidentTime(incident.reportedAt)} · respond by{' '}
                      {incident.respondBy === null ? 'not set' : incidentTime(incident.respondBy)}
                    </p>

                    <div className={styles.cardActions}>
                      {awaitingTakeOver(incident.status) && (
                        <button
                          type="button"
                          onClick={() => takeOver(incident.id)}
                          disabled={claiming !== null}
                        >
                          {claiming === incident.id ? 'Taking over…' : 'Take over'}
                        </button>
                      )}
                      <Link className={styles.linkButton} to={'/manager/exceptions/' + incident.id}>
                        Timeline
                      </Link>
                    </div>
                  </li>
                )
              })}
            </ul>
          ))}
      </div>
    </ManagerShell>
  )
}
