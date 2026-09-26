import { useState } from 'react'
import type { ReactNode } from 'react'
import { Button, Eyebrow, Field, RowTitle, Select, TextInput } from '../../../shared/components/ui'
import type { SelectGroup } from '../../../shared/components/ui'
import { isScheduleComplete } from '../lib/planTree'
import { DaySchedule } from './DaySchedule'
import { WEEKDAYS, emptyDaySchedule } from './weekdays'
import type { DayScheduleValue } from './weekdays'
import styles from './AddSubPlanPanel.module.css'

/** Full-width row inside a plan tree for editing in place, with its actions underneath. */
function InlinePanel({ title, children, actions }: { title: string; children: ReactNode; actions: ReactNode }) {
  return (
    <div className={styles.panel}>
      <RowTitle>{title}</RowTitle>
      <div className={styles.panelBody}>{children}</div>
      <div className={styles.panelActions}>{actions}</div>
    </div>
  )
}

/**
 * Two-step sub-plan creation: pick an activity from the grouped catalog (which names the
 * sub-plan), then set its days, each with its own start time and minutes.
 */
export function AddSubPlanPanel({
  activityOptions,
  onAdd,
  onCancel,
}: {
  activityOptions: SelectGroup[]
  onAdd: (activity: string, schedule: DayScheduleValue) => void
  onCancel: () => void
}) {
  const [activity, setActivity] = useState('')
  const [schedule, setSchedule] = useState<DayScheduleValue>(emptyDaySchedule)
  const dayCount = WEEKDAYS.filter((d) => schedule[d.key].active).length

  return (
    <InlinePanel
      title="New sub-plan"
      actions={
        <>
          <Button
            variant="primary"
            disabled={!activity || !isScheduleComplete(schedule)}
            onClick={() => onAdd(activity, schedule)}
          >
            Add sub-plan ({dayCount} {dayCount === 1 ? 'activity' : 'activities'})
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Step 1 · select sub-plan">
        {(id) => (
          <Select
            id={id}
            width={280}
            placeholder="Select an activity…"
            options={activityOptions}
            value={activity}
            onChange={setActivity}
            autoFocus
          />
        )}
      </Field>
      <div className={styles.group}>
        <Eyebrow>Step 2 · schedule</Eyebrow>
        <DaySchedule value={schedule} onChange={setSchedule} />
      </div>
    </InlinePanel>
  )
}

/** Edits one task in place — name, and per-day schedule — pre-filled from the task. */
export function EditTaskPanel({
  initialName,
  initialSchedule,
  onSave,
  onCancel,
}: {
  initialName: string
  initialSchedule: DayScheduleValue
  onSave: (name: string, schedule: DayScheduleValue) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [schedule, setSchedule] = useState(initialSchedule)

  return (
    <InlinePanel
      title="Edit task"
      actions={
        <>
          <Button variant="primary" disabled={!isScheduleComplete(schedule)} onClick={() => onSave(name, schedule)}>
            Save changes
          </Button>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        </>
      }
    >
      <Field label="Name">{(id) => <TextInput id={id} width={280} value={name} onChange={setName} autoFocus />}</Field>
      <div className={styles.group}>
        <Eyebrow>Schedule</Eyebrow>
        <DaySchedule value={schedule} onChange={setSchedule} />
      </div>
    </InlinePanel>
  )
}
