import { useState } from 'react'
import { BodyText, Callout, ConfirmDialog, Field, TextInput } from '../../../shared/components/ui'
import type { CredentialRegisterRow } from '../../../shared/api/profile'
import { reviewTitle } from '../lib/certifications'

const REASON_MAX = 500

/**
 * Confirms rejecting a submitted certificate, whether it is wrong or only unreadable. The reason
 * is required and the caregiver is told it. `onConfirm` does the request and rejects with the
 * error to show.
 */
export function RejectCertificateDialog({
  row,
  onConfirm,
  onCancel,
}: {
  row: CredentialRegisterRow
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
}) {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleConfirm() {
    if (!reason.trim()) return
    setSaving(true)
    setError(null)
    try {
      await onConfirm(reason.trim())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save this review.')
      setSaving(false)
    }
  }

  return (
    <ConfirmDialog
      tone="danger"
      eyebrow="Reject certificate"
      title={`Reject ${reviewTitle(row)}?`}
      confirmLabel={saving ? 'Saving…' : 'Reject'}
      busy={saving}
      confirmDisabled={!reason.trim()}
      width={440}
      onConfirm={handleConfirm}
      onCancel={onCancel}
    >
      <BodyText>
        The caregiver is told it was rejected and why, and can submit it again. The certificate it would have replaced
        stays as it is.
      </BodyText>
      <Field label="Reason (required)">
        {(id) => (
          <TextInput
            id={id}
            width="100%"
            value={reason}
            onChange={setReason}
            maxLength={REASON_MAX}
            placeholder="Why is it being rejected? e.g. the scan is unreadable"
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
