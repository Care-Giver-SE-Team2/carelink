import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Button, Callout, KpiStrip, MetaText, Modal, SectionHeader } from '../../../shared/components/ui'
import type { KpiItem } from '../../../shared/components/ui'
import { CaregiverPickerModal } from '../components/CaregiverPickerModal'
import { ManagerShell } from '../components/ManagerShell'
import { EscalationChain } from '../components/EscalationChain'
import { ExceptionQueue } from '../components/ExceptionQueue'
import { ModelSuggestionBanner } from '../components/ModelSuggestionBanner'
import { VisitRosterTable } from '../components/VisitRosterTable'
import { claimException, reassignVisit } from '../data/today'
import type { Exception, Kpis, Visit } from '../data/today'
import { byUrgency } from '../lib/clock'
import { useCurrentUser } from '../lib/useCurrentUser'
import {
  EXCEPTION_REFRESH_SECONDS,
  useEscalationChain,
  useExceptionQueue,
  useTodayKpis,
  useTodayRoster,
} from '../lib/useTodayBoard'
import styles from './Today.module.css'

function kpiItems(kpis: Kpis | undefined): KpiItem[] {
  const value = (n: number | undefined) => n ?? '—'
  return [
    { label: 'Visits scheduled', value: value(kpis?.scheduled) },
    { label: 'Completed', value: value(kpis?.completed) },
    { label: 'Unassigned', value: value(kpis?.unassigned), tone: 'info' },
    { label: 'Open exceptions', value: value(kpis?.openExceptions), tone: 'danger' },
    { label: 'Escalated', value: value(kpis?.escalated), tone: 'danger' },
  ]
}

/** The exception's workbench, keyed by the numeric part of its id: EXC-2088 → 2088. */
function workbenchPath(exception: Exception): string {
  return '/manager/exceptions/' + exception.id.replace(/^EXC-/, '')
}

/**
 * Today board — MG03/MG04/MG05: headline figures, today's visit roster beside the live
 * exception queue, and the escalation chain for the top SEV 1 exception.
 */
export default function Today() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: currentUser } = useCurrentUser()
  const roster = useTodayRoster()
  const kpis = useTodayKpis()
  const exceptions = useExceptionQueue()

  const topSev1 = exceptions.data?.filter((e) => e.severity === 1).sort(byUrgency)[0]
  const chain = useEscalationChain(topSev1?.id)

  const [busy, setBusy] = useState(false)
  const [reviewingSuggestion, setReviewingSuggestion] = useState(false)
  const [reassigning, setReassigning] = useState<{ exception: Exception; visit: Visit } | null>(null)

  const refreshBoard = () => queryClient.invalidateQueries({ queryKey: ['exceptions'] })

  async function claim(exception: Exception) {
    if (!currentUser) return
    setBusy(true)
    try {
      await claimException(exception.id, currentUser.displayName)
      await refreshBoard()
    } finally {
      setBusy(false)
    }
  }

  async function takeOver(exception: Exception) {
    await claim(exception)
    navigate(workbenchPath(exception))
  }

  function openReassign(exception: Exception) {
    const visit = roster.data?.visits.find((v) => v.id === exception.visitId)
    if (visit) setReassigning({ exception, visit })
  }

  function finishReassign() {
    setReassigning(null)
    void queryClient.invalidateQueries({ queryKey: ['roster'] })
    void queryClient.invalidateQueries({ queryKey: ['kpis'] })
  }

  const unassigned = kpis.data?.unassigned ?? 0
  const rosterData = roster.data

  return (
    <ManagerShell>
      <KpiStrip items={kpiItems(kpis.data)} label="Today at a glance" />

      <div className={styles.board}>
        <section className={styles.roster} aria-labelledby="visit-roster-title">
          <SectionHeader
            id="visit-roster-title"
            title="Visit roster"
            actions={
              <>
                <Button onClick={() => navigate('/manager/roster')}>Re-roster absence</Button>
                <Button variant="model" onClick={() => setReviewingSuggestion(true)}>
                  Suggest roster
                </Button>
              </>
            }
          />
          {unassigned > 0 && (
            <div className={styles.banner}>
              <ModelSuggestionBanner
                onReview={() => setReviewingSuggestion(true)}
                text={
                  <>
                    Suggestion for the {unassigned} unassigned visits — objective{' '}
                    <strong>continuity of caregiver</strong>. Constraints honoured: dialect, postal sector band,
                    certification. Rule-engine fallback available if the model service is down.
                  </>
                }
              />
            </div>
          )}
          <VisitRosterTable
            visits={rosterData?.visits ?? []}
            empty={roster.isError ? 'Could not load today’s roster.' : roster.isPending ? 'Loading today’s roster…' : 'No visits today.'}
            footer={
              rosterData &&
              `${rosterData.totalToday - rosterData.visits.length} further visits today · filtered to sector ${rosterData.sectors.join(' / ')}`
            }
          />
        </section>

        <div>
          {exceptions.data ? (
            <ExceptionQueue
              exceptions={exceptions.data}
              refreshSeconds={EXCEPTION_REFRESH_SECONDS}
              busy={busy}
              onTakeOver={takeOver}
              onTimeline={(exception) => navigate(workbenchPath(exception))}
              onClaim={claim}
              onReassign={openReassign}
            />
          ) : (
            <MetaText className={styles.note}>
              {exceptions.isError ? 'Could not load the exception queue.' : 'Loading the exception queue…'}
            </MetaText>
          )}
          {topSev1 && chain.data && chain.data.length > 0 && (
            <EscalationChain exceptionId={topSev1.id} steps={chain.data} />
          )}
        </div>
      </div>

      {reviewingSuggestion && (
        <Modal
          eyebrow="Model suggestion"
          eyebrowTone="accent"
          title="Review suggested roster"
          meta={`${unassigned} unassigned visits · objective continuity of caregiver`}
          onClose={() => setReviewingSuggestion(false)}
          footer={
            <Button variant="ghost" size="md" onClick={() => setReviewingSuggestion(false)}>
              Close
            </Button>
          }
        >
          <Callout tone="info">The suggestion review screen hasn’t been designed yet.</Callout>
        </Modal>
      )}

      {reassigning && (
        <CaregiverPickerModal
          eyebrow={`Reassign visit · ${reassigning.exception.id}`}
          elder={{
            id: '',
            name: `${reassigning.visit.elder.name} · ${reassigning.visit.time}`,
            sector: reassigning.visit.elder.sector,
            primaryCaregiver: reassigning.visit.caregiver?.name ?? null,
            primaryCaregiverId: null,
            primaryCaregiverSince: null,
          }}
          assign={(caregiver) => reassignVisit(reassigning.visit.id, caregiver.fullName)}
          onAssign={finishReassign}
          onRemove={finishReassign}
          onClose={() => setReassigning(null)}
        />
      )}
    </ManagerShell>
  )
}
