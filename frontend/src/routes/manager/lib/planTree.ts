import type { DayVisit, EvidenceType, PlanNode, SubPlanNode, TaskNode } from '../data/carePlans'
import type { CarePlanNodeResponse } from '../../../shared/api/careplan'

/** Bottom-up weekly effort in hours: a sub-plan is the sum of its tasks. */
export function weeklyHours(node: PlanNode): number {
  if (node.type === 'task') {
    return node.visits.reduce((sum, v) => sum + v.minutes, 0) / 60
  }
  return node.children.reduce((sum, child) => sum + weeklyHours(child), 0)
}

export function weeklyHoursOfTree(tree: PlanNode[]): number {
  return tree.reduce((sum, node) => sum + weeklyHours(node), 0)
}

export function countTree(tree: PlanNode[]): { subPlans: number; tasks: number } {
  let subPlans = 0
  let tasks = 0
  for (const node of tree) {
    if (node.type === 'subplan') {
      subPlans += 1
      tasks += node.children.length
    } else {
      tasks += 1
    }
  }
  return { subPlans, tasks }
}

/** "Mon, Wed, Fri" for a partial week, "daily" once every day is scheduled. */
export function scheduleLabel(visits: DayVisit[]): string {
  if (visits.length === 7) return 'daily'
  return visits.map((v) => v.day).join(', ')
}

/**
 * Per-visit duration for the table's "Per visit" column. A task scheduled at
 * the same duration every day shows that single value; one whose duration
 * varies by day shows a low–high range with a day-by-day tooltip, per the
 * handoff ("tracked per-day, not as a single shared value").
 */
export function perVisitDisplay(visits: DayVisit[]): { text: string; tooltip?: string } {
  const minutes = visits.map((v) => v.minutes)
  const min = Math.min(...minutes)
  const max = Math.max(...minutes)
  if (min === max) return { text: `${min} m` }
  return {
    text: `${min}–${max} m`,
    tooltip: visits.map((v) => `${v.day} ${v.minutes} m`).join(' · '),
  }
}

/** Fixed two-decimal hours for table cells, e.g. "2.25 h". */
export function formatHoursFixed(hours: number): string {
  return `${hours.toFixed(2)} h`
}

/** Loose one-decimal hours for prose subtitles, e.g. "6.5 h". Trims a trailing .0. */
export function formatHoursLoose(hours: number): string {
  const rounded = Math.round(hours * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)} h`
}

/** "6h 30m" style duration for the rail's summary card. */
export function formatHoursMinutes(hours: number): string {
  const totalMinutes = Math.round(hours * 60)
  const h = Math.floor(totalMinutes / 60)
  const m = totalMinutes % 60
  return m === 0 ? `${h}h` : `${h}h ${m}m`
}

/** Remove a top-level sub-plan, or a task nested one level under a sub-plan, by id. A sub-plan
 * left with no tasks by the removal is removed along with it. */
export function removeNode(tree: PlanNode[], id: string): PlanNode[] {
  return tree.flatMap((node) => {
    if (node.id === id) return []
    if (node.type !== 'subplan' || !node.children.some((task) => task.id === id)) return [node]
    const children = node.children.filter((task) => task.id !== id)
    return children.length === 0 ? [] : [{ ...node, children }]
  })
}

/** Replace a task nested one level under a sub-plan, or a top-level task, by id. */
export function updateTask(tree: PlanNode[], id: string, updated: TaskNode): PlanNode[] {
  return tree.map((node) => {
    if (node.id === id) return updated
    if (node.type === 'subplan') {
      return { ...node, children: node.children.map((task) => (task.id === id ? updated : task)) }
    }
    return node
  })
}

export function findSubPlan(tree: PlanNode[], id: string): SubPlanNode | undefined {
  return tree.find((node): node is SubPlanNode => node.type === 'subplan' && node.id === id)
}

export function taskCount(node: TaskNode | SubPlanNode): number {
  return node.type === 'task' ? 1 : node.children.length
}

/** Distinct days of the week a caregiver visits, across every task in the tree — a task scheduled
 * on the same day as another still counts as a single weekly visit. */
export function visitsPerWeekOfTree(tree: PlanNode[]): number {
  const days = new Set<string>()
  function collect(node: PlanNode) {
    if (node.type === 'task') node.visits.forEach((v) => days.add(v.day))
    else node.children.forEach(collect)
  }
  tree.forEach(collect)
  return days.size
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

/** GET /api/care-plans/{id}/nodes's wire shape -> the frontend tree. The backend list is flat;
 * tasks sharing the same groupName are regrouped here into a sub-plan for display, in the order
 * each group first appears. A task with no groupName renders standalone. */
export function fromCarePlanNodeResponses(nodes: CarePlanNodeResponse[]): PlanNode[] {
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
