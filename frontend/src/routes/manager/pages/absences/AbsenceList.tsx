import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'

import { approveAbsence, recordAbsence, rejectAbsence } from '../../../../features/absences/api'
import {
  absenceDays,
  absenceStatusLabels,
  absenceTypeLabels,
  progressLine,
  singaporeDate,
} from '../../../../features/absences/presentation'
import type { AbsenceStatus, AbsenceType } from '../../../../features/absences/types'
import { useAbsences, useRefreshAbsences } from '../../../../features/absences/useAbsenceQueries'
import { problemDetail } from '../../../../features/incidents/presentation'
import { ManagerShell } from '../../components/ManagerShell'
import { useCaregivers } from '../../lib/useCaregivers'
import { ExceptionFeedback } from '../exceptions/ExceptionFeedback'
import styles from './Absences.module.css'

const STATUSES: AbsenceStatus[] = ['PENDING', 'APPROVED', 'REJECTED']
const TYPES: AbsenceType[] = ['SICK', 'ANNUAL', 'EMERGENCY', 'OTHER']

function asStatus(value: string | null): AbsenceStatus | undefined {
  return value && STATUSES.includes(value as AbsenceStatus) ? (value as AbsenceStatus) : undefined
}

/**
 * UC-MG04 step 1 and the way into the rest: every absence, with how far its
 * re-rostering has got, and the form a manager uses when a caregiver rings in
 * sick. A caregiver's own request (UC-CG02) arrives here waiting for review.
 */
export default function AbsenceList() {
  const [params, setParams] = useSearchParams()
  const status = asStatus(params.get('status'))
  const { data, error, isPending, refetch } = useAbsences(status)
  const refreshAll = useRefreshAbsences()
  const [actionError, setActionError] = useState<unknown>(null)
  const [busy, setBusy] = useState<number | null>(null)

  async function review(id: number, approve: boolean) {
    setBusy(id)
    setActionError(null)
    try {
      await (approve ? approveAbsence(id) : rejectAbsence(id))
      await refreshAll()
    } catch (failure) {
      setActionError(failure)
    } finally {
      setBusy(null)
    }
  }

  return (
    <ManagerShell>
      <div className={styles.page}>
        <div className={styles.pageHead}>
          <h1>Absences</h1>
          <span className={styles.meta}>{data ? `${data.length} on record` : 'Loading…'}</span>
          <button type="button" className={styles.textButton} onClick={() => refetch()}>
            Refresh
          </button>
        </div>

        <RecordAbsenceForm />

        <div className={styles.filters}>
          <label>
            Status
            <select
              value={status ?? ''}
              onChange={(event) => setParams(event.target.value ? { status: event.target.value } : {})}
            >
              <option value="">All absences</option>
              {STATUSES.map((value) => (
                <option key={value} value={value}>
                  {absenceStatusLabels[value]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {actionError !== null && (
          <p className={styles.inlineError} role="alert">
            {problemDetail(actionError)}
          </p>
        )}
        {isPending && <p className={styles.note}>Loading absences…</p>}
        {error && <ExceptionFeedback error={error} onRetry={() => refetch()} />}

        {data &&
          (data.length === 0 ? (
            <p className={styles.note}>No absences. When a caregiver rings in sick, record it above.</p>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Caregiver</th>
                  <th>Days</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Re-rostering</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {data.map((absence) => (
                  <tr key={absence.id}>
                    <td>{absence.caregiverName}</td>
                    <td className={styles.mono}>{absenceDays(absence.startDate, absence.endDate)}</td>
                    <td>{absenceTypeLabels[absence.type]}</td>
                    <td>{absenceStatusLabels[absence.status]}</td>
                    <td className={styles.progress}>{progressLine(absence)}</td>
                    <td className={styles.rowActions}>
                      {absence.status === 'PENDING' && (
                        <>
                          <button type="button" disabled={busy !== null} onClick={() => review(absence.id, true)}>
                            Approve
                          </button>
                          <button
                            type="button"
                            className={styles.secondary}
                            disabled={busy !== null}
                            onClick={() => review(absence.id, false)}
                          >
                            Reject
                          </button>
                        </>
                      )}
                      <Link className={styles.linkButton} to={'/manager/absences/' + absence.id}>
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ))}
      </div>
    </ManagerShell>
  )
}

/** "Aisha rang in sick": the manager records it, approved at once, and goes straight to re-rostering. */
function RecordAbsenceForm() {
  const [open, setOpen] = useState(false)
  if (!open) {
    return (
      <div>
        <button type="button" onClick={() => setOpen(true)}>
          Record an absence
        </button>
      </div>
    )
  }
  return <RecordAbsenceFields onCancel={() => setOpen(false)} />
}

/** The form itself, mounted only when open, so the caregiver list is only fetched when it is needed. */
function RecordAbsenceFields({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate()
  const caregivers = useCaregivers()
  const today = singaporeDate()
  const [caregiverId, setCaregiverId] = useState('')
  const [type, setType] = useState<AbsenceType>('SICK')
  const [startDate, setStartDate] = useState(today)
  const [endDate, setEndDate] = useState(today)
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const recorded = await recordAbsence({
        caregiverId: Number(caregiverId),
        type,
        startDate,
        endDate,
        reason: reason.trim() || undefined,
      })
      navigate('/manager/absences/' + recorded.id)
    } catch (failure) {
      setError(failure)
      setSaving(false)
    }
  }

  const people = (caregivers.data ?? []).filter((caregiver) => caregiver.status !== 'INACTIVE')
  return (
    <form className={styles.panel} onSubmit={submit} aria-label="Record an absence">
      <div className={styles.formRow}>
        <label>
          Caregiver
          <select required value={caregiverId} onChange={(event) => setCaregiverId(event.target.value)}>
            <option value="">Choose…</option>
            {people.map((caregiver) => (
              <option key={caregiver.id} value={caregiver.id}>
                {caregiver.fullName}
              </option>
            ))}
          </select>
        </label>
        <label>
          Type
          <select value={type} onChange={(event) => setType(event.target.value as AbsenceType)}>
            {TYPES.map((value) => (
              <option key={value} value={value}>
                {absenceTypeLabels[value]}
              </option>
            ))}
          </select>
        </label>
        <label>
          First day
          <input type="date" required min={today} value={startDate} onChange={(event) => setStartDate(event.target.value)} />
        </label>
        <label>
          Last day
          <input type="date" required min={startDate} value={endDate} onChange={(event) => setEndDate(event.target.value)} />
        </label>
      </div>
      <label>
        Reason (optional, not shown to families)
        <input type="text" maxLength={255} value={reason} onChange={(event) => setReason(event.target.value)} />
      </label>
      {error !== null && (
        <p className={styles.inlineError} role="alert">
          {problemDetail(error)}
        </p>
      )}
      <div className={styles.formActions}>
        <button type="submit" disabled={saving || !caregiverId}>
          {saving ? 'Recording…' : 'Record and open'}
        </button>
        <button type="button" className={styles.secondary} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </form>
  )
}
