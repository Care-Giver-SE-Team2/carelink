import { useEffect, useMemo, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ManagerShell } from '../components/ManagerShell'
import type { ElderRow, PlanStatus } from '../data/elders'
import {
  countTree,
  formatHoursMinutes,
  fromCarePlanNodeResponses,
  visitsPerWeekOfTree,
  weeklyHoursOfTree,
} from '../lib/planTree'
import { useElders } from '../lib/useElders'
import { formatDate, formatNextVisit } from '../lib/nextVisit'
import { fetchCarePlanNodes, fetchLatestCarePlan } from '../../../shared/api/careplan'
import { removePrimaryCaregiver } from '../../../shared/api/profile'
import {
  Avatar,
  Badge,
  BodyText,
  Button,
  Callout,
  Card,
  Eyebrow,
  IdentityHeader,
  KeyValueList,
  ListRow,
  MetaText,
  PageHeader,
  PersonCard,
  SearchField,
  Select,
  SidePanel,
  SplitLayout,
} from '../../../shared/components/ui'
import { CaregiverPickerModal } from '../components/CaregiverPickerModal'
import { EmptyAssignSlot } from '../components/EmptyAssignSlot'
import { RemoveCaregiverDialog } from '../components/RemoveCaregiverDialog'
import { StopCarePlanButton } from '../components/StopCarePlanButton'
import { StopCarePlanDialog } from '../components/StopCarePlanDialog'
import styles from './Elders.module.css'

type PlanFilter = 'all' | PlanStatus
type SortOrder = 'name' | 'name-desc' | 'next-visit' | 'plan-status'

const PLAN_FILTER_OPTIONS: { value: PlanFilter; label: string }[] = [
  { value: 'all', label: 'any' },
  { value: 'published', label: 'published' },
  { value: 'draft', label: 'draft' },
  { value: 'none', label: 'none' },
]

const SORT_OPTIONS: { value: SortOrder; label: string }[] = [
  { value: 'name', label: 'A–Z' },
  { value: 'name-desc', label: 'Z–A' },
  { value: 'next-visit', label: 'next visit' },
  { value: 'plan-status', label: 'plan status' },
]

const PLAN_STATUS_RANK: Record<PlanStatus, number> = { none: 0, draft: 1, published: 2, stopped: 3 }

const SEARCH_DEBOUNCE_MS = 200

/** nextVisitAt is an ISO "yyyy-MM-dd" string, so lexical order is chronological order. */
function nextVisitRank(value: string | null): string {
  return value ?? '9999-99-99'
}

function rowDomId(elderId: string): string {
  return `elder-row-${elderId}`
}

/**
 * Elders index — UC-MG01's entry point. The manager finds an elder, previews their plan in
 * the rail, and opens it (or creates one). ↑/↓ move the selection, Enter opens the plan.
 */
export default function Elders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [sector, setSector] = useState('all')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [sort, setSort] = useState<SortOrder>('name')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<ElderRow | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ElderRow | null>(null)
  const [stopTarget, setStopTarget] = useState<ElderRow | null>(null)
  const [removeError, setRemoveError] = useState<string | null>(null)

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQuery(query), SEARCH_DEBOUNCE_MS)
    return () => clearTimeout(id)
  }, [query])

  const { data: elders = [], isLoading, isError, error } = useElders()

  const sectors = useMemo(() => Array.from(new Set(elders.map((e) => e.sector))).sort(), [elders])
  const q = debouncedQuery.trim()

  const filtered = useMemo(() => {
    const needle = q.toLowerCase()
    const rows = elders.filter((e) => {
      if (sector !== 'all' && e.sector !== sector) return false
      if (planFilter !== 'all' && e.planStatus !== planFilter) return false
      if (needle && !e.name.toLowerCase().includes(needle) && !e.id.toLowerCase().includes(needle)) return false
      return true
    })
    const sorted = [...rows]
    if (sort === 'name') sorted.sort((a, b) => a.name.localeCompare(b.name))
    else if (sort === 'name-desc') sorted.sort((a, b) => b.name.localeCompare(a.name))
    else if (sort === 'next-visit')
      sorted.sort((a, b) => nextVisitRank(a.nextVisitAt).localeCompare(nextVisitRank(b.nextVisitAt)))
    else if (sort === 'plan-status')
      sorted.sort((a, b) => PLAN_STATUS_RANK[a.planStatus] - PLAN_STATUS_RANK[b.planStatus])
    // Elders needing attention float to the top, regardless of the chosen sort — each stable
    // sort only reorders across its own boundary, so the chosen order still holds within a group.
    // No care plan outranks no caregiver.
    sorted.sort((a, b) => (a.primaryCaregiver ? 1 : 0) - (b.primaryCaregiver ? 1 : 0))
    sorted.sort((a, b) => (a.planStatus === 'none' ? 0 : 1) - (b.planStatus === 'none' ? 0 : 1))
    // A stopped plan is history, not something to act on, so those elders sink to the bottom.
    sorted.sort((a, b) => (a.planStatus === 'stopped' ? 1 : 0) - (b.planStatus === 'stopped' ? 1 : 0))
    return sorted
  }, [elders, q, sector, planFilter, sort])

  const eldersWithoutPublishedPlan = useMemo(
    () => elders.filter((e) => e.planStatus !== 'published').length,
    [elders],
  )

  const selected: ElderRow | undefined = selectedId ? elders.find((e) => e.id === selectedId) : undefined

  const { data: selectedLatestPlan } = useQuery({
    queryKey: ['carePlan', 'latest', selected?.id],
    queryFn: () => fetchLatestCarePlan(selected!.id),
    enabled: selected != null,
  })

  const { data: selectedPlanNodes } = useQuery({
    queryKey: ['carePlan', 'nodes', selectedLatestPlan?.id],
    queryFn: () => fetchCarePlanNodes(selectedLatestPlan!.id),
    enabled: selectedLatestPlan != null,
  })

  const selectedTree = useMemo(
    () => (selectedPlanNodes ? fromCarePlanNodeResponses(selectedPlanNodes) : []),
    [selectedPlanNodes],
  )

  function clearFilters() {
    setQuery('')
    setDebouncedQuery('')
    setSector('all')
    setPlanFilter('all')
  }

  function openCarePlan(elder: ElderRow) {
    navigate(`/manager/elders/${elder.id}`)
  }

  function handleListKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (filtered.length === 0) return
    const index = filtered.findIndex((row) => row.id === selectedId)
    let next: ElderRow | undefined
    if (e.key === 'ArrowDown') next = filtered[Math.min(index + 1, filtered.length - 1)]
    else if (e.key === 'ArrowUp') next = filtered[Math.max(index - 1, 0)]
    else if (e.key === 'Enter' && selected) {
      e.preventDefault()
      openCarePlan(selected)
      return
    }
    if (!next) return
    e.preventDefault()
    setSelectedId(next.id)
    document.getElementById(rowDomId(next.id))?.scrollIntoView?.({ block: 'nearest' })
  }

  const header = (
    <PageHeader
      title="Elders"
      meta={`${elders.length} elders · ${eldersWithoutPublishedPlan} without a published plan`}
      actions={
        <Button variant="primary" size="md">
          Add elder
        </Button>
      }
      toolbar={
        <div className={styles.filters}>
          <SearchField
            className={styles.search}
            placeholder="Search elders by name or ID"
            value={query}
            onChange={setQuery}
          />
          <Select
            variant="filter"
            prefix="sector"
            aria-label="Filter by sector"
            value={sector}
            onChange={setSector}
            options={[{ value: 'all', label: 'all' }, ...sectors.map((s) => ({ value: s, label: s }))]}
          />
          <Select
            variant="filter"
            prefix="plan"
            aria-label="Filter by plan status"
            value={planFilter}
            onChange={(v) => setPlanFilter(v as PlanFilter)}
            options={PLAN_FILTER_OPTIONS}
          />
          <Select
            variant="filter"
            aria-label="Sort order"
            value={sort}
            onChange={(v) => setSort(v as SortOrder)}
            options={SORT_OPTIONS}
          />
        </div>
      }
    />
  )

  let body
  if (isLoading) {
    body = <MetaText className={styles.empty}>Loading elders…</MetaText>
  } else if (isError) {
    body = (
      <MetaText className={styles.empty}>
        Could not load elders{error instanceof Error ? `: ${error.message}` : ''}.
      </MetaText>
    )
  } else if (filtered.length === 0) {
    body = (
      <div className={styles.empty}>
        <MetaText>
          {q
            ? `No elders match "${q}"${sector !== 'all' ? ` in sector ${sector}` : ''}.`
            : 'No elders match these filters.'}
        </MetaText>
        <Button variant="ghost" onClick={clearFilters}>
          Clear filters
        </Button>
      </div>
    )
  } else {
    body = filtered.map((e) => (
      <ListRow
        key={e.id}
        id={rowDomId(e.id)}
        selected={e.id === selectedId}
        onClick={() => setSelectedId(e.id)}
        leading={<Avatar size={34} />}
        title={e.name}
        meta={`${e.age} y.o. · ${e.street || 'no address on file'}`}
        cells={[
          <MetaText key="sector" as="span">
            {e.sector}
          </MetaText>,
          <span key="plan" className={styles.badgeCell}>
            <Badge status={e.planStatus} version={e.planVersion} />
          </span>,
          <span key="caregiver" className={styles.optional}>
            {e.primaryCaregiver ? (
              <BodyText>{e.primaryCaregiver}</BodyText>
            ) : (
              <MetaText tone="faint" as="span">
                unassigned
              </MetaText>
            )}
          </span>,
          <MetaText key="next" as="span" tone={e.nextVisitAt ? 'default' : 'faint'} className={styles.nextVisit}>
            {formatNextVisit(e.nextVisitAt) ?? '—'}
          </MetaText>,
        ]}
      />
    ))
  }

  const main = (
    <>
      {header}
      <div className={styles.table}>
        <div className={styles.rows}>
          <div className={styles.headerRow} aria-hidden="true">
            <Eyebrow>Elder</Eyebrow>
            <Eyebrow>Sector</Eyebrow>
            <Eyebrow>Care plan</Eyebrow>
            <Eyebrow className={styles.optional}>Primary caregiver</Eyebrow>
            <Eyebrow className={styles.nextVisit}>Next visit</Eyebrow>
          </div>
          <div
            role="listbox"
            aria-label="Elders"
            tabIndex={0}
            className={styles.listbox}
            aria-activedescendant={selected ? rowDomId(selected.id) : undefined}
            onKeyDown={handleListKeyDown}
          >
            {body}
          </div>
        </div>
      </div>
      <MetaText tone="faint" className={styles.footer}>
        {filtered.length} of {elders.length} shown{q ? ` · matching "${q}"` : ''}
      </MetaText>
    </>
  )

  const rail = !selected ? (
    <SidePanel
      label="Selected elder"
      sections={[
        <div key="empty" className={styles.railGroup}>
          <Eyebrow>Selected</Eyebrow>
          <MetaText tone="faint">Select an elder to preview their care plan.</MetaText>
        </div>,
      ]}
    />
  ) : (
    <SidePanel
      label="Selected elder"
      sections={[
        <div key="identity" className={styles.railGroup}>
          <Eyebrow>Selected</Eyebrow>
          <IdentityHeader
            name={selected.name}
            meta={`${selected.age} y.o. · ${selected.street || 'no address on file'}`}
          />
        </div>,
        selected.planStatus === 'none' || !selectedLatestPlan ? (
          <Card key="plan">
            <MetaText>No plan published yet.</MetaText>
          </Card>
        ) : (
          <Card
            key="plan"
            title={`Care plan v${selectedLatestPlan.version}`}
            trailing={<Badge status={selected.planStatus} />}
          >
            <KeyValueList
              items={[
                { label: 'visits per week', value: visitsPerWeekOfTree(selectedTree) },
                { label: 'effort per week', value: formatHoursMinutes(weeklyHoursOfTree(selectedTree)) },
                {
                  label: 'tasks',
                  value: `${countTree(selectedTree).tasks} in ${countTree(selectedTree).subPlans} sub-plans`,
                },
                { label: 'last edited', value: formatDate(selectedLatestPlan.updatedAt) },
              ]}
            />
          </Card>
        ),
        selected.primaryCaregiver ? (
          <PersonCard
            key="caregiver"
            name={selected.primaryCaregiver}
            role="Primary caregiver"
            meta={selected.primaryCaregiverSince ? `since ${formatDate(selected.primaryCaregiverSince)}` : undefined}
            actions={
              <>
                <Button onClick={() => setAssignTarget(selected)}>Change</Button>
                <Button variant="dangerOutline" onClick={() => setRemoveTarget(selected)}>
                  Remove
                </Button>
              </>
            }
          />
        ) : (
          selected.planStatus !== 'none' &&
          selected.planStatus !== 'stopped' && (
            <EmptyAssignSlot
              key="caregiver"
              message="No primary caregiver"
              actionLabel="Assign caregiver"
              onAction={() => setAssignTarget(selected)}
            />
          )
        ),
        removeError && (
          <Callout key="removeError" tone="danger" role="alert">
            {removeError}
          </Callout>
        ),
        <Card key="family" title="Family contacts">
          <MetaText>No family contacts on file yet.</MetaText>
        </Card>,
        <div key="actions" className={styles.railActions}>
          <Button block variant="primary" onClick={() => openCarePlan(selected)}>
            {selected.planStatus === 'none' ? 'Create care plan' : 'Open care plan'}
          </Button>
          <Button block variant="secondary">
            View visit history
          </Button>
        </div>,
      ]}
      footer={
        <>
          {selected.planStatus === 'published' && (
            <StopCarePlanButton onClick={() => setStopTarget(selected)} />
          )}
          <MetaText tone="faint">Opening a record is written to the audit log with your name and the time.</MetaText>
        </>
      }
    />
  )

  return (
    <ManagerShell>
      <SplitLayout main={main} rail={rail} />

      {assignTarget && (
        <CaregiverPickerModal
          elder={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssign={() => {
            queryClient.invalidateQueries({ queryKey: ['elders'] })
            setAssignTarget(null)
          }}
          onRemove={() => {
            queryClient.invalidateQueries({ queryKey: ['elders'] })
            setAssignTarget(null)
          }}
        />
      )}

      {removeTarget && removeTarget.primaryCaregiver && (
        <RemoveCaregiverDialog
          caregiverName={removeTarget.primaryCaregiver}
          elderName={removeTarget.name}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={async () => {
            const target = removeTarget
            setRemoveTarget(null)
            setRemoveError(null)
            try {
              await removePrimaryCaregiver(target.id)
              queryClient.invalidateQueries({ queryKey: ['elders'] })
            } catch (e) {
              setRemoveError(
                `Could not remove ${target.primaryCaregiver} from ${target.name}${e instanceof Error ? `: ${e.message}` : ''}.`,
              )
            }
          }}
        />
      )}

      {stopTarget && (
        <StopCarePlanDialog
          elder={stopTarget}
          onClose={() => setStopTarget(null)}
          onStopped={() => {
            queryClient.invalidateQueries({ queryKey: ['elders'] })
            setStopTarget(null)
          }}
        />
      )}
    </ManagerShell>
  )
}
