import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'
export default function FamilyBindings() {
 const [pairing,setPairing]=useState(false); const [revoked,setRevoked]=useState(false)
 return <RoleShell title="My family" theme="elder"><div className={styles.page}>
  <Link className={styles.back} to="/elder">← Back</Link><h1>Family members</h1>
  {!revoked && <section className={styles.panel}><h2>Alex Tan</h2><p>Son · Primary contact</p><p className={styles.meta}>Access: Full · Status: Active</p><button className={styles.secondary} onClick={() => setRevoked(true)}>Remove family member</button></section>}
  {revoked && <div className={styles.success}>Family binding removed.</div>}
  <section className={styles.panel}><h2>Bind another family member</h2><p>Create a six-digit pairing code and ask your family member to enter it.</p>
   {!pairing ? <button className={styles.primary} onClick={() => setPairing(true)}>Create pairing code</button> : <><div className={styles.code}>482 731</div><p className={styles.meta}>Waiting for family member confirmation.</p></>}
  </section>
 </div></RoleShell>
}
