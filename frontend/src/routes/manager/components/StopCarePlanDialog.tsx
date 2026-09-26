import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchLatestCarePlan, stopCarePlan } from '../../../shared/api/careplan'
import type { CarePlanResponse } from '../../../shared/api/careplan'
import { BodyText, Callout, ConfirmDialog, DateInput, Field, TextInput } from '../../../shared/components/ui'

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
export function StopCarePlanDialog({ elder, onClose, onStopped }: Props) {
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
      // Refetch rather than seeding the cache with `stopped`: the save response doesn't read back
      // the database-maintained created_at/updated_at columns, so those come back null.
      await queryClient.invalidateQueries({ queryKey: ['carePlan', 'latest', elder.id] })
      onStopped(stopped)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not stop this plan.')
    } finally {
      setStopping(false)
    }
  }

  return (
    <ConfirmDialog
      tone="danger"
      eyebrow="Stop care plan"
      title={`Stop the care plan for ${elder.name}?`}
      meta={latestPlan ? `v${latestPlan.version}` : undefined}
      confirmLabel={stopping ? 'Stopping…' : 'Stop care plan'}
      busy={stopping}
      confirmDisabled={isLoading || !reason.trim() || !effectiveDate || carePlanId === null}
      onConfirm={handleStop}
      onCancel={onClose}
    >
      <BodyText>
        The plan itself and its history are kept — this doesn't delete anything, and you can create a new plan
        later.
      </BodyText>
      <Field label="Effective from">
        {(id) => (
          <DateInput id={id} width="100%" value={effectiveDate} onChange={setEffectiveDate} disabled={isLoading} />
        )}
      </Field>
      <Field label="Reason (required)">
        {(id) => (
          <TextInput
            id={id}
            width="100%"
            value={reason}
            onChange={setReason}
            placeholder="Why is this plan stopping?"
            disabled={isLoading}
          />
        )}
      </Field>
      {error && (
        <Callout tone="danger" role="alert">
          {error}
        </Callout>
      )}
    </ConfirmDialog>
  )
}
