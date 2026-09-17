import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ManagerShell } from '../components/ManagerShell'
import headerStyles from '../components/Header.module.css'
import {
  ELDER_DETAILS,
  TOTAL_ELDERS_IN_SECTORS,
  ELDERS_WITHOUT_PUBLISHED_PLAN,
  isOutOfSector,
} from '../data/elders'
import type { ElderRow, PlanStatus } from '../data/elders'
import { CARE_PLANS } from '../data/carePlans'
import { countTree, formatHoursMinutes, weeklyHoursOfTree } from '../lib/planTree'
import { useElders } from '../lib/useElders'
import styles from './Elders.module.css'

type PlanFilter = 'all' | PlanStatus
type SortOrder = 'name' | 'name-desc' | 'next-visit' | 'plan-status'

const PLAN_FILTER_LABELS: Record<PlanFilter, string> = {
  all: 'any',
  published: 'published',
  draft: 'draft',
  none: 'none',
}

const SORT_LABELS: Record<SortOrder, string> = {
  name: 'A–Z',
  'name-desc': 'Z–A',
  'next-visit': 'next visit',
  'plan-status': 'plan status',
}

const NEXT_VISIT_RANK = ['today', 'tomorrow', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const PLAN_STATUS_RANK: Record<PlanStatus, number> = { none: 0, draft: 1, published: 2 }

function nextVisitRank(value: string | null): number {
  if (!value) return 99
  const first = value.toLowerCase().slice(0, 3)
  const idx = NEXT_VISIT_RANK.indexOf(first)
  return idx === -1 ? 50 : idx
}

function planBadgeLabel(status: PlanStatus, version: number | null): string {
  if (status === 'published') return `PUBLISHED v${version}`
  if (status === 'draft') return `DRAFT v${version}`
  return 'NO PLAN YET'
}

/**
 * Elders index (1c) — UC-MG01 step one. A manager searches their sectors for
 * an elder, previews that elder's plan in the rail, then opens it (routes to
 * CarePlan, 1d). See design_handoff_care_plan_authoring/README.md.
 */
export default function Elders() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [sector, setSector] = useState('all')
  const [planFilter, setPlanFilter] = useState<PlanFilter>('all')
  const [sort, setSort] = useState<SortOrder>('name')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)

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
    else if (sort === 'next-visit') sorted.sort((a, b) => nextVisitRank(a.nextVisitAt) - nextVisitRank(b.nextVisitAt))
    else if (sort === 'plan-status')
      sorted.sort((a, b) => PLAN_STATUS_RANK[a.planStatus] - PLAN_STATUS_RANK[b.planStatus])
    return sorted
  }, [elders, query, sector, planFilter, sort])

  const selected: ElderRow | undefined = selectedId
    ? elders.find((e) => e.id === selectedId)
    : undefined
  const selectedDetail = selected ? ELDER_DETAILS[selected.id] : undefined
  const selectedPlan = selected ? CARE_PLANS[selected.id] : undefined

  function clearFilters() {
    setQuery('')
    setSector('all')
    setPlanFilter('all')
  }

  const headerRight = (
    <div className={headerStyles.identityGroup}>
      <span className={headerStyles.userName}>Tan Mei Ling</span>
      <span className={headerStyles.roleBadge}>CARE MGR</span>
      <button className={headerStyles.logoutBtn}>Log out</button>
    </div>
  )

  return (
    <ManagerShell headerContext="Elders" headerRight={headerRight}>
      <div className={styles.layout}>
        <div className={styles.mainColumn}>
          <div className={styles.topBar}>
            <div className={styles.titleRow}>
              <div>
                <h1 className={styles.title}>Elders</h1>
                <p className={styles.subtitle}>
                  {TOTAL_ELDERS_IN_SECTORS} in your sectors · {ELDERS_WITHOUT_PUBLISHED_PLAN} without a
                  published plan
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
                const badgeClass =
                  isSelected && e.planStatus === 'published' ? styles.publishedDark : styles[e.planStatus]
                return (
                  <div
                    key={e.id}
                    className={[styles.row, isSelected && styles.selected, isHovered && styles.hovered]
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
                          {e.id} · {e.age} · {e.street}
                        </div>
                      </div>
                    </div>
                    <span className={[styles.rowSector, isSelected && styles.selected].filter(Boolean).join(' ')}>
                      {e.sector}
                    </span>
                    <span className={[styles.badge, badgeClass].filter(Boolean).join(' ')}>
                      {planBadgeLabel(e.planStatus, e.planVersion)}
                    </span>
                    <span
                      className={[
                        styles.rowCaregiver,
                        !e.primaryCaregiver && styles.unassigned,
                        isSelected && styles.selected,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {e.primaryCaregiver ?? 'unassigned'}
                    </span>
                    <span
                      className={[
                        styles.rowNextVisit,
                        !e.nextVisitAt && styles.unassigned,
                        isSelected && styles.selected,
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      {e.nextVisitAt ?? '—'}
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

          {!selected || !selectedDetail ? (
            <p className={styles.railEmpty}>Select an elder to preview their care plan.</p>
          ) : (
            <>
              {isOutOfSector(selected) && (
                <div className={styles.readOnlyBanner}>
                  Outside your sectors — you can view this plan but not edit it.
                </div>
              )}

              <div className={styles.selectedHeader}>
                <div className={styles.avatarLg} />
                <div>
                  <div className={styles.selectedName}>{selected.name}</div>
                  <div className={styles.selectedMeta}>
                    {selected.id} · {selected.age} · {selectedDetail.livingSituation}
                    <br />
                    {selectedDetail.addressFull}
                  </div>
                </div>
              </div>

              <div className={`${styles.card} ${styles.first}`}>
                {selected.planStatus === 'none' || !selectedPlan ? (
                  <p className={styles.cardMuted}>No plan published yet.</p>
                ) : (
                  <>
                    <div className={styles.cardHeaderRow}>
                      <span className={styles.cardTitle}>Care plan v{selectedPlan.version}</span>
                      <span className={[styles.planStatusBadge, styles[selected.planStatus]].join(' ')}>
                        {selected.planStatus.toUpperCase()}
                      </span>
                    </div>
                    <div className={styles.statList}>
                      <div className={styles.statRow}>
                        <span>visits per week</span>
                        <span className={styles.statValue}>{selectedPlan.visitsPerWeek}</span>
                      </div>
                      <div className={styles.statRow}>
                        <span>effort per week</span>
                        <span className={styles.statValue}>
                          {formatHoursMinutes(weeklyHoursOfTree(selectedPlan.tree))}
                        </span>
                      </div>
                      <div className={styles.statRow}>
                        <span>tasks</span>
                        <span className={styles.statValue}>
                          {countTree(selectedPlan.tree).tasks} in {countTree(selectedPlan.tree).subPlans} sub-plans
                        </span>
                      </div>
                      <div className={styles.statRow}>
                        <span>last edited</span>
                        <span className={styles.statValue}>
                          {selectedPlan.lastEditedAt} · {selectedPlan.lastEditedBy}
                        </span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              <div className={styles.card}>
                <span className={styles.cardTitle}>Family contacts</span>
                <div className={styles.contactList}>
                  {selectedDetail.contacts.map((c) => (
                    <div key={c.name} className={styles.contactRow}>
                      <span className={styles.contactName}>{c.name}</span>
                      <span>
                        {c.relation} · {c.access}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {selectedDetail.openExceptions.length > 0 && (
                <div className={styles.exceptionBanner}>
                  {selectedDetail.openExceptions.length === 1
                    ? `1 open exception on this elder — ${selectedDetail.openExceptions[0].kind}, ${selectedDetail.openExceptions[0].date}.`
                    : `${selectedDetail.openExceptions.length} open exceptions on this elder — ${selectedDetail.openExceptions
                        .map((ex) => `${ex.kind} (${ex.date})`)
                        .join(', ')}.`}
                </div>
              )}

              <div className={styles.actions}>
                <button
                  className={styles.primaryBtn}
                  onClick={() => navigate(`/manager/elders/${selected.id}`)}
                >
                  {isOutOfSector(selected)
                    ? 'View care plan'
                    : selected.planStatus === 'none'
                      ? 'Create care plan'
                      : 'Open care plan'}
                </button>
                <button className={styles.secondaryBtn}>View visit history</button>
              </div>

              <div className={styles.railFooter}>
                Opening a record is written to the audit log with your name and the time.
              </div>
            </>
          )}
        </div>
      </div>
    </ManagerShell>
  )
}
