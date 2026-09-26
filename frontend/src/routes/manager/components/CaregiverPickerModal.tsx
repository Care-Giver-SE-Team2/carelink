import { useState } from 'react'
import type { ElderRow } from '../data/elders'
import { useCaregivers } from '../lib/useCaregivers'
import { formatDate } from '../lib/nextVisit'
import { assignPrimaryCaregiver, removePrimaryCaregiver } from '../../../shared/api/profile'
import type { CaregiverOption } from '../../../shared/api/profile'
import { RemoveCaregiverDialog } from './RemoveCaregiverDialog'
import { Avatar, Button, Callout, Eyebrow, ListRow, MetaText, Modal, SearchField } from '../../../shared/components/ui'
import styles from './CaregiverPickerModal.module.css'

/** Whose caregiver is being picked, and who holds it now. */
type PickerSubject = Pick<
  ElderRow,
  'id' | 'name' | 'sector' | 'primaryCaregiver' | 'primaryCaregiverId' | 'primaryCaregiverSince'
>

type Props = {
  elder: PickerSubject
  eyebrow?: string
  /**
   * Saves the pick. Defaults to making them the elder's primary caregiver; pass this to
   * reuse the picker for something else, such as covering one visit.
   */
  assign?: (caregiver: CaregiverOption) => Promise<void>
  onAssign: (caregiverId: string) => void
  onRemove: () => void
  onClose: () => void
}

const INELIGIBLE_REASON: Partial<Record<CaregiverOption['status'], string>> = {
  ONBOARDING: 'onboarding',
  INACTIVE: 'inactive',
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong'
}

/** An onboarding or inactive caregiver can't be assigned; a sector mismatch is shown but doesn't block. */
export function CaregiverPickerModal({ elder, eyebrow = 'Assign caregiver', assign, onAssign, onRemove, onClose }: Props) {
  const [query, setQuery] = useState('')
  const [confirmingRemove, setConfirmingRemove] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const { data: caregivers = [], isLoading, isError, error } = useCaregivers()

  const q = query.trim().toLowerCase()
  const visibleCaregivers = q ? caregivers.filter((c) => c.fullName.toLowerCase().includes(q)) : caregivers

  async function handleAssign(caregiver: CaregiverOption) {
    setSaving(true)
    setSaveError(null)
    try {
      await (assign ? assign(caregiver) : assignPrimaryCaregiver(elder.id, caregiver.id))
      onAssign(String(caregiver.id))
    } catch (e) {
      setSaveError(`Could not assign caregiver: ${errorText(e)}`)
    } finally {
      setSaving(false)
    }
  }

  async function handleConfirmRemove() {
    setConfirmingRemove(false)
    setSaving(true)
    setSaveError(null)
    try {
      await removePrimaryCaregiver(elder.id)
      onRemove()
    } catch (e) {
      setSaveError(`Could not remove caregiver: ${errorText(e)}`)
    } finally {
      setSaving(false)
    }
  }

  let list
  if (isLoading) {
    list = <MetaText>Loading caregivers…</MetaText>
  } else if (isError) {
    list = <MetaText>Could not load caregivers: {errorText(error)}</MetaText>
  } else {
    list = (
      <div role="listbox" aria-label="Caregivers" className={styles.list}>
        {visibleCaregivers.map((c) => {
          const isCurrent = String(c.id) === elder.primaryCaregiverId
          const outsideSector = elder.sector !== '' && c.sector !== elder.sector
          const metaParts = [
            c.sector,
            outsideSector ? 'outside sector' : null,
            INELIGIBLE_REASON[c.status] ?? (c.status === 'BUSY' ? 'busy today' : null),
          ].filter(Boolean)

          return (
            <ListRow
              key={c.id}
              selected={isCurrent}
              dimmed={!c.assignable && !isCurrent}
              leading={<Avatar size={32} />}
              title={c.fullName}
              meta={metaParts.join(' · ')}
              trailing={
                isCurrent ? (
                  <>
                    <Eyebrow>Current</Eyebrow>
                    <Button variant="dangerOutline" disabled={saving} onClick={() => setConfirmingRemove(true)}>
                      Remove
                    </Button>
                  </>
                ) : (
                  c.assignable && (
                    <Button disabled={saving} onClick={() => handleAssign(c)}>
                      Assign
                    </Button>
                  )
                )
              }
            />
          )
        })}
      </div>
    )
  }

  return (
    <>
      <Modal
        eyebrow={eyebrow}
        eyebrowTone="accent"
        title={`${elder.name} · sector ${elder.sector || '—'}`}
        meta={
          elder.primaryCaregiver
            ? `Currently ${elder.primaryCaregiver}${
                elder.primaryCaregiverSince ? ` · since ${formatDate(elder.primaryCaregiverSince)}` : ''
              }`
            : 'Currently unassigned'
        }
        width={460}
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
        <SearchField placeholder="Search caregivers…" value={query} onChange={setQuery} />
        {list}
      </Modal>

      {confirmingRemove && elder.primaryCaregiver && (
        <RemoveCaregiverDialog
          caregiverName={elder.primaryCaregiver}
          elderName={elder.name}
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={handleConfirmRemove}
        />
      )}
    </>
  )
}
