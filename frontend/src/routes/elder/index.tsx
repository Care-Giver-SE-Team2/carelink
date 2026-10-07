import { Link, Route, Routes } from 'react-router-dom'
import { RoleShell } from '../../shared/components/RoleShell'
import ConfirmVisit from './pages/ConfirmVisit'
import ValueAddedServices from './pages/ValueAddedServices'
import Emergency from './pages/Emergency'
import FamilyBindings from './pages/FamilyBindings'
import styles from './Elder.module.css'

function ElderDashboard() {
  return (
    <RoleShell title="CareLink for Elder" theme="elder">
      <div className={styles.home}>
        <div>
          <h1>What would you like to do?</h1>
          <p className={styles.intro}>Choose one large button below.</p>
        </div>
        <nav className={styles.menu} aria-label="Elder services">
          <Link className={styles.card} to="confirm-service">
            <span className={styles.icon} aria-hidden="true">✓</span>
            <span className={styles.cardTitle}>Confirm service</span>
            <span className={styles.cardHint}>Confirm today's visit and give feedback</span>
          </Link>
          <Link className={styles.card} to="extra-services">
            <span className={styles.icon} aria-hidden="true">＋</span>
            <span className={styles.cardTitle}>Extra services</span>
            <span className={styles.cardHint}>Ask for additional help</span>
          </Link>
          <Link className={`${styles.card} ${styles.sos}`} to="emergency">
            <span className={styles.icon} aria-hidden="true">!</span>
            <span className={styles.cardTitle}>Emergency help</span>
            <span className={styles.cardHint}>Send an SOS immediately</span>
          </Link>
          <Link className={styles.card} to="family">
            <span className={styles.icon} aria-hidden="true">♥</span>
            <span className={styles.cardTitle}>My family</span>
            <span className={styles.cardHint}>View or bind a family member</span>
          </Link>
        </nav>
      </div>
    </RoleShell>
  )
}

export default function ElderHome() {
  return <Routes>
    <Route index element={<ElderDashboard />} />
    <Route path="confirm-service" element={<ConfirmVisit />} />
    <Route path="extra-services" element={<ValueAddedServices />} />
    <Route path="emergency" element={<Emergency />} />
    <Route path="family" element={<FamilyBindings />} />
  </Routes>
}
