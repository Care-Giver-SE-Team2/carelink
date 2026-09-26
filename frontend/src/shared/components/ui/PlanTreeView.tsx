import { useId, useState } from 'react'
import type { FocusEvent, MouseEvent, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Eyebrow } from './Typography'
import { ChevronDownIcon } from './icons'
import { cx } from './cx'
import styles from './PlanTreeView.module.css'

export type PlanTreeTask = {
  kind: 'task'
  id: string
  /** e.g. "Bathing assistance · Mon, Wed, Fri" */
  label: ReactNode
  /** e.g. "45 m", or a range "30–60 m" when the duration varies by day. */
  perVisit: string
  /** Day-by-day breakdown shown on hover/focus when `perVisit` is a range. */
  perVisitDetail?: string
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
  columns?: { item: string; perVisit: string; weekly: string }
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
  columns = { item: 'Plan item', perVisit: 'Per visit', weekly: 'Weekly' },
  rowActions,
  replaceTask,
  children,
}: Props) {
  function renderTask(task: PlanTreeTask, nested: boolean) {
    const replacement = replaceTask?.(task)
    if (replacement) return <div key={task.id}>{replacement}</div>
    return (
      <div key={task.id} className={cx(styles.row, styles.taskRow, nested && styles.nested)}>
        <span className={styles.taskLabel}>{task.label}</span>
        <span className={cx(styles.taskValue, styles.right, styles.perVisit)}>
          <PerVisit text={task.perVisit} detail={task.perVisitDetail} />
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
          <span className={cx(styles.dash, styles.right, styles.perVisit)}>—</span>
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
        <Eyebrow className={cx(styles.right, styles.perVisit)}>{columns.perVisit}</Eyebrow>
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
        <span className={styles.perVisit} />
        <span className={cx(styles.totalValue, styles.right)}>{total}</span>
        {rowActions && <span />}
      </div>
    </div>
  )
}

/**
 * The per-visit cell. A range shows its day-by-day breakdown in a tooltip rendered to
 * document.body — so the collapse animation's `overflow: hidden` can't clip it, and it
 * appears at once rather than after the browser's title-attribute delay.
 */
function PerVisit({ text, detail }: { text: string; detail?: string }) {
  const [tip, setTip] = useState<{ top: number; left: number } | null>(null)
  const tipId = useId()
  if (!detail) return <>{text}</>

  function show(e: MouseEvent<HTMLSpanElement> | FocusEvent<HTMLSpanElement>) {
    const rect = e.currentTarget.getBoundingClientRect()
    setTip({ top: rect.top - 6, left: rect.right })
  }

  return (
    <>
      <span
        className={styles.range}
        tabIndex={0}
        aria-describedby={tipId}
        onMouseEnter={show}
        onMouseLeave={() => setTip(null)}
        onFocus={show}
        onBlur={() => setTip(null)}
      >
        {text}
      </span>
      {/* Always in the DOM (hidden when idle) so aria-describedby resolves for screen readers. */}
      {createPortal(
        <div
          id={tipId}
          role="tooltip"
          className={styles.tooltip}
          style={tip ? { top: tip.top, left: tip.left } : { display: 'none' }}
        >
          {detail}
        </div>,
        document.body,
      )}
    </>
  )
}
