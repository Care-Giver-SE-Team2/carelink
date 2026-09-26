import { IconButton, PlanTreeView } from '../../../shared/components/ui'
import type { PlanTreeItem, SelectGroup } from '../../../shared/components/ui'
import { AddSubPlanPanel, EditTaskPanel } from './AddSubPlanPanel'
import type { DayScheduleValue } from './weekdays'

type Props = {
  items: PlanTreeItem[]
  collapsedIds: ReadonlySet<string>
  onToggle: (subPlanId: string) => void
  total: string
  onEditTask: (taskId: string) => void
  onDeleteTask: (taskId: string) => void
  onDeleteSubPlan: (subPlanId: string) => void
  /** The task being edited in place, pre-filled; null when none is. */
  editingTask: { id: string; name: string; schedule: DayScheduleValue } | null
  onSaveTask: (taskId: string, name: string, schedule: DayScheduleValue) => void
  onCancelEdit: () => void
  /** Whether the inline "Add sub-plan" panel is open at the end of the list. */
  adding: boolean
  activityOptions: SelectGroup[]
  onAdd: (activity: string, schedule: DayScheduleValue) => void
  onCancelAdd: () => void
}

/**
 * The manager's editable plan: the shared read-only PlanTreeView plus an actions column —
 * a sub-plan gets delete only (its tasks are what's edited); a task gets edit and delete —
 * and the inline add/edit panels. Confirming a sub-plan delete is the caller's job.
 */
export function PlanTreeEditor({
  items,
  collapsedIds,
  onToggle,
  total,
  onEditTask,
  onDeleteTask,
  onDeleteSubPlan,
  editingTask,
  onSaveTask,
  onCancelEdit,
  adding,
  activityOptions,
  onAdd,
  onCancelAdd,
}: Props) {
  return (
    <PlanTreeView
      items={items}
      collapsedIds={collapsedIds}
      onToggle={onToggle}
      total={total}
      emptyMessage="No sub-plans yet. Add one to start the plan."
      rowActions={{
        subPlan: (sub) => (
          <IconButton
            icon="delete"
            size={22}
            label={`Delete sub-plan ${sub.name} and its tasks`}
            onClick={() => onDeleteSubPlan(sub.id)}
          />
        ),
        task: (task) => (
          <>
            <IconButton icon="edit" size={22} label="Edit task" onClick={() => onEditTask(task.id)} />
            <IconButton icon="delete" size={22} label="Remove task from sub-plan" onClick={() => onDeleteTask(task.id)} />
          </>
        ),
      }}
      replaceTask={(task) =>
        editingTask && task.id === editingTask.id ? (
          <EditTaskPanel
            key={editingTask.id}
            initialName={editingTask.name}
            initialSchedule={editingTask.schedule}
            onSave={(name, schedule) => onSaveTask(editingTask.id, name, schedule)}
            onCancel={onCancelEdit}
          />
        ) : undefined
      }
    >
      {adding && <AddSubPlanPanel activityOptions={activityOptions} onAdd={onAdd} onCancel={onCancelAdd} />}
    </PlanTreeView>
  )
}
