import { useState } from 'react'
import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import {
  Avatar,
  Button,
  Callout,
  Eyebrow,
  Field,
  ListRow,
  MetaText,
  Modal,
  TextInput,
} from '../../../shared/components/ui'
import { useCaregiverCoverOptions } from '../lib/useExtraServices'
import { useReassignmentOptions } from '../lib/useRoster'
import styles from './VisitCoverModal.module.css'

/** One caregiver the search considered, as both pickers' endpoints return them. */
type CoverOption = {
  caregiverId: number
  name: string
  rank: number | null
  reason: string | null
  eligible: boolean
}

type OptionsQuery = UseQueryResult<CoverOption[], Error>

/** Longest reason the server keeps in the visit's history. */
const REASON_MAX = 150

/**
 * Picks who takes an extra service's visit, which nobody holds yet. See {@link CoverOptionsModal}.
 */
export function VisitCoverModal({
  requestId,
  title,
  meta,
  assign,
  onClose,
}: {
  requestId: number
  title: string
  meta: string
  /** Saves the pick; rejects with the error to show. */
  assign: (caregiverId: number) => Promise<void>
  onClose: () => void
}) {
  return (
    <CoverOptionsModal
      options={useCaregiverCoverOptions(requestId)}
      eyebrow="Assign caregiver"
      title={title}
      meta={meta}
      nobodyHint="Cancel the request, or ask the family for another time."
      assign={(caregiverId) => assign(caregiverId)}
      onClose={onClose}
    />
  )
}

/**
 * Gives a visit that has not started to someone other than whoever has it now. The manager has
 * the final say over the roster, the default plan and the family's pick alike, but not over the
 * hard rules, and says why; the reason goes in the visit's history, not to the family. With
 * `onCancelVisit`, the manager can instead call the visit off altogether.
 */
export function ReassignVisitModal({
  visitId,
  title,
  meta,
  assign,
  onCancelVisit,
  onClose,
}: {
  visitId: number
  title: string
  meta: string
  /** Saves the pick with the reason; rejects with the error to show. */
  assign: (caregiverId: number, reason: string) => Promise<void>
  /** Opens the cancellation step for this visit instead. */
  onCancelVisit?: () => void
  onClose: () => void
}) {
  return (
    <CoverOptionsModal
      options={useReassignmentOptions(visitId)}
      eyebrow="Reassign visit"
      title={title}
      meta={meta}
      nobodyHint="Nobody else can take this visit as it stands."
      askReason
      assign={assign}
      footerStart={
        onCancelVisit && (
          <Button variant="dangerOutline" size="md" onClick={onCancelVisit}>
            Cancel this visit
          </Button>
        )
      }
      onClose={onClose}
    />
  )
}

/**
 * The list comes from the same search an absence's re-rostering runs: who passes every hard
 * rule, best first with why, then who does not and the rule that stops them, dimmed and not
 * assignable. The server checks again on save.
 */
function CoverOptionsModal({
  options,
  eyebrow,
  title,
  meta,
  nobodyHint,
  askReason = false,
  assign,
  footerStart,
  onClose,
}: {
  options: OptionsQuery
  eyebrow: string
  title: string
  meta: string
  /** What the manager can do when nobody passes every rule. */
  nobodyHint: string
  /** Whether the manager must say why before assigning. */
  askReason?: boolean
  assign: (caregiverId: number, reason: string) => Promise<void>
  /** Another action for this visit, before Close. */
  footerStart?: ReactNode
  onClose: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [reason, setReason] = useState('')
  const missingReason = askReason && reason.trim() === ''

  async function handleAssign(option: CoverOption) {
    setSaving(true)
    setSaveError(null)
    try {
      await assign(option.caregiverId, reason.trim())
    } catch (e) {
      setSaveError(`Could not assign ${option.name}: ${e instanceof Error ? e.message : 'something went wrong'}`)
      setSaving(false)
    }
  }

  let list
  if (options.isPending) {
    list = <MetaText>Finding who is free…</MetaText>
  } else if (options.isError) {
    list = <MetaText tone="danger">Could not load caregivers: {options.error.message}</MetaText>
  } else {
    const eligible = options.data.filter((option) => option.eligible)
    list = (
      <>
        {eligible.length === 0 && <Callout tone="neutral">Nobody passes every rule at this time. {nobodyHint}</Callout>}
        <div role="listbox" aria-label="Caregivers" className={styles.list}>
          {options.data.map((option) => (
            <ListRow
              key={option.caregiverId}
              dimmed={!option.eligible}
              leading={<Avatar size={32} />}
              title={option.name}
              meta={option.reason ?? undefined}
              trailing={
                option.eligible ? (
                  <>
                    {option.rank === 1 && <Eyebrow>Best match</Eyebrow>}
                    <Button
                      disabled={saving || missingReason}
                      title={missingReason ? 'Say why first' : undefined}
                      onClick={() => void handleAssign(option)}
                    >
                      Assign
                    </Button>
                  </>
                ) : undefined
              }
            />
          ))}
        </div>
      </>
    )
  }

  return (
    <Modal
      eyebrow={eyebrow}
      eyebrowTone="accent"
      title={title}
      meta={meta}
      width={500}
      onClose={onClose}
      footer={
        <>
          {footerStart}
          <Button variant="ghost" size="md" onClick={onClose}>
            {footerStart ? 'Close' : 'Cancel'}
          </Button>
        </>
      }
    >
      {saveError && (
        <Callout tone="danger" role="alert">
          {saveError}
        </Callout>
      )}
      {askReason && (
        <Field label="Why the change (kept in the visit's history, not shown to the family)">
          {(id) => (
            <TextInput
              id={id}
              value={reason}
              onChange={setReason}
              maxLength={REASON_MAX}
              placeholder="e.g. Farah is unwell this morning"
            />
          )}
        </Field>
      )}
      {list}
    </Modal>
  )
}
