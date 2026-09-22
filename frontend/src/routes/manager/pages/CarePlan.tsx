import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ManagerShell } from '../components/ManagerShell'
import { UserIdentity } from '../components/UserIdentity'
import modalStyles from '../components/ConfirmModal.module.css'
import { ACTIVITY_CATALOG, CARE_PLANS, ELDER_PROFILES } from '../data/carePlans'
import type { EvidenceType, PlanNode, SubPlanNode, TaskNode } from '../data/carePlans'
import { useElder } from '../lib/useElder'
import { useCurrentUser } from '../lib/useCurrentUser'
import {
  countTree,
  formatHoursFixed,
  perVisitDisplay,
  removeNode,
  scheduleLabel,
  updateTask,
  weeklyHours,
  weeklyHoursOfTree,
} from '../lib/planTree'
import {
  createCarePlanDraft,
  fetchCarePlanNodes,
  fetchLatestCarePlan,
  publishCarePlan,
} from '../../../shared/api/careplan'
import type { CarePlanNodeResponse, PlanNodePayload } from '../../../shared/api/careplan'
import { StopCarePlanModal } from '../components/StopCarePlanModal'
import styles from './CarePlan.module.css'

/** Placeholder until real roster data exists — see the publish modal copy. */
const MOCK_AFFECTED_WEEKS = 4

/** Left-chevron glyph for the "Back to Elders" link, per the design handoff's SVG spec (screens.html 1d). */
function BackChevronIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
      <path d="M6.5 1.5L2 5l4.5 3.5" stroke="#444" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** Trash-can glyph per the design handoff's SVG spec (screens.html 1d). */
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
      <path
        d="M2.5 3.5h9M5.5 3.5V2a1 1 0 011-1h1a1 1 0 011 1v1.5M3.5 3.5l.5 8a1 1 0 001 1h4a1 1 0 001-1l.5-8"
        stroke="#444"
        strokeWidth="1.1"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const DAYS: { key: string; full: string }[] = [
  { key: 'mon', full: 'Mon' },
  { key: 'tue', full: 'Tue' },
  { key: 'wed', full: 'Wed' },
  { key: 'thu', full: 'Thu' },
  { key: 'fri', full: 'Fri' },
  { key: 'sat', full: 'Sat' },
  { key: 'sun', full: 'Sun' },
]

type DayState = { active: boolean; time: string; minutes: string }

function initialDayState(): Record<string, DayState> {
  return Object.fromEntries(DAYS.map((d) => [d.key, { active: false, time: '8:00 AM', minutes: '15' }]))
}

/** Pre-populates the day/minutes editor from an existing task's visits, for the edit panel. */
function dayStateFromVisits(visits: TaskNode['visits']): Record<string, DayState> {
  const byFull = new Map(visits.map((v) => [v.day, v.minutes]))
  return Object.fromEntries(
    DAYS.map((d) => {
      const minutes = byFull.get(d.full)
      return [d.key, { active: minutes !== undefined, time: '8:00 AM', minutes: String(minutes ?? 15) }]
    }),
  )
}

function collectDefaultCollapsed(nodes: PlanNode[]): Set<string> {
  const collapsed = new Set<string>()
  for (const node of nodes) {
    if (node.type === 'subplan' && node.defaultCollapsed) collapsed.add(node.id)
  }
  return collapsed
}

/** Frontend tree -> the wire shape POST /api/care-plans/{id}/publish expects: every node is
 * published as a task; a sub-plan's name becomes its children's groupName, a purely display-only
 * label with no hierarchy behind it. */
function toPlanNodePayloads(nodes: PlanNode[]): PlanNodePayload[] {
  return nodes.flatMap((node) =>
    node.type === 'task' ? [taskToPayload(node, null)] : node.children.map((child) => taskToPayload(child, node.name)),
  )
}

function taskToPayload(node: TaskNode, groupName: string | null): PlanNodePayload {
  return {
    groupName,
    name: node.name,
    visits: node.visits.map((v) => ({ day: v.day, minutes: v.minutes })),
    evidenceType: node.evidence,
  }
}

/** GET /api/care-plans/{id}/nodes's wire shape -> the frontend tree. The backend list is flat;
 * tasks sharing the same groupName are regrouped here into a sub-plan for display, in the order
 * each group first appears. A task with no groupName renders standalone. */
function fromCarePlanNodeResponses(nodes: CarePlanNodeResponse[]): PlanNode[] {
  const result: PlanNode[] = []
  const groups = new Map<string, SubPlanNode>()
  for (const node of nodes) {
    const task = toTaskNode(node)
    if (!node.groupName) {
      result.push(task)
      continue
    }
    let group = groups.get(node.groupName)
    if (!group) {
      group = { id: `subplan-${node.groupName}`, type: 'subplan', name: node.groupName, children: [] }
      groups.set(node.groupName, group)
      result.push(group)
    }
    group.children.push(task)
  }
  return result
}

function toTaskNode(node: CarePlanNodeResponse): TaskNode {
  return {
    id: `task-${node.id}`,
    type: 'task',
    name: node.name,
    visits: node.visits,
    evidence: (node.evidenceType === 'NONE' ? 'CHECKLIST' : node.evidenceType) as EvidenceType,
  }
}

/**
 * Care plan (1d) — UC-MG01. Editable, flat sub-plan/task list with a live
 * weekly-effort rollup (lib/planTree.ts) and a publish flow that snapshots
 * the current tree as a new published version. Sub-plan deletion is
 * confirmed via 1j. See design_handoff_care_plan_authoring/README.md for the
 * full spec.
 */
export default function CarePlan() {
  const { elderId } = useParams()

  const { data: elder, isLoading: elderLoading, isError: elderError } = useElder(elderId)
  const { data: currentUser } = useCurrentUser()
  const initialPlan = elderId ? CARE_PLANS[elderId] : undefined
  const profile = elderId ? ELDER_PROFILES[elderId] : undefined

  const [tree, setTree] = useState<PlanNode[]>(initialPlan?.tree ?? [])
  const [status, setStatus] = useState<'draft' | 'published' | 'stopped'>(initialPlan?.status ?? 'draft')
  const [version, setVersion] = useState(initialPlan?.version ?? 0)
  const [versions, setVersions] = useState(initialPlan?.versions ?? [])
  const [priorPublishedHours, setPriorPublishedHours] = useState(initialPlan?.priorPublishedHours)
  const [startDate, setStartDate] = useState(initialPlan?.startDate ?? '')
  const [collapsed, setCollapsed] = useState<Set<string>>(() =>
    collectDefaultCollapsed(initialPlan?.tree ?? []),
  )
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SubPlanNode | null>(null)
  const [publishing, setPublishing] = useState(false)
  const [publishError, setPublishError] = useState<string | null>(null)

  const [stopInfo, setStopInfo] = useState<{ effectiveDate: string; reason: string } | null>(null)
  const [showStopModal, setShowStopModal] = useState(false)

  const [addPanelOpen, setAddPanelOpen] = useState(false)
  const [newSubPlanName, setNewSubPlanName] = useState('')
  const [newSubPlanDays, setNewSubPlanDays] = useState<Record<string, DayState>>(initialDayState)

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editTaskName, setEditTaskName] = useState('')
  const [editTaskDays, setEditTaskDays] = useState<Record<string, DayState>>(initialDayState)

  // Rendered via a portal (see below) so the per-visit day-by-day breakdown
  // isn't clipped by the sub-plan rows' `overflow: hidden` (needed for the
  // expand/collapse animation), and shows instantly on hover instead of
  // waiting on the browser's native tooltip delay.
  const [perVisitTooltip, setPerVisitTooltip] = useState<{ top: number; left: number; text: string } | null>(
    null,
  )

  function showPerVisitTooltip(e: React.MouseEvent<HTMLElement>, text: string) {
    const rect = e.currentTarget.getBoundingClientRect()
    setPerVisitTooltip({ top: rect.top - 6, left: rect.right, text })
  }

  function hidePerVisitTooltip() {
    setPerVisitTooltip(null)
  }

  const totalHours = useMemo(() => weeklyHoursOfTree(tree), [tree])
  const { tasks } = useMemo(() => countTree(tree), [tree])

  useEffect(() => {
    if (elder && currentUser) {
      console.info('[audit] opened care plan', {
        actor: currentUser.displayName,
        elderId: elder.id,
        at: new Date().toISOString(),
      })
    }
  }, [elder, currentUser])

  // Loads whatever is actually in the database for this elder, overriding the mock fixture
  // above (which never matches a real, numeric elder id). An elder with no plan yet keeps the
  // empty-draft defaults the mock fallback already set up. Goes through useQuery (not a plain
  // effect) so React 18 StrictMode's dev-mode double-mount doesn't fire the GETs twice.
  const { data: latestPlan } = useQuery({
    queryKey: ['carePlan', 'latest', elder?.id],
    queryFn: () => fetchLatestCarePlan(elder!.id),
    enabled: elder !== undefined,
  })

  const { data: planNodes } = useQuery({
    queryKey: ['carePlan', 'nodes', latestPlan?.id],
    queryFn: () => fetchCarePlanNodes(latestPlan!.id),
    enabled: latestPlan != null,
  })

  useEffect(() => {
    if (!latestPlan || !planNodes) return
    setTree(fromCarePlanNodeResponses(planNodes))
    setVersion(latestPlan.version)
    setStartDate(latestPlan.startDate ?? '')
    if (latestPlan.status === 'PUBLISHED') {
      setStatus('published')
    } else if (latestPlan.status === 'STOPPED') {
      setStatus('stopped')
      setStopInfo({
        effectiveDate: latestPlan.stopEffectiveDate ?? '',
        reason: latestPlan.stopReason ?? '',
      })
    } else {
      setStatus('draft')
    }
  }, [latestPlan, planNodes])

  if (elderLoading) {
    return (
      <ManagerShell>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Loading elder…</p>
      </ManagerShell>
    )
  }

  if (elderError || !elder) {
    return (
      <ManagerShell>
        <p style={{ padding: 24, color: 'var(--text-muted)' }}>Elder not found.</p>
      </ManagerShell>
    )
  }

  // A stopped plan is history: no more sub-plans, tasks or edits — just what it looked like
  // when it was stopped.
  const locked = status === 'stopped'
  // Editing (add/edit/delete sub-plans and tasks) is only available once the manager has
  // entered draft mode via "Edit plan" — opening a published plan starts read-only.
  const editable = !locked && status === 'draft'

  function toggleCollapsed(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function enterDraft(baselineHours: number) {
    if (status === 'published') {
      setPriorPublishedHours(baselineHours)
      setStatus('draft')
    }
  }

  function removeTask(taskId: string) {
    enterDraft(totalHours)
    setTree((prev) => removeNode(prev, taskId))
  }

  function openEditTask(task: TaskNode) {
    setEditingTaskId(task.id)
    setEditTaskName(task.name)
    setEditTaskDays(dayStateFromVisits(task.visits))
  }

  function toggleEditDay(key: string) {
    setEditTaskDays((prev) => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }))
  }

  function setEditDayMinutes(key: string, minutes: string) {
    setEditTaskDays((prev) => ({ ...prev, [key]: { ...prev[key], minutes } }))
  }

  function setEditDayTime(key: string, time: string) {
    setEditTaskDays((prev) => ({ ...prev, [key]: { ...prev[key], time } }))
  }

  const editActiveDays = DAYS.filter((d) => editTaskDays[d.key]?.active)

  function submitEditTask(task: TaskNode) {
    if (editActiveDays.length === 0) return
    enterDraft(totalHours)
    const updated: TaskNode = {
      ...task,
      name: editTaskName.trim() || task.name,
      visits: editActiveDays.map((d) => ({
        day: d.full,
        minutes: Number(editTaskDays[d.key].minutes) || 0,
      })),
    }
    setTree((prev) => updateTask(prev, task.id, updated))
    setEditingTaskId(null)
  }

  function confirmDeleteSubPlan() {
    if (!deleteTarget) return
    enterDraft(totalHours)
    setTree((prev) => removeNode(prev, deleteTarget.id))
    setDeleteTarget(null)
  }

  function openAddPanel() {
    setNewSubPlanName('')
    setNewSubPlanDays(initialDayState())
    setAddPanelOpen(true)
  }

  function toggleDay(key: string) {
    setNewSubPlanDays((prev) => ({ ...prev, [key]: { ...prev[key], active: !prev[key].active } }))
  }

  function setDayMinutes(key: string, minutes: string) {
    setNewSubPlanDays((prev) => ({ ...prev, [key]: { ...prev[key], minutes } }))
  }

  function setDayTime(key: string, time: string) {
    setNewSubPlanDays((prev) => ({ ...prev, [key]: { ...prev[key], time } }))
  }

  const activeDays = DAYS.filter((d) => newSubPlanDays[d.key]?.active)

  function submitAddSubPlan() {
    if (activeDays.length === 0) return
    enterDraft(totalHours)
    const name = newSubPlanName.trim() || 'New sub-plan'
    const task: TaskNode = {
      id: `task-${Date.now()}`,
      type: 'task',
      name,
      visits: activeDays.map((d) => ({
        day: d.full,
        minutes: Number(newSubPlanDays[d.key].minutes) || 0,
      })),
      evidence: 'CHECKLIST',
    }
    const subplan: SubPlanNode = {
      id: `subplan-${Date.now()}`,
      type: 'subplan',
      name,
      children: [task],
    }
    setTree((prev) => [...prev, subplan])
    setAddPanelOpen(false)
  }

  /** The draft this publish writes to: reuses one already open on the backend, or opens one.
   * Only called from the publish modal, which only renders once the elder guard below has
   * passed, but that narrowing doesn't reach this nested function declaration. */
  async function getOrCreateDraftPlanId(): Promise<number> {
    const currentElderId = elder!.id
    const latest = await fetchLatestCarePlan(currentElderId)
    if (latest && latest.status === 'DRAFT') return latest.id
    const created = await createCarePlanDraft(currentElderId)
    return created.id
  }

  async function publish() {
    if (!startDate) return
    setPublishing(true)
    setPublishError(null)
    try {
      const planId = await getOrCreateDraftPlanId()
      const published = await publishCarePlan(planId, startDate, toPlanNodePayloads(tree))
      setVersions((prev) => [
        { version: published.version, date: 'today', summary: 'published from console' },
        ...prev,
      ])
      setVersion(published.version)
      setStatus('published')
      setPriorPublishedHours(undefined)
      setStopInfo(null)
      setShowPublishModal(false)
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : 'Could not publish this plan.')
    } finally {
      setPublishing(false)
    }
  }

  function openStopModal() {
    setShowStopModal(true)
  }

  function renderSubPlan(node: SubPlanNode) {
    const isCollapsed = collapsed.has(node.id)
    return (
      <div key={node.id}>
        <div className={`${styles.gridRow} ${styles.subplanRow}`}>
          <div className={styles.subplanName} onClick={() => toggleCollapsed(node.id)}>
            {isCollapsed ? '▸' : '▾'} {node.name}
          </div>
          <div className={styles.subplanPerVisit}>—</div>
          <div className={styles.subplanWeekly}>{formatHoursFixed(weeklyHours(node))}</div>
          {!editable ? (
            <div />
          ) : (
            <div
              className={styles.subplanIcons}
              title="Delete sub-plan (and its contents)"
              onClick={() => setDeleteTarget(node)}
            >
              <TrashIcon />
            </div>
          )}
        </div>
        <div className={`${styles.subplanChildren} ${isCollapsed ? styles.subplanChildrenCollapsed : ''}`}>
          <div className={styles.subplanChildrenInner}>{node.children.map((task) => renderTask(task))}</div>
        </div>
      </div>
    )
  }

  function renderTask(node: TaskNode) {
    if (editingTaskId === node.id) return renderEditTaskPanel(node)

    const perVisit = perVisitDisplay(node.visits)
    return (
      <div key={node.id} className={`${styles.gridRow} ${styles.taskRow}`}>
        <div className={styles.taskName} style={{ paddingLeft: 24 }}>
          {node.name} · {scheduleLabel(node.visits)}
        </div>
        <div className={styles.taskPerVisit}>
          {perVisit.tooltip ? (
            <span
              className={styles.perVisitRange}
              onMouseEnter={(e) => showPerVisitTooltip(e, perVisit.tooltip!)}
              onMouseLeave={hidePerVisitTooltip}
              aria-label={perVisit.tooltip}
            >
              {perVisit.text}
            </span>
          ) : (
            perVisit.text
          )}
        </div>
        <div className={styles.taskWeekly}>{formatHoursFixed(weeklyHours(node))}</div>
        {!editable ? (
          <div />
        ) : (
          <div className={styles.taskIcons}>
            <span className={styles.editIconTask} title="Edit task" onClick={() => openEditTask(node)}>
              ✎
            </span>
            <span className={styles.deleteIconTask} title="Remove task from sub-plan" onClick={() => removeTask(node.id)}>
              <TrashIcon />
            </span>
          </div>
        )}
      </div>
    )
  }

  function renderEditTaskPanel(node: TaskNode) {
    return (
      <div key={node.id} className={styles.addPanelRow}>
        <div className={styles.addPanelTitle}>Edit task</div>

        <div className={styles.stepLabel}>Name</div>
        <input
          className={styles.nameInput}
          type="text"
          value={editTaskName}
          onChange={(e) => setEditTaskName(e.target.value)}
          autoFocus
        />

        <div className={styles.stepLabel}>Schedule</div>
        <div className={styles.dayGrid}>
          {DAYS.map((d) => {
            const state = editTaskDays[d.key]
            return (
              <div key={d.key} className={styles.dayRow}>
                <button
                  type="button"
                  className={`${styles.dayButton} ${state.active ? styles.dayButtonActive : ''}`}
                  onClick={() => toggleEditDay(d.key)}
                >
                  {d.full[0]}
                </button>
                <input
                  className={styles.dayTimeInput}
                  type="text"
                  disabled={!state.active}
                  placeholder="—"
                  value={state.active ? state.time : ''}
                  onChange={(e) => setEditDayTime(d.key, e.target.value)}
                />
                <div className={styles.dayMinutes}>
                  <input
                    className={styles.dayMinutesInput}
                    type="text"
                    disabled={!state.active}
                    value={state.active ? state.minutes : ''}
                    onChange={(e) => setEditDayMinutes(d.key, e.target.value)}
                  />
                  <span className={styles.dayMinutesUnit}>min</span>
                </div>
              </div>
            )
          })}
        </div>

        <div className={styles.addPanelActions}>
          <button
            className={styles.addPanelSubmit}
            disabled={editActiveDays.length === 0}
            onClick={() => submitEditTask(node)}
          >
            Save changes
          </button>
          <button className={styles.addPanelCancel} onClick={() => setEditingTaskId(null)}>
            Cancel
          </button>
        </div>
      </div>
    )
  }

  const headerContext = (
    <span>
      <Link to="/manager/elders" className={styles.breadcrumbLink}>
        Elders
      </Link>
      {' / '}
      <Link to="/manager/elders" className={styles.breadcrumbLink}>
        {elder.name}
      </Link>
      {' / Care Plan'}
    </span>
  )

  const statusTone = status === 'published' ? 'success' : status === 'stopped' ? 'danger' : 'warning'
  const headerRight = (
    <>
      <span className={`${styles.statusBadge} ${styles[statusTone]}`}>
        {status.toUpperCase()} v{version}
      </span>
      <UserIdentity />
    </>
  )

  const primaryLabel = status === 'draft' ? `Publish v${version + 1}` : 'Edit plan'
  const primaryDisabled = status === 'draft' && (tasks === 0 || !startDate)

  return (
    <ManagerShell headerContext={headerContext} headerRight={headerRight}>
      <div className={styles.layout}>
        <div className={styles.planColumn}>
          {status === 'stopped' && stopInfo && (
            <div className={styles.readOnlyBanner}>
              Stopped effective {stopInfo.effectiveDate || '—'} — {stopInfo.reason || 'no reason on file'}. This
              plan and its history are kept; create a new plan to resume care.
            </div>
          )}

          <div className={styles.planHeader}>
            <div>
              <Link to="/manager/elders" className={styles.backLink} title="Back to Elders">
                <BackChevronIcon />
                Back to Elders
              </Link>
              <h2 className={styles.planTitle}>Care Plan</h2>
              <div className={styles.startsRow}>
                <span className={styles.startsLabel}>Starts</span>
                <input
                  className={styles.startsInput}
                  type="date"
                  value={startDate}
                  disabled={!editable}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
            </div>
            {!locked && (
              <div className={styles.planActions}>
                {status === 'draft' && (
                  <button className={styles.addSubPlanBtn} onClick={openAddPanel}>
                    Add sub-plan
                  </button>
                )}
                <button
                  className={styles.publishBtn}
                  disabled={primaryDisabled}
                  onClick={() => (status === 'draft' ? setShowPublishModal(true) : enterDraft(totalHours))}
                >
                  {primaryLabel}
                </button>
              </div>
            )}
          </div>

          <div className={`${styles.gridRow} ${styles.tableHeaderRow}`}>
            <div className={styles.eyebrow}>Plan item</div>
            <div className={`${styles.eyebrow} ${styles.right}`}>Per visit</div>
            <div className={`${styles.eyebrow} ${styles.right}`}>Weekly</div>
            <div className={styles.eyebrow} />
          </div>

          {tree.length === 0 && !addPanelOpen ? (
            <div className={styles.emptyState}>No sub-plans yet. Add one to start the plan.</div>
          ) : (
            tree.map((node) => (node.type === 'subplan' ? renderSubPlan(node) : renderTask(node)))
          )}

          {addPanelOpen && (
            <div className={styles.addPanelRow}>
              <div className={styles.addPanelTitle}>New sub-plan</div>

              <div className={styles.stepLabel}>Step 1 · select sub-plan</div>
              <select
                className={`${styles.nameInput} ${styles.activitySelect}`}
                value={newSubPlanName}
                onChange={(e) => setNewSubPlanName(e.target.value)}
                autoFocus
              >
                <option value="" disabled>
                  Select an activity…
                </option>
                {ACTIVITY_CATALOG.map((group) => (
                  <optgroup key={group.category} label={group.category}>
                    {group.activities.map((activity) => (
                      <option key={activity} value={activity}>
                        {activity}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>

              <div className={styles.stepLabel}>Step 2 · schedule</div>
              <div className={styles.dayGrid}>
                {DAYS.map((d) => {
                  const state = newSubPlanDays[d.key]
                  return (
                    <div key={d.key} className={styles.dayRow}>
                      <button
                        type="button"
                        className={`${styles.dayButton} ${state.active ? styles.dayButtonActive : ''}`}
                        onClick={() => toggleDay(d.key)}
                      >
                        {d.full[0]}
                      </button>
                      <input
                        className={styles.dayTimeInput}
                        type="text"
                        disabled={!state.active}
                        placeholder="—"
                        value={state.active ? state.time : ''}
                        onChange={(e) => setDayTime(d.key, e.target.value)}
                      />
                      <div className={styles.dayMinutes}>
                        <input
                          className={styles.dayMinutesInput}
                          type="text"
                          disabled={!state.active}
                          value={state.active ? state.minutes : ''}
                          onChange={(e) => setDayMinutes(d.key, e.target.value)}
                        />
                        <span className={styles.dayMinutesUnit}>min</span>
                      </div>
                    </div>
                  )
                })}
              </div>

              <div className={styles.addPanelActions}>
                <button
                  className={styles.addPanelSubmit}
                  disabled={activeDays.length === 0 || !newSubPlanName}
                  onClick={submitAddSubPlan}
                >
                  Add sub-plan ({activeDays.length} {activeDays.length === 1 ? 'activity' : 'activities'})
                </button>
                <button className={styles.addPanelCancel} onClick={() => setAddPanelOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className={`${styles.gridRow} ${styles.totalRow}`}>
            <div className={styles.totalLabel}>Plan total</div>
            <div className={styles.totalSpacer} />
            <div className={styles.totalValue}>{formatHoursFixed(totalHours)}</div>
            <div />
          </div>

        </div>

        <div className={styles.detailPanel}>
          <div className={styles.eyebrow}>Elder</div>
          <div className={styles.elderHeader}>
            <div className={styles.avatarLg} />
            <div>
              <div className={styles.elderName}>{elder.name}</div>
              <div className={styles.elderMeta}>
                {elder.age} · {elder.id} · {elder.sector}
              </div>
            </div>
          </div>

          {profile && (
            <>
              <div className={styles.profileFields}>
                <div className={styles.profileField}>
                  <span className={styles.profileFieldLabel}>Dialect</span>
                  <span>{profile.dialect}</span>
                </div>
                <div className={styles.profileField}>
                  <span className={styles.profileFieldLabel}>Lives</span>
                  <span>{elder.livesAlone === null ? 'not on file' : elder.livesAlone ? 'alone' : 'with family'}</span>
                </div>
                <div className={styles.profileField}>
                  <span className={styles.profileFieldLabel}>Family</span>
                  <span>{profile.family}</span>
                </div>
                <div className={styles.profileField}>
                  <span className={styles.profileFieldLabel}>Mobility</span>
                  <span>{profile.mobility}</span>
                </div>
                <div className={styles.profileField}>
                  <span className={styles.profileFieldLabel}>Continuity</span>
                  <span>{profile.continuity}</span>
                </div>
              </div>

              <div className={styles.sectionSpacer}>
                <div className={styles.eyebrow}>Required certifications</div>
                <div className={styles.certList}>
                  {profile.requiredCertifications.map((cert) => (
                    <span key={cert} className={styles.certBadge}>
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}

          {versions.length > 0 && (
            <div className={styles.sectionSpacer}>
              <div className={styles.eyebrow}>Version history</div>
              <div className={styles.versionList}>
                {versions.map((v, i) => (
                  <div
                    key={v.version}
                    className={`${styles.versionRow} ${i === 0 ? styles.versionLatest : ''}`}
                  >
                    <span>
                      v{v.version} · {v.date}
                    </span>
                    <span>{v.summary}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {status === 'draft' && priorPublishedHours !== undefined && (
            <div className={styles.deltaBanner}>
              Draft v{version + 1} changes weekly effort {formatHoursFixed(priorPublishedHours)} →{' '}
              {formatHoursFixed(totalHours)}. Publishing re-runs the roster for affected weeks.
            </div>
          )}

          {status === 'published' && !locked && (
            <button className={styles.dangerBtn} onClick={openStopModal}>
              Stop care plan
            </button>
          )}
        </div>
      </div>

      {showPublishModal && (
        <div className={modalStyles.modalOverlay} onClick={() => setShowPublishModal(false)}>
          <div className={modalStyles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={modalStyles.modalTitle}>Publish care plan</div>
            <p className={modalStyles.modalBody}>
              This publishes v{version + 1} at {formatHoursFixed(totalHours)}/week
              {priorPublishedHours !== undefined ? ` (from ${formatHoursFixed(priorPublishedHours)})` : ''}.
              Publishing re-runs the roster for the next {MOCK_AFFECTED_WEEKS} weeks.
            </p>
            {publishError && <p className={modalStyles.modalBodyProse}>{publishError}</p>}
            <div className={modalStyles.modalActions}>
              <button
                className={`${modalStyles.modalBtn} ${modalStyles.secondary}`}
                disabled={publishing}
                onClick={() => setShowPublishModal(false)}
              >
                Cancel
              </button>
              <button
                className={`${modalStyles.modalBtn} ${modalStyles.primary}`}
                disabled={publishing || !startDate}
                onClick={publish}
              >
                {publishing ? 'Publishing…' : 'Publish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showStopModal && (
        <StopCarePlanModal
          elder={elder}
          onClose={() => setShowStopModal(false)}
          onStopped={(stopped) => {
            setStatus('stopped')
            setStopInfo({
              effectiveDate: stopped.stopEffectiveDate ?? '',
              reason: stopped.stopReason ?? '',
            })
            setShowStopModal(false)
          }}
        />
      )}

      {deleteTarget && (
        <div className={modalStyles.modalOverlay} onClick={() => setDeleteTarget(null)}>
          <div className={modalStyles.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={`${modalStyles.modalEyebrow} ${modalStyles.danger}`}>Delete sub-plan</div>
            <div className={modalStyles.modalTitle}>Delete "{deleteTarget.name}"?</div>
            <p className={modalStyles.modalBodyProse}>
              This sub-plan has {deleteTarget.children.length}{' '}
              {deleteTarget.children.length === 1 ? 'task' : 'tasks'} totalling{' '}
              {formatHoursFixed(weeklyHours(deleteTarget))}/week. Deleting it removes{' '}
              {deleteTarget.children.length === 1 ? 'that task' : 'all of them'} from the care plan — this
              can't be undone.
            </p>
            <div className={modalStyles.modalActions}>
              <button
                className={`${modalStyles.modalBtn} ${modalStyles.secondary}`}
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </button>
              <button className={`${modalStyles.modalBtn} ${modalStyles.danger}`} onClick={confirmDeleteSubPlan}>
                Delete sub-plan
              </button>
            </div>
          </div>
        </div>
      )}

      {perVisitTooltip &&
        createPortal(
          <div
            className={styles.hoverTooltip}
            style={{ top: perVisitTooltip.top, left: perVisitTooltip.left }}
          >
            {perVisitTooltip.text}
          </div>,
          document.body,
        )}
    </ManagerShell>
  )
}
