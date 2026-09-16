import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'

export default function ConfirmVisit() {
  const [response, setResponse] = useState<'CONFIRMED' | 'DISPUTED'>('CONFIRMED')
  const [notes, setNotes] = useState('')
  const [done, setDone] = useState(false)
  return <RoleShell title="Confirm service" theme="elder"><div className={styles.page}>
    <Link className={styles.back} to="/elder">← Back</Link>
    <h1>Was today's service completed?</h1>
    <section className={styles.panel}>
      <h2>Today's visit</h2><p>Personal care · 10:00 AM</p><p className={styles.meta}>Caregiver: Mary Tan</p>
    </section>
    {!done ? <>
      <label className={styles.option}><input type="radio" checked={response === 'CONFIRMED'} onChange={() => setResponse('CONFIRMED')} /> Yes, service was completed</label>
      <label className={styles.option}><input type="radio" checked={response === 'DISPUTED'} onChange={() => setResponse('DISPUTED')} /> No, there was a problem</label>
      <label>Optional feedback<textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Tell us how the visit went" /></label>
      <button className={styles.primary} onClick={() => setDone(true)}>Submit confirmation</button>
    </> : <div className={styles.success}>Thank you. Your response has been recorded.</div>}
  </div></RoleShell>
}
