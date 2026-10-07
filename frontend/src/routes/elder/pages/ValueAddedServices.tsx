import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'

const SERVICES = ['Hospital escort', 'Grocery assistance', 'Companionship', 'Light housekeeping']
export default function ValueAddedServices() {
  const [service, setService] = useState(SERVICES[0]); const [note, setNote] = useState(''); const [sent, setSent] = useState(false)
  return <RoleShell title="Extra services" theme="elder"><div className={styles.page}>
    <Link className={styles.back} to="/elder">← Back</Link><h1>Ask for extra help</h1>
    <section className={styles.panel}><h2>Choose a service</h2><select value={service} onChange={e => setService(e.target.value)}>{SERVICES.map(s => <option key={s}>{s}</option>)}</select>
      <label>Anything we should know?<textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note" /></label></section>
    {!sent ? <button className={styles.primary} onClick={() => setSent(true)}>Request {service}</button> : <div className={styles.success}>Request sent. Status: Pending approval.</div>}
    <p className={styles.meta}>This screen records a service request only. No payment is taken here.</p>
  </div></RoleShell>
}
