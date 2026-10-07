import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../../shared/api/client'
import {
  createElderValueAddedServiceRequest,
  fetchElderValueAddedServiceRequests,
  fetchValueAddedServices,
} from '../../../features/value-added-services/api'
import type { ValueAddedService, ValueAddedServiceRequest } from '../../../features/value-added-services/types'
import { RoleShell } from '../../../shared/components/RoleShell'
import styles from '../Elder.module.css'

export default function ValueAddedServices() {
  const [services, setServices] = useState<ValueAddedService[]>([])
  const [requests, setRequests] = useState<ValueAddedServiceRequest[]>([])
  const [serviceId, setServiceId] = useState<number | null>(null)
  const [schedule, setSchedule] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchValueAddedServices(), fetchElderValueAddedServiceRequests()])
      .then(([catalogue, history]) => {
        if (cancelled) return
        setServices(catalogue)
        setRequests(history)
        setServiceId(catalogue[0]?.id ?? null)
      })
      .catch(() => !cancelled && setError('Unable to load extra services.'))
      .finally(() => !cancelled && setLoading(false))
    return () => { cancelled = true }
  }, [])

  const selected = useMemo(() => services.find((item) => item.id === serviceId) ?? null, [services, serviceId])

  async function submit() {
    if (serviceId === null || !schedule) {
      setError('Choose a service and requested date/time.')
      return
    }
    setSubmitting(true)
    setError(null)
    setMessage(null)
    try {
      const saved = await createElderValueAddedServiceRequest({
        valueAddedServiceId: serviceId,
        requestedSchedule: schedule,
        specialInstructions: note.trim() || null,
      })
      setRequests((current) => [saved, ...current])
      setNote('')
      setSchedule('')
      setMessage('Request sent. Status: Pending approval.')
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Unable to send the service request.')
    } finally {
      setSubmitting(false)
    }
  }

  return <RoleShell title="Extra services" theme="elder"><div className={styles.page}>
    <Link className={styles.back} to="/elder">← Back</Link>
    <div><h1>Ask for extra help</h1><p className={styles.intro}>Choose an available service and when you would like it.</p></div>

    {loading && <p>Loading extra services...</p>}
    {error && <div className={styles.warning} role="alert">{error}</div>}

    {!loading && services.length === 0 && <div className={styles.panel}><h2>No extra services available</h2></div>}

    {services.length > 0 && <section className={styles.panel}>
      <h2>New request</h2>
      <label className={styles.field}>Service
        <select value={serviceId ?? ''} onChange={(event) => setServiceId(Number(event.target.value))}>
          {services.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
        </select>
      </label>
      {selected?.description && <p className={styles.meta}>{selected.description}</p>}
      <label className={styles.field}>Requested date and time
        <input type="datetime-local" value={schedule} onChange={(event) => setSchedule(event.target.value)} />
      </label>
      <label className={styles.field}>Anything we should know?
        <textarea value={note} onChange={(event) => setNote(event.target.value)} placeholder="Optional instructions" />
      </label>
      <button className={styles.primary} disabled={submitting} onClick={submit}>
        {submitting ? 'Sending...' : `Request ${selected?.name ?? 'service'}`}
      </button>
    </section>}

    {message && <div className={styles.success}>{message}</div>}

    <section className={styles.panel}>
      <h2>My requests</h2>
      {requests.length === 0 ? <p className={styles.meta}>No requests yet.</p> : requests.map((request) => <div className={styles.binding} key={request.id}>
        <strong>{request.serviceName}</strong>
        <p>Status: <strong>{request.status}</strong></p>
        <p className={styles.meta}>Requested for: {request.requestedSchedule ? new Date(request.requestedSchedule).toLocaleString() : 'Not specified'}</p>
        {request.specialInstructions && <p>{request.specialInstructions}</p>}
        {request.visitId && <p className={styles.meta}>Work order visit: #{request.visitId}</p>}
      </div>)}
    </section>
    <p className={styles.meta}>This records a service request only. No payment is taken here.</p>
  </div></RoleShell>
}
