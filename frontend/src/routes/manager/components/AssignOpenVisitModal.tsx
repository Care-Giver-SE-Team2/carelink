import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { assignOpenVisit } from '../../../shared/api/rostering'
import type { OpenVisitCandidate } from '../../../shared/api/rostering'
import { Avatar, Button, Callout, Eyebrow, ListRow, MetaText, Modal } from '../../../shared/components/ui'
import { useOpenVisitCandidates } from '../lib/useOpenVisitCandidates'
import styles from './AssignOpenVisitModal.module.css'

/** The unassigned visit being given to somebody, as the picker names it. */
export type OpenVisitSubject = {
  id: number
  elderName: string
  service: string
  /** "Thu 8 Oct · 14:00" */
  when: string
}

type Props = {
  visit: OpenVisitSubject
  onAssigned: (caregiverName: string) => void
  onClose: () => void
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

/**
 * Puts a caregiver on a visit nobody holds — one a care plan left uncovered, or an extra
 * service a family approved. The server's replacement search lists who can take it, best
 * first, and who cannot with the rule that stopped them; only the first group can be picked.
 * The server checks the pick again, so a roster that changed meanwhile is refused, not
 * double-booked.
 */
export function AssignOpenVisitModal({ visit, onAssigned, onClose }: Props) {
  const client = useQueryClient()
  const candidates = useOpenVisitCandidates(visit.id)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  async function handleAssign(candidate: OpenVisitCandidate) {
    setSaving(true)
    setSaveError(null)
    try {
      await assignOpenVisit(visit.id, candidate.caregiverId)
      await client.invalidateQueries({ queryKey: ['roster'] })
      onAssigned(candidate.name)
    } catch (e) {
      setSaveError(`Could not assign ${candidate.name}: ${errorText(e)}`)
      await client.invalidateQueries({ queryKey: ['open-visit-candidates', visit.id] })
    } finally {
      setSaving(false)
    }
  }

  let body
  if (candidates.isPending) {
    body = <MetaText>Finding who can take this visit…</MetaText>
  } else if (candidates.isError) {
    body = <MetaText>Could not load candidates: {errorText(candidates.error)}</MetaText>
  } else {
    const suggested = candidates.data.filter((c) => c.excludedBy === null)
    const excluded = candidates.data.filter((c) => c.excludedBy !== null)
    body = (
      <>
        {suggested.length === 0 ? (
          <Callout tone="neutral">Nobody is free to take this visit right now.</Callout>
        ) : (
          <div role="listbox" aria-label="Caregivers who can take this visit" className={styles.list}>
            {suggested.map((c) => (
              <ListRow
                key={c.caregiverId}
                leading={<Avatar size={32} />}
                title={c.name}
                meta={c.reason ?? ''}
                trailing={
                  <>
                    {c.rank === 1 && <Eyebrow>Best match</Eyebrow>}
                    <Button disabled={saving} onClick={() => handleAssign(c)}>
                      Assign
                    </Button>
                  </>
                }
              />
            ))}
          </div>
        )}
        {excluded.length > 0 && (
          <>
            <Eyebrow>Can’t take this visit</Eyebrow>
            <div role="listbox" aria-label="Caregivers who cannot take this visit" className={styles.list}>
              {excluded.map((c) => (
                <ListRow key={c.caregiverId} dimmed leading={<Avatar size={32} />} title={c.name} meta={c.reason ?? ''} />
              ))}
            </div>
          </>
        )}
      </>
    )
  }

  return (
    <Modal
      eyebrow="Assign caregiver"
      eyebrowTone="accent"
      title={`${visit.elderName} · ${visit.service}`}
      meta={`${visit.when} · currently unassigned`}
      width={500}
      onClose={onClose}
      footer={
        <Button variant="ghost" size="md" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {saveError && (
        <Callout tone="danger" role="alert">
          {saveError}
        </Callout>
      )}
      {body}
    </Modal>
  )
}
