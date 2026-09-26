import { Button, SectionHeader } from '../../../shared/components/ui'
import type { Exception } from '../data/today'
import { byUrgency, formatCountdown, formatTimeOfDay, useNow } from '../lib/clock'
import { ExceptionCard } from './ExceptionCard'
import styles from './ExceptionQueue.module.css'

function metaFor(exception: Exception, now: number): string[] {
  const meta = [`responder: ${exception.responder ?? 'unclaimed'}`]
  if (exception.escalatesTo) meta.push(`escalates to: ${exception.escalatesTo}`)
  else if (exception.escalatesAt) meta.push(`escalates in ${formatCountdown(Date.parse(exception.escalatesAt) - now)}`)
  if (exception.familyNotifiedAt) meta.push(`family notified ${formatTimeOfDay(exception.familyNotifiedAt)}`)
  return meta
}

/**
 * Open exceptions, most severe then nearest deadline first, with countdowns that tick every
 * second. Polling is the caller's (the query's `refetchInterval`); `refreshSeconds` only
 * labels it. SEV 1 offers Take over and Timeline, SEV 2 Claim and Reassign visit, SEV 3 nothing.
 */
export function ExceptionQueue({
  exceptions,
  refreshSeconds,
  busy = false,
  onTakeOver,
  onTimeline,
  onClaim,
  onReassign,
}: {
  exceptions: Exception[]
  refreshSeconds: number
  /** Disables the actions while one of them is saving. */
  busy?: boolean
  onTakeOver: (exception: Exception) => void
  onTimeline: (exception: Exception) => void
  onClaim: (exception: Exception) => void
  onReassign: (exception: Exception) => void
}) {
  const now = useNow()

  function actionsFor(exception: Exception) {
    if (exception.severity === 1) {
      return (
        <>
          <Button variant="danger" disabled={busy} onClick={() => onTakeOver(exception)}>
            Take over
          </Button>
          <Button onClick={() => onTimeline(exception)}>Timeline</Button>
        </>
      )
    }
    if (exception.severity === 2) {
      return (
        <>
          <Button variant="primary" disabled={busy || exception.responder !== undefined} onClick={() => onClaim(exception)}>
            Claim
          </Button>
          <Button disabled={busy || exception.visitId === undefined} onClick={() => onReassign(exception)}>
            Reassign visit
          </Button>
        </>
      )
    }
    return undefined
  }

  return (
    <section aria-labelledby="exception-queue-title">
      <SectionHeader
        id="exception-queue-title"
        title="Exception queue"
        meta={`auto-refresh ${refreshSeconds}s`}
        metaAlign="end"
      />
      <div className={styles.list}>
        {[...exceptions].sort(byUrgency).map((exception) => (
          <ExceptionCard
            key={exception.id}
            id={exception.id}
            severity={exception.severity}
            title={exception.title}
            description={exception.description}
            meta={metaFor(exception, now)}
            countdown={formatCountdown(Date.parse(exception.deadline) - now)}
            actions={actionsFor(exception)}
          />
        ))}
      </div>
    </section>
  )
}
