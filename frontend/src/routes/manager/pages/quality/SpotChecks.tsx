import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link } from 'react-router-dom'

import { visitTime } from '../../../../features/absences/presentation'
import { problemDetail } from '../../../../features/incidents/presentation'
import {
  concludeSpotCheck,
  moveSpotCheck,
  reportNoShow,
  requestSpotCheck,
  withdrawSpotCheck,
} from '../../../../features/spot-checks/api'
import { endingLine, isOpen, resultLabels, stageLabels, stages } from '../../../../features/spot-checks/presentation'
import type { SpotCheck, SpotCheckResult, SpotCheckStage } from '../../../../features/spot-checks/types'
import {
  useRefreshSpotChecks,
  useSpotChecks,
  useVisitsToCheck,
} from '../../../../features/spot-checks/useSpotCheckQueries'
import { ManagerShell } from '../../components/ManagerShell'
import { useElders } from '../../lib/useElders'
import styles from '../absences/Absences.module.css'
import { ExceptionFeedback } from '../exceptions/ExceptionFeedback'

/**
 * UC-MG08 for the manager: ask to watch one of an elder's visits, see which
 * requests the family has agreed to, and on the day record the conclusion -
 * or that the caregiver never came, or that the elder was out and the check
 * moves to another visit.
 */
export default function SpotChecks() {
  const [stage, setStage] = useState<SpotCheckStage | ''>('')
  const { data, error, isPending, refetch } = useSpotChecks(stage ? { stage } : {})

  return (
    <ManagerShell>
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <h1>Spot checks</h1>
          <span className={styles.meta}>{data ? `${data.length} shown` : 'Loading…'}</span>
          <button type="button" className={styles.textButton} onClick={() => refetch()}>
            Refresh
          </button>
        </div>

        <RequestForm />

        <div className={styles.filters}>
          <label>
            Stage
            <select value={stage} onChange={(event) => setStage(event.target.value as SpotCheckStage | '')}>
              <option value="">Every stage</option>
              {stages.map((value) => (
                <option key={value} value={value}>
                  {stageLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {isPending && <p className={styles.note}>Loading spot checks…</p>}
        {error && <ExceptionFeedback error={error} onRetry={() => refetch()} />}
        {data && data.length === 0 && (
          <p className={styles.note}>No spot checks. Ask for one above; the family is asked before anybody goes.</p>
        )}
        {data && data.length > 0 && (
          <ul className={styles.cards}>
            {data.map((check) => (
              <CheckCard key={check.id} check={check} />
            ))}
          </ul>
        )}
      </div>
    </ManagerShell>
  )
}

/** Steps 1 and 2: choose an elder and one of their visits, and say why. */
function RequestForm() {
  const elders = useElders()
  const refresh = useRefreshSpotChecks()
  const [elderId, setElderId] = useState<number | null>(null)
  const visits = useVisitsToCheck(elderId)
  const [visitId, setVisitId] = useState('')
  const [purpose, setPurpose] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [sent, setSent] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSending(true)
    setError(null)
    setSent(false)
    try {
      await requestSpotCheck(Number(visitId), purpose.trim())
      setVisitId('')
      setPurpose('')
      setSent(true)
      await refresh()
    } catch (failure) {
      setError(failure)
    } finally {
      setSending(false)
    }
  }

  return (
    <form className={styles.panel} onSubmit={submit} aria-label="Ask for a spot check">
      <div className={styles.formRow}>
        <label>
          Elder
          <select
            value={elderId ?? ''}
            onChange={(event) => {
              setElderId(event.target.value ? Number(event.target.value) : null)
              setVisitId('')
            }}
          >
            <option value="">Choose…</option>
            {(elders.data ?? []).map((elder) => (
              <option key={elder.id} value={elder.id}>
                {elder.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Visit
          <select required value={visitId} disabled={elderId === null} onChange={(event) => setVisitId(event.target.value)}>
            <option value="">{elderId === null ? 'Choose an elder first' : 'Choose…'}</option>
            {(visits.data ?? []).map((visit) => (
              <option key={visit.visitId} value={visit.visitId}>
                {visitTime(visit.start)} · {visit.caregiverName}
                {visit.serviceType ? ` · ${visit.serviceType}` : ''}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Why this visit is being checked
        <input type="text" required maxLength={255} value={purpose} onChange={(event) => setPurpose(event.target.value)} />
      </label>
      {elderId !== null && visits.data && visits.data.length === 0 && (
        <p className={styles.note}>This elder has no visit with a caregiver in the next two weeks.</p>
      )}
      {error !== null && (
        <p className={styles.inlineError} role="alert">
          {problemDetail(error)}
        </p>
      )}
      {sent && <p className={styles.note}>Asked. The family has been sent the request to agree to.</p>}
      <div className={styles.formActions}>
        <button type="submit" disabled={sending || !visitId || !purpose.trim()}>
          {sending ? 'Asking…' : 'Ask the family'}
        </button>
      </div>
    </form>
  )
}

/** One spot check: where it stands, and what can be recorded at this stage. */
function CheckCard({ check }: { check: SpotCheck }) {
  const refresh = useRefreshSpotChecks()
  const visits = useVisitsToCheck(check.stage === 'SCHEDULED' ? check.elderId : null)
  const [result, setResult] = useState<SpotCheckResult>('MEETS_STANDARD')
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('')
  const [moveTo, setMoveTo] = useState('')
  const [working, setWorking] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function act(action: () => Promise<unknown>) {
    setWorking(true)
    setError(null)
    try {
      await action()
      await refresh()
    } catch (failure) {
      setError(failure)
    } finally {
      setWorking(false)
    }
  }

  const otherVisits = (visits.data ?? []).filter((visit) => visit.visitId !== check.visitId)

  return (
    <li className={styles.card} aria-label={`Spot check of ${check.elderName} on ${visitTime(check.visitTime)}`}>
      <div className={styles.cardHead}>
        <span className={styles.mono}>{visitTime(check.visitTime)}</span>
        <span className={styles.cardTitle}>
          {check.elderName} · {check.caregiverName}
        </span>
        <span className={styles.statusTag} data-status={isOpen(check) ? 'AWAITING_FAMILY' : 'RESOLVED'}>
          {stageLabels[check.stage]}
        </span>
      </div>
      <p className={styles.cardMeta}>Why: {check.purpose}</p>
      {!isOpen(check) && <p className={styles.cardMeta}>{endingLine(check)}</p>}
      {check.stage === 'CAREGIVER_NO_SHOW' && check.incidentId !== null && (
        <p className={styles.cardMeta}>
          <Link to={'/manager/exceptions/' + check.incidentId}>Exception EXC-{check.incidentId}</Link>
        </p>
      )}
      {check.caregiverResponse && <p className={styles.cardNote}>Caregiver's response: {check.caregiverResponse}</p>}

      {check.stage === 'SCHEDULED' && (
        <div className={styles.panel}>
          <div className={styles.formRow}>
            <label>
              Conclusion
              <select value={result} onChange={(event) => setResult(event.target.value as SpotCheckResult)}>
                {(Object.keys(resultLabels) as SpotCheckResult[]).map((value) => (
                  <option key={value} value={value}>
                    {resultLabels[value]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Notes
              <input type="text" maxLength={500} value={notes} onChange={(event) => setNotes(event.target.value)} />
            </label>
          </div>
          <div className={styles.formActions}>
            <button type="button" disabled={working} onClick={() => act(() => concludeSpotCheck(check.id, result, notes || undefined))}>
              Record conclusion
            </button>
            <button
              type="button"
              className={styles.secondary}
              disabled={working}
              onClick={() => act(() => reportNoShow(check.id, notes || undefined))}
            >
              Caregiver did not come
            </button>
          </div>
          <div className={styles.formRow}>
            <label>
              Elder was out: move to
              <select value={moveTo} onChange={(event) => setMoveTo(event.target.value)}>
                <option value="">Choose another visit…</option>
                {otherVisits.map((visit) => (
                  <option key={visit.visitId} value={visit.visitId}>
                    {visitTime(visit.start)} · {visit.caregiverName}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={styles.secondary}
              disabled={working || !moveTo}
              onClick={() => act(() => moveSpotCheck(check.id, Number(moveTo)))}
            >
              Move and ask again
            </button>
          </div>
        </div>
      )}

      {isOpen(check) && (
        <div className={styles.formRow}>
          <label className={styles.inlineLabel}>
            Reason to withdraw
            <input type="text" maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
          </label>
          <button
            type="button"
            className={styles.secondary}
            disabled={working || !reason.trim()}
            onClick={() => act(() => withdrawSpotCheck(check.id, reason.trim()))}
          >
            Withdraw
          </button>
        </div>
      )}

      {error !== null && (
        <p className={styles.inlineError} role="alert">
          {problemDetail(error)}
        </p>
      )}
    </li>
  )
}
