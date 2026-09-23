import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFamilySchedule } from '../../../features/schedule/useFamilySchedule'
import type { ScheduleSelection } from '../../../features/schedule/useFamilySchedule'
import { shiftDays, singaporeToday, weekLabel, weekStart } from '../../../features/schedule/presentation'
import { ScheduleFeedback } from './ScheduleFeedback'
import { ScheduleVisitList } from './ScheduleVisitList'
import styles from './FamilySchedule.module.css'

/**
 * Lets family members choose an elder and browse their Singapore weekly schedule.
 * @author Wang Zhili
 */
export function FamilySchedulePage() {
  const [selection, setSelection] = useState<ScheduleSelection>(() => ({
    elderId: null, week: weekStart(singaporeToday()), page: 0,
  }))
  const { resource, refresh } = useFamilySchedule(selection)
  const selectedElderId = resource.status === 'success'
    ? resource.data.selectedElderId : selection.elderId
  const changeWeek = (week: string) => setSelection({ elderId: selectedElderId, week, page: 0 })
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
          <div><span>WEEK OF</span><h2>{weekLabel(selection.week)}</h2></div>
          <button onClick={() => changeWeek(weekStart(singaporeToday()))}>This week</button>
        </div>
        <div className={styles.weekControls}>
          <button onClick={() => changeWeek(shiftDays(selection.week, -7))}>← Previous week</button>
          <button onClick={() => changeWeek(shiftDays(selection.week, 7))}>Next week →</button>
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
        {resource.data.visits && <ScheduleVisitList visits={resource.data.visits} onPage={(page) => {
          setSelection({ ...selection, elderId: selectedElderId, page })
        }} />}
      </>}
    </div>
  )
}
