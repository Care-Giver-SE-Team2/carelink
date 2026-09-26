import { Button } from '../../../shared/components/ui'

/** The rail footer's full-width destructive action; it opens the stop confirmation. */
export function StopCarePlanButton({ onClick }: { onClick: () => void }) {
  return (
    <Button block variant="dangerOutline" onClick={onClick}>
      Stop care plan
    </Button>
  )
}
