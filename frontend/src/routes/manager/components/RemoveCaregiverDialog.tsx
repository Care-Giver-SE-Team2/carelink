import { BodyText, ConfirmDialog } from '../../../shared/components/ui'

type Props = {
  caregiverName: string
  elderName: string
  onCancel: () => void
  onConfirm: () => void
}

export function RemoveCaregiverDialog({ caregiverName, elderName, onCancel, onConfirm }: Props) {
  return (
    <ConfirmDialog
      tone="danger"
      eyebrow="Remove caregiver"
      title={`Remove ${caregiverName} as primary caregiver for ${elderName}?`}
      confirmLabel="Remove caregiver"
      width={420}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <BodyText>
        Their upcoming scheduled visits become unassigned until a new caregiver is picked. The care plan itself is
        unaffected.
      </BodyText>
    </ConfirmDialog>
  )
}
