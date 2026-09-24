import { useMemo, useState } from 'react'
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
import { getAssignment, removeAssignment } from '../data/caregivers'
import { AssignCaregiverModal } from './AssignCaregiverModal'
import { RemoveCaregiverModal } from '../components/RemoveCaregiverModal'
import { StopCarePlanModal } from '../components/StopCarePlanModal'
import styles from './Elders.module.css'

type PlanFilter = 'all' | PlanStatus
type SortOrder = 'name' | 'name-desc' | 'next-visit' | 'plan-status'

const PLAN_FILTER_LABELS: Record<PlanFilter, string> = {
  all: 'any',
  published: 'published',
  draft: 'draft',
  stopped: 'stopped',
  none: 'none',
}

const SORT_LABELS: Record<SortOrder, string> = {
  name: 'A–Z',
  'name-desc': 'Z–A',
  'next-visit': 'next visit',
  'plan-status': 'plan status',
}

const PLAN_STATUS_RANK: Record<PlanStatus, number> = { none: 0, draft: 1, published: 2, stopped: 3 }

/** nextVisitAt is an ISO "yyyy-MM-dd" string, so lexical order is chronological order. */
function nextVisitRank(value: string | null): string {
  return value ?? '9999-99-99'
}

function planBadgeLabel(status: PlanStatus, version: number | null): string {
  if (status === 'published') return `PUBLISHED v${version}`
  if (status === 'draft') return `DRAFT v${version}`
  if (status === 'stopped') return `STOPPED v${version}`
  return 'NO PLAN YET'
}

export default function Elders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('all')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [sort, setSort] = useState<SortOrder>('name')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [assignTarget, setAssignTarget] = useState<ElderRow | null>(null)
  const [removeTarget, setRemoveTarget] = useState<ElderRow | null>(null)
  const [stopTarget, setStopTarget] = useState<ElderRow | null>(null)

  const { data: elders = [], isLoading, isError, error } = useElders()

  const sectors = useMemo(() => Array.from(new Set(elders.map((e) => e.sector))).sort(), [elders])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const rows = elders.filter((e) => {
      if (sector !== 'all' && e.sector !== sector) return false
      if (planFilter !== 'all' && e.planStatus !== planFilter) return false
      if (q && !e.name.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false
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
    // No care plan outranks no caregiver (primaryCaregiver is always null today — rostering isn't
    // wired up yet — so this pass is a no-op for now, but stays correct once it is).
    sorted.sort((a, b) => (a.primaryCaregiver ? 1 : 0) - (b.primaryCaregiver ? 1 : 0))
    sorted.sort((a, b) => (a.planStatus === 'none' ? 0 : 1) - (b.planStatus === 'none' ? 0 : 1))
    // A stopped plan is history, not something to act on, so those elders sink to the bottom.
    sorted.sort((a, b) => (a.planStatus === 'stopped' ? 1 : 0) - (b.planStatus === 'stopped' ? 1 : 0))
    return sorted
  }, [elders, query, sector, planFilter, sort])

  const eldersWithoutPublishedPlan = useMemo(
    () => elders.filter((e) => e.planStatus !== 'published').length,
    [elders],
  )

  const selected: ElderRow | undefined = selectedId
    ? elders.find((e) => e.id === selectedId)
    : undefined
  const selectedAssignment = selected ? getAssignment(selected.id) : undefined

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
    setSector('all')
    setPlanFilter('all')
  }

  return (
    <ManagerShell>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <div className={styles.topBar}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>Elders</h1>
                <p className={styles.subtitle}>
                  {elders.length} elders · {eldersWithoutPublishedPlan} without a published plan
                </p>
              </div>
              <button className={styles.addElderBtn}>Add elder</button>
            </div>

            <div className={styles.filtersRow}>
              <div className={styles.searchBox}>
                <svg width="13" height="13" viewBox="0 0 15 15">
                  <circle cx="6.6" cy="6.6" r="4.8" fill="none" stroke="#9a9a9a" strokeWidth="1.4" />
                  <path d="M10.2 10.2l3 3" stroke="#9a9a9a" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  className={styles.searchInput}
                  placeholder="Search elders by name or ID"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className={styles.dropdown}>
                <span className={styles.dropdownLabel}>
                  sector: {sector === 'all' ? 'all' : sector}
                </span>
                <span className={styles.dropdownCaret}>▾</span>
                <select
                  className={styles.dropdownSelect}
                  value={sector}
                  onChange={(e) => setSector(e.target.value)}
                  aria-label="Filter by sector"
                >
                  <option value="all">all</option>
                  {sectors.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.dropdown}>
                <span className={styles.dropdownLabel}>plan: {PLAN_FILTER_LABELS[planFilter]}</span>
                <span className={styles.dropdownCaret}>▾</span>
                <select
                  className={styles.dropdownSelect}
                  value={planFilter}
                  onChange={(e) => setPlanFilter(e.target.value as PlanFilter)}
                  aria-label="Filter by plan status"
                >
                  <option value="all">any</option>
                  <option value="published">published</option>
                  <option value="draft">draft</option>
                  <option value="none">none</option>
                </select>
              </div>

              <div className={styles.dropdown}>
                <span className={styles.dropdownLabel}>{SORT_LABELS[sort]}</span>
                <span className={styles.dropdownCaret}>▾</span>
                <select
                  className={styles.dropdownSelect}
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortOrder)}
                  aria-label="Sort order"
                >
                  <option value="name">A–Z</option>
                  <option value="name-desc">Z–A</option>
                  <option value="next-visit">next visit</option>
                  <option value="plan-status">plan status</option>
                </select>
              </div>
            </div>
          </div>

          <div className={styles.table}>
            <div className={styles.tableHeaderRow}>
              <span>Elder</span>
              <span>Sector</span>
              <span>Care plan</span>
              <span>Primary caregiver</span>
              <span className={styles.alignRight}>Next visit</span>
            </div>

            {isLoading ? (
              <div className={styles.emptyState}>Loading elders…</div>
            ) : isError ? (
              <div className={styles.emptyState}>
                Could not load elders{error instanceof Error ? `: ${error.message}` : ''}.
              </div>
            ) : filtered.length === 0 ? (
              <div className={styles.emptyState}>
                {query.trim()
                  ? `No elders match "${query.trim()}"${sector !== 'all' ? ` in sector ${sector}` : ''}.`
                  : 'No elders match these filters.'}{' '}
                <button className={styles.clearLink} onClick={clearFilters}>
                  Clear filters
                </button>
              </div>
            ) : (
              filtered.map((e) => {
                const isSelected = e.id === selectedId
                const isHovered = e.id === hoveredId && !isSelected
                return (
                  <div
                    key={e.id}
                    className={[
                      styles.row,
                      e.planStatus === 'none' && styles.noPlan,
                      isHovered && styles.hovered,
                      isSelected && styles.selected,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                    onMouseEnter={() => setHoveredId(e.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => setSelectedId(e.id)}
                  >
                    <div className={styles.rowAvatarWrap}>
                      <div className={[styles.rowAvatar, isSelected && styles.selected].filter(Boolean).join(' ')} />
                      <div>
                        <div className={styles.rowName}>{e.name}</div>
                        <div className={[styles.rowMeta, isSelected && styles.selected].filter(Boolean).join(' ')}>
                          {e.age} y.o. — {e.street}
                        </div>
                      </div>
                    </div>
                    <span className={[styles.rowSector, isSelected && styles.selected].filter(Boolean).join(' ')}>
                      {e.sector}
                    </span>
                    <span className={[styles.badge, styles[e.planStatus]].filter(Boolean).join(' ')}>
                      {planBadgeLabel(e.planStatus, e.planVersion)}
                    </span>
                    <span
                      className={[styles.rowCaregiver, !e.primaryCaregiver && styles.unassigned]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {e.primaryCaregiver ?? 'unassigned'}
                    </span>
                    <span
                      className={[styles.rowNextVisit, !e.nextVisitAt && styles.unassigned]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {formatNextVisit(e.nextVisitAt) ?? '—'}
                    </span>
                  </div>
                )
              })
            )}
          </div>

          <div className={styles.tableFooter}>
            {filtered.length} of {elders.length} shown{query.trim() ? ` · matching "${query.trim()}"` : ''}
          </div>
        </div>

        <div className={styles.rail}>
          <div className={styles.railEyebrow}>Selected</div>

          {!selected ? (
            <p className={styles.railEmpty}>Select an elder to preview their care plan.</p>
          ) : (
            <>
              <div className={styles.selectedHeader}>
                <div className={styles.avatarLg} />
                <div>
                  <div className={styles.selectedName}>{selected.name}</div>
                  <div className={styles.selectedMeta}>
                    {selected.age} y.o. — {selected.street || 'no address on file'}
                  </div>
                </div>
              </div>

              <div className={`${styles.card} ${styles.first}`}>
                {selected.planStatus === 'none' || !selectedLatestPlan ? (
                  <p className={styles.cardMuted}>No plan published yet.</p>
                ) : (
                  <>
                    <div className={styles.cardHeaderRow}>
                      <span className={styles.cardTitle}>Care plan v{selectedLatestPlan.version}</span>
                      <span className={[styles.planStatusBadge, styles[selected.planStatus]].join(' ')}>
                        {selected.planStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.statList}>
                      <div className={styles.statRow}>
                        <span>visits per week</span>
                        <span className={styles.statValue}>{visitsPerWeekOfTree(selectedTree)}</span>
                      </div>
                      <div className={styles.statRow}>
                        <span>effort per week</span>
                        <span className={styles.statValue}>
                          {formatHoursMinutes(weeklyHoursOfTree(selectedTree))}
                        </span>
                      </div>
                      <div className={styles.statRow}>
                        <span>tasks</span>
                        <span className={styles.statValue}>
                          {countTree(selectedTree).tasks} in {countTree(selectedTree).subPlans} sub-plans
                        </span>
                      </div>
                      <div className={styles.statRow}>
                        <span>last edited</span>
                        <span className={styles.statValue}>{formatDate(selectedLatestPlan.updatedAt)}</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.card}>
                <span className={styles.cardTitle}>Family contacts</span>
                <div className={styles.contactList}>
                  <p className={styles.cardMuted}>No family contacts on file yet.</p>
                </div>
              </div>

              {selected.primaryCaregiver && (
                <div className={styles.card}>
                  <div className={styles.cardHeaderRow}>
                    <span className={styles.cardTitle}>Primary caregiver</span>
                    <div className={styles.cardHeaderActions}>
                      <button className={styles.cardLink} onClick={() => setAssignTarget(selected)}>
                        Assign…
                      </button>
                      <button className={styles.cardLinkDanger} onClick={() => setRemoveTarget(selected)}>
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className={styles.caregiverRow}>
                    <div className={styles.caregiverAvatarSm} />
                    <div className={styles.caregiverName}>
                      {selected.primaryCaregiver}
                      {selectedAssignment && (
                        <span className={styles.caregiverSince}> · since {selectedAssignment.since}</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.primaryBtn}
                  onClick={() => navigate(`/manager/elders/${selected.id}`)}
                >
                  {selected.planStatus === 'none' ? 'Create care plan' : 'Open care plan'}
                </button>
                <button className={styles.secondaryBtn}>View visit history</button>
                {!selected.primaryCaregiver && selected.planStatus !== 'none' && selected.planStatus !== 'stopped' && (
                  <button className={styles.assignCaregiverBtn} onClick={() => setAssignTarget(selected)}>
                    Assign caregiver
                  </button>
                )}
              </div>

              {selected.planStatus === 'published' && (
                <button className={styles.dangerBtn} onClick={() => setStopTarget(selected)}>
                  Stop care plan
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {assignTarget && (
        <AssignCaregiverModal
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
        <RemoveCaregiverModal
          caregiverName={removeTarget.primaryCaregiver}
          elderName={removeTarget.name}
          onCancel={() => setRemoveTarget(null)}
          onConfirm={() => {
            removeAssignment(removeTarget.id)
            queryClient.invalidateQueries({ queryKey: ['elders'] })
            setRemoveTarget(null)
          }}
        />
      )}

      {stopTarget && (
        <StopCarePlanModal
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
