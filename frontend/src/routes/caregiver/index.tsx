import { Link, Route, Routes } from 'react-router-dom'
import { RoleShell } from '../../shared/components/RoleShell'
import { getMyProfile } from '../../features/caregiver/api'
import { useCaregiverQuery } from '../../features/caregiver/useCaregiverQuery'
import { QueryError } from './components'
import SchedulePage from './SchedulePage'
import WorkPackPage from './WorkPackPage'
import styles from './Caregiver.module.css'

export default function CaregiverHome() {
  const { result, reload } = useCaregiverQuery('caregiver-profile', getMyProfile)
  return (
    <div className={styles.shell}><RoleShell title="Caregiver" theme="standard">
      {result.status === 'loading' && <p role="status">Checking caregiver access…</p>}
      {result.status === 'error' && <QueryError error={result.error} retry={reload} profile />}
      {result.status === 'success' && <Routes>
        <Route index element={<SchedulePage />} />
        <Route path="visits/:visitId" element={<WorkPackPage />} />
        <Route path="*" element={<p>Page not found. <Link to="/caregiver">My schedule</Link></p>} />
      </Routes>}
    </RoleShell></div>
  )
}
