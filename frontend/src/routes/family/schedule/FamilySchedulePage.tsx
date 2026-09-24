import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFamilySchedule } from '../../../features/schedule/useFamilySchedule'
import type { ScheduleSelection } from '../../../features/schedule/useFamilySchedule'
import type { FamilyVisitPage } from '../../../features/schedule/types'
import { isScheduleDate, scheduleDateBounds, shiftDays, singaporeToday, weekLabel, weekStart } from '../../../features/schedule/presentation'
import { ScheduleFeedback } from './ScheduleFeedback'
import { ScheduleVisitList } from './ScheduleVisitList'
import { CaregiverDetails } from './CaregiverDetails'
import styles from './FamilySchedule.module.css'

/**
 * Lets family members choose an elder and browse their Singapore weekly schedule.
 * @author Wang Zhili
 */
export function FamilySchedulePage() {
  const [selection, setSelection] = useState<Pick<ScheduleSelection, 'elderId' | 'page'> & { date: string }>(() => ({
    elderId: null, date: singaporeToday(), page: 0,
  }))
  const week = weekStart(selection.date)
  const { resource, refresh, invalidateAccess } = useFamilySchedule({ ...selection, week })
  const [caregiver, setCaregiver] = useState<{ visits: FamilyVisitPage; id: number } | null>(null)
  const selectedElderId = resource.status === 'success'
    ? resource.data.selectedElderId : selection.elderId
  const changeDate = (date: string) => {
    if (isScheduleDate(date)) setSelection({ elderId: selectedElderId, date, page: 0 })
  }
  const resetAccess = () => {
    setSelection((value) => ({ ...value, elderId: null, page: 0 }))
    refresh()
  }
  const reload = () => {
    setSelection((value) => ({ ...value, elderId: selectedElderId }))
    refresh()
  }

  return (
    <div className={styles.schedule}>
      <section className={styles.hero}>
        <p className={styles.eyebrow}>YOUR FAMILY'S CARE</p>
        <h1>Weekly schedule</h1>
        <p>A clear view of the care planned for your loved one.</p>
      </section>
      <section className={styles.weekPanel} aria-label="Choose a week">
        <div className={styles.weekHeading}>
          <div><span>WEEK OF</span><h2>{weekLabel(week)}</h2></div>
          <button onClick={() => changeDate(singaporeToday())}>This week</button>
        </div>
        <div className={styles.datePicker}>
          <label htmlFor="schedule-date">Choose a date</label>
          <input
            id="schedule-date"
            type="date"
            min={scheduleDateBounds.min}
            max={scheduleDateBounds.max}
            value={selection.date}
            aria-describedby="schedule-date-help"
            onChange={(event) => {
              const { value, validity } = event.currentTarget
              if (value && validity.valid && /^\d{4}-\d{2}-\d{2}$/.test(value)) changeDate(value)
            }}
          />
          <p id="schedule-date-help">Choose any date to view its whole week.</p>
        </div>
        <div className={styles.weekControls}>
          <button
            disabled={week <= scheduleDateBounds.min}
            onClick={() => changeDate(shiftDays(selection.date, -7))}
          >← Previous week</button>
          <button
            disabled={week >= weekStart(scheduleDateBounds.max)}
            onClick={() => changeDate(shiftDays(selection.date, 7))}
          >Next week →</button>
        </div>
        <p>All dates and times are in Singapore time (SGT).</p>
      </section>
      {resource.status === 'loading' && <div className={styles.loading} role="status">
        <span className={styles.spinner} aria-hidden="true" />Loading your schedule…
      </div>}
      {resource.status === 'error' && <ScheduleFeedback error={resource.error} onRetry={reload} onResetAccess={resetAccess} />}
      {resource.status === 'success' && <>
        <div className={styles.toolbar}>
          {resource.data.elders.length > 0 && <div className={styles.elderPicker}>
            <label htmlFor="schedule-elder">Care for</label>
            <select id="schedule-elder" value={selectedElderId ?? ''} onChange={(event) => {
              setSelection({ ...selection, elderId: Number(event.target.value), page: 0 })
            }}>
              {resource.data.elders.map((elder) => <option key={elder.id} value={elder.id}>{elder.fullName}</option>)}
            </select>
          </div>}
          <button onClick={reload}>Refresh</button>
        </div>
        {resource.data.elders.length === 0 && <section className={styles.state}>
          <h2>No linked elders yet</h2>
          <p>Your available elders will appear here once a family binding is active. Contact your care team if you need help with access.</p>
          <Link to="/family/intake">View my applications</Link>
        </section>}
        {resource.data.visits && <ScheduleVisitList
          visits={resource.data.visits}
          onPage={(page) => setSelection({ ...selection, elderId: selectedElderId, page })}
          onCaregiver={(id) => setCaregiver({ visits: resource.data.visits!, id })}
        />}
        {caregiver && caregiver.visits === resource.data.visits && <CaregiverDetails
          key={caregiver.id}
          caregiverId={caregiver.id}
          onClose={() => setCaregiver(null)}
          onAccessError={invalidateAccess}
        />}
      </>}
    </div>
  )
}
