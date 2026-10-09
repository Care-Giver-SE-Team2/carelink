import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Callout, KpiStrip, SectionHeader } from '../../../shared/components/ui'
import type { KpiItem } from '../../../shared/components/ui'
import { AssignOpenVisitModal } from '../components/AssignOpenVisitModal'
import { ManagerShell } from '../components/ManagerShell'
import { VisitRosterTable } from '../components/VisitRosterTable'
import type { Kpis, Visit } from '../data/today'
import { useTodayKpis, useTodayRoster } from '../lib/useTodayBoard'

const EXCEPTIONS_TAB = '/manager/exceptions'

function kpiItems(kpis: Kpis | undefined): KpiItem[] {
  const value = (n: number | undefined) => n ?? '—'
  return [
    { label: 'Visits scheduled', value: value(kpis?.scheduled) },
    { label: 'Completed', value: value(kpis?.completed) },
    { label: 'Unassigned', value: value(kpis?.unassigned), tone: 'info' },
    { label: 'Open exceptions', value: value(kpis?.openExceptions), tone: 'danger', href: EXCEPTIONS_TAB },
  ]
}

/**
 * Today board — MG03/MG04: headline figures above today's visit roster. Exceptions are
 * worked in the Exceptions tab; the exception figures here link there. A visit nobody holds
 * that has not started can be assigned from its row.
 */
export default function Today() {
  const navigate = useNavigate()
  const roster = useTodayRoster()
  const kpis = useTodayKpis()
  const rosterData = roster.data
  const [assigning, setAssigning] = useState<Visit | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  return (
    <ManagerShell>
      <KpiStrip items={kpiItems(kpis.data)} label="Today at a glance" />

      <section aria-labelledby="visit-roster-title">
        <SectionHeader
          id="visit-roster-title"
          title="Visit roster"
          actions={<Button onClick={() => navigate('/manager/roster')}>Re-roster absence</Button>}
        />
        {notice && (
          <Callout tone="info" role="status">
            {notice}
          </Callout>
        )}
        <VisitRosterTable
          visits={rosterData?.visits ?? []}
          onAssign={(visit) => {
            setNotice(null)
            setAssigning(visit)
          }}
          empty={roster.isError ? 'Could not load today’s roster.' : roster.isPending ? 'Loading today’s roster…' : 'No visits today.'}
          footer={
            rosterData &&
            rosterData.visits.length > 0 &&
            `${rosterData.visits.length} visits today · sector ${rosterData.sectors.join(' / ')}`
          }
        />
      </section>
      {assigning && (
        <AssignOpenVisitModal
          visit={{
            id: Number(assigning.id),
            elderName: assigning.elder.name,
            service: assigning.service,
            when: `Today · ${assigning.time}`,
          }}
          onClose={() => setAssigning(null)}
          onAssigned={(caregiverName) => {
            setNotice(`${caregiverName} is now on ${assigning.elder.name}'s ${assigning.service} at ${assigning.time}.`)
            setAssigning(null)
          }}
        />
      )}
    </ManagerShell>
  )
}
