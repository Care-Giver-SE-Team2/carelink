import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'
export default function Emergency() {
 const [sent,setSent]=useState(false)
 return <RoleShell title="Emergency help" theme="elder"><div className={styles.page}>
  <Link className={styles.back} to="/elder">← Back</Link><h1>Do you need urgent help?</h1>
  <div className={styles.warning}>Press the red button once. CareLink will raise an urgent SOS and alert the care team and your family.</div>
  {!sent ? <button className={styles.danger} onClick={() => setSent(true)}>SOS — GET HELP NOW</button> : <div className={styles.success}><h2>SOS sent</h2><p>Help has been alerted. Keep this screen open for status updates.</p><p className={styles.meta}>Status: Critical incident raised</p></div>}
 </div></RoleShell>
}
