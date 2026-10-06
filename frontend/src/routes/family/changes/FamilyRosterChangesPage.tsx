import { useState } from 'react'
import type { FormEvent } from 'react'

import { decideChange } from '../../../features/absences/api'
import { settledLine, visitTime } from '../../../features/absences/presentation'
import type { FamilyChange, FamilyDecision } from '../../../features/absences/types'
import { useFamilyChanges, useRefreshAbsences } from '../../../features/absences/useAbsenceQueries'
import { problemDetail } from '../../../features/incidents/presentation'
import styles from './FamilyRosterChanges.module.css'

/**
 * The family's part of UC-MG04, steps 4 and 5: when a caregiver is away, the
 * family is told who would come instead and may keep that person, pick another
 * of the suggestions, move the visit, or skip it - until the time shown, after
 * which the institution goes ahead with its suggestion and says so.
 *
 * @author Wang Ziyu
 */
export function FamilyRosterChangesPage() {
  const { data, error, isPending, refetch } = useFamilyChanges()
  const waiting = (data ?? []).filter((change) => change.status === 'AWAITING_FAMILY')
  const others = (data ?? []).filter((change) => change.status !== 'AWAITING_FAMILY')

  return (
    <div className={styles.changes}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>YOUR FAMILY'S CARE</p>
        <h1>Visit changes</h1>
        <p>
          When a caregiver is away, we suggest who comes instead. Choose before the time shown;
          if we have not heard from you by then, the suggested caregiver will come.
        </p>
      </section>

      {isPending && <p className={styles.state} role="status">Loading changes…</p>}
      {error && (
        <section className={styles.state} role="alert">
          <p>{problemDetail(error)}</p>
          <button type="button" onClick={() => refetch()}>Try again</button>
        </section>
      )}
      {data && data.length === 0 && (
        <section className={styles.state}>
          <h2>No changes</h2>
          <p>Every visit is going ahead with its usual caregiver.</p>
        </section>
      )}

      {waiting.length > 0 && (
        <section aria-label="Waiting for your answer">
          <h2 className={styles.heading}>Waiting for your answer</h2>
          {waiting.map((change) => (
            <PendingChange key={change.id} change={change} />
          ))}
        </section>
      )}

      {others.length > 0 && (
        <section aria-label="Earlier changes">
          <h2 className={styles.heading}>Earlier changes</h2>
          <ul className={styles.history}>
            {others.map((change) => (
              <li key={change.id}>
                <strong>{visitTime(change.visitStart)}</strong> · {change.elderName}
                <span>
                  {change.status === 'UNCOVERED'
                    ? 'We are still finding a caregiver; a manager is handling it.'
                    : settledLine(change)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

/** One change waiting for the family: the suggestion, the other options, and the time to answer by. */
function PendingChange({ change }: { change: FamilyChange }) {
  const refreshAll = useRefreshAbsences()
  const [caregiverId, setCaregiverId] = useState<number | null>(change.suggestedCaregiverId)
  const [newStart, setNewStart] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const suggested = change.options.find((option) => option.caregiverId === change.suggestedCaregiverId)

  async function send(decision: FamilyDecision) {
    setSending(true)
    setError(null)
    try {
      await decideChange(change.id, decision)
      await refreshAll()
    } catch (failure) {
      setError(failure)
    } finally {
      setSending(false)
    }
  }

  function keep(event: FormEvent) {
    event.preventDefault()
    send({ choice: 'CHANGE_CAREGIVER', caregiverId: caregiverId ?? undefined })
  }

  function move(event: FormEvent) {
    event.preventDefault()
    send({ choice: 'RESCHEDULE', newStart: newStart.length === 16 ? newStart + ':00' : newStart })
  }

  return (
    <article className={styles.card} aria-label={`Change to the visit on ${visitTime(change.visitStart)}`}>
      <p className={styles.when}>
        {visitTime(change.visitStart)} · {change.elderName}
      </p>
      <p>
        {change.usualCaregiverName} is away for this visit.
        {suggested ? ` We suggest ${suggested.name}${suggested.reason ? ` (${suggested.reason.toLowerCase()})` : ''}.` : ''}
      </p>
      <p className={styles.deadline}>Please answer by {visitTime(change.respondBy)}</p>

      <form onSubmit={keep} className={styles.block}>
        <fieldset>
          <legend>Who should come</legend>
          {change.options.map((option) => (
            <label key={option.caregiverId} className={styles.option}>
              <input
                type="radio"
                name={`caregiver-${change.id}`}
                checked={caregiverId === option.caregiverId}
                onChange={() => setCaregiverId(option.caregiverId)}
              />
              <span>
                <strong>{option.name}</strong>
                {option.reason && <small>{option.reason}</small>}
              </span>
            </label>
          ))}
        </fieldset>
        <button type="submit" disabled={sending || caregiverId === null}>
          Confirm caregiver
        </button>
      </form>

      <form onSubmit={move} className={styles.block}>
        <label htmlFor={`move-${change.id}`}>Or move the visit to</label>
        <div className={styles.inline}>
          <input
            id={`move-${change.id}`}
            type="datetime-local"
            value={newStart}
            onChange={(event) => setNewStart(event.target.value)}
          />
          <button type="submit" disabled={sending || !newStart}>Move visit</button>
        </div>
      </form>

      <div className={styles.block}>
        <button type="button" className={styles.quiet} disabled={sending} onClick={() => send({ choice: 'SKIP' })}>
          Skip this visit
        </button>
      </div>

      {error !== null && (
        <p className={styles.error} role="alert">
          {problemDetail(error)}
        </p>
      )}
    </article>
  )
}
