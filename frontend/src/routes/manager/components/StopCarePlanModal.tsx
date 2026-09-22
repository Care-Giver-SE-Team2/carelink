import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLatestCarePlan, stopCarePlan } from '../../../shared/api/careplan'
import type { CarePlanResponse } from '../../../shared/api/careplan'
import modalStyles from './ConfirmModal.module.css'
import styles from '../pages/CarePlan.module.css'

/** Local-date "yyyy-MM-dd", matching what a <input type="date"> and java.time.LocalDate both expect. */
function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

type Props = {
  elder: { id: string | number; name: string }
  onClose: () => void
  onStopped: (stopped: CarePlanResponse) => void
}

/**
 * Shared by the Elders list (which only knows the elder) and the CarePlan page (which already
 * has the plan loaded) — the query key matches CarePlan.tsx's own `latestPlan` query, so opening
 * this from there reuses its cache instead of refetching.
 */
export function StopCarePlanModal({ elder, onClose, onStopped }: Props) {
  const queryClient = useQueryClient()
  const { data: latestPlan, isLoading } = useQuery({
    queryKey: ['carePlan', 'latest', elder.id],
    queryFn: () => fetchLatestCarePlan(elder.id),
  })
  const carePlanId = latestPlan?.id ?? null

  const [effectiveDate, setEffectiveDate] = useState(todayIso())
  const [reason, setReason] = useState('')
  const [stopping, setStopping] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStop() {
    if (!reason.trim() || !effectiveDate || carePlanId === null) return
    setStopping(true)
    setError(null)
    try {
      const stopped = await stopCarePlan(carePlanId, effectiveDate, reason.trim())
      queryClient.setQueryData(['carePlan', 'latest', elder.id], stopped)
      onStopped(stopped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop this plan.')
    } finally {
      setStopping(false)
    }
  }

  return (
    <div className={modalStyles.modalOverlay} onClick={onClose}>
      <div className={modalStyles.modalBox} onClick={(e) => e.stopPropagation()}>
        <div className={`${modalStyles.modalEyebrow} ${modalStyles.danger}`}>Stop care plan</div>
        <div className={modalStyles.modalTitle}>Stop the care plan for {elder.name}?</div>
        <p className={modalStyles.modalBodyProse}>
          The plan itself and its history are kept — this doesn't delete anything, and you can
          create a new plan later.
        </p>
        <div className={styles.stepLabel}>Effective from</div>
        <input
          className={styles.nameInput}
          type="date"
          value={effectiveDate}
          onChange={(e) => setEffectiveDate(e.target.value)}
          disabled={isLoading}
        />
        <div className={styles.stepLabel}>Reason (required)</div>
        <textarea
          className={styles.stopReasonInput}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Why is this plan stopping?"
          disabled={isLoading}
        />
        {error && <p className={modalStyles.modalBodyProse}>{error}</p>}
        <div className={modalStyles.modalActions}>
          <button
            className={`${modalStyles.modalBtn} ${modalStyles.secondary}`}
            disabled={stopping}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={`${modalStyles.modalBtn} ${modalStyles.danger}`}
            disabled={stopping || isLoading || !reason.trim() || !effectiveDate || carePlanId === null}
            onClick={handleStop}
          >
            {stopping ? 'Stopping…' : 'Stop care plan'}
          </button>
        </div>
      </div>
    </div>
  )
}
