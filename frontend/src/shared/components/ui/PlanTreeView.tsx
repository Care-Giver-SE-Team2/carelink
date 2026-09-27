import type { ReactNode } from 'react'
import { Eyebrow } from './Typography'
import { ChevronDownIcon } from './icons'
import { cx } from './cx'
import styles from './PlanTreeView.module.css'

export type PlanTreeTask = {
  kind: 'task'
  id: string
  /** The task's name, e.g. "Bathing assistance". */
  label: ReactNode
  /** One tag per scheduled day, already worded: "Mon 8:00–8:30 AM · 30 m", or a single "Daily …". */
  schedule: string[]
  weekly: string
}

export type PlanTreeSubPlan = {
  kind: 'subplan'
  id: string
  name: string
  weekly: string
  tasks: PlanTreeTask[]
}

export type PlanTreeItem = PlanTreeTask | PlanTreeSubPlan

type Props = {
  items: PlanTreeItem[]
  collapsedIds: ReadonlySet<string>
  onToggle: (subPlanId: string) => void
  /** Plan total, already formatted ("6.50 h"). */
  total: string
  emptyMessage?: ReactNode
  columns?: { item: string; weekly: string }
  /**
   * Extension points for a wrapping component (e.g. an editor); a plain read-only tree
   * passes none of these. `rowActions` adds a trailing actions column.
   */
  rowActions?: {
    subPlan: (subPlan: PlanTreeSubPlan) => ReactNode
    task: (task: PlanTreeTask) => ReactNode
  }
  /** A node to show in place of a task's row, or undefined to show the row. */
  replaceTask?: (task: PlanTreeTask) => ReactNode | undefined
  /** Extra rows after the list, before the total. */
  children?: ReactNode
}

/**
 * A plan as a flat list of sub-plans, each holding tasks, with effort rolled up into a total —
 * read-only, for any role that needs to see a plan. One level of nesting only. Values arrive
 * pre-formatted, so the caller owns the arithmetic.
 */
export function PlanTreeView({
  items,
  collapsedIds,
  onToggle,
  total,
  emptyMessage = 'No sub-plans yet.',
  columns = { item: 'Plan item', weekly: 'Weekly' },
  rowActions,
  replaceTask,
  children,
}: Props) {
  function renderTask(task: PlanTreeTask, nested: boolean) {
    const replacement = replaceTask?.(task)
    if (replacement) return <div key={task.id}>{replacement}</div>
    return (
      <div key={task.id} className={cx(styles.row, styles.taskRow, nested && styles.nested)}>
        <span className={styles.taskCell}>
          <span className={styles.taskLabel}>{task.label}</span>
          {task.schedule.length > 0 && (
            <span className={styles.scheduleTags}>
              {task.schedule.map((tag) => (
                <span key={tag} className={styles.scheduleTag}>
                  {tag}
                </span>
              ))}
            </span>
          )}
        </span>
        <span className={cx(styles.taskValue, styles.right)}>{task.weekly}</span>
        {rowActions && <span className={styles.actions}>{rowActions.task(task)}</span>}
      </div>
    )
  }

  function renderSubPlan(sub: PlanTreeSubPlan) {
    const collapsed = collapsedIds.has(sub.id)
    return (
      <div key={sub.id}>
        <div
          className={cx(styles.row, styles.subPlanRow, collapsed && styles.collapsed)}
          onClick={(e) => {
            // The name is its own button (for keyboard use); don't toggle twice, or on a row action.
            if (!(e.target as HTMLElement).closest('button')) onToggle(sub.id)
          }}
        >
          <button type="button" className={styles.toggle} aria-expanded={!collapsed} onClick={() => onToggle(sub.id)}>
            <span className={styles.chevron}>
              <ChevronDownIcon />
            </span>
            {sub.name}
          </button>
          <span className={cx(styles.subWeekly, styles.right)}>{sub.weekly}</span>
          {rowActions && <span className={styles.actions}>{rowActions.subPlan(sub)}</span>}
        </div>
        <div className={cx(styles.children, collapsed && styles.hidden)} inert={collapsed}>
          <div className={styles.childrenInner}>{sub.tasks.map((task) => renderTask(task, true))}</div>
        </div>
      </div>
    )
  }

  return (
    <div className={cx(styles.tree, rowActions && styles.withActions)}>
      <div className={cx(styles.row, styles.headerRow)}>
        <Eyebrow>{columns.item}</Eyebrow>
        <Eyebrow className={styles.right}>{columns.weekly}</Eyebrow>
        {rowActions && <span />}
      </div>

      {items.length === 0 && !children ? (
        <div className={styles.empty}>{emptyMessage}</div>
      ) : (
        items.map((item) => (item.kind === 'subplan' ? renderSubPlan(item) : renderTask(item, false)))
      )}

      {children}

      <div className={cx(styles.row, styles.totalRow)}>
        <span className={styles.totalLabel}>Plan total</span>
        <span className={cx(styles.totalValue, styles.right)}>{total}</span>
        {rowActions && <span />}
      </div>
    </div>
  )
}
