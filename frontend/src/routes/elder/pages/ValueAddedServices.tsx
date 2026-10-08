import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../../shared/api/client'
import {
  createElderValueAddedServiceRequest,
  fetchElderValueAddedServiceRequests,
  fetchValueAddedServices,
} from '../../../features/value-added-services/api'
import type { ValueAddedService, ValueAddedServiceRequest } from '../../../features/value-added-services/types'
import { ElderShell } from '../components/ElderShell'
import {
  ActionStack,
  ChoiceButton,
  InfoCard,
  InfoNote,
  ScreenColumns,
  ScreenFooter,
  ScreenHeader,
  Slot,
  SpeakButton,
  StatusNote,
  WideButton,
} from '../components/ElderUi'
import { greeting } from '../lib/greeting'
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

  return (
    <ElderShell>
      <ScreenColumns
        left={
          <>
            <Slot order={1}>
              <ScreenHeader
                backTo="/elder"
                eyebrow={greeting()}
                title="What do you need?"
                subtitle="Choose an available service and when you would like it."
              />
            </Slot>
            <Slot order={2}>{error && <StatusNote tone="problem">{error}</StatusNote>}</Slot>
            <Slot order={3}>{message && <StatusNote tone="success">{message}</StatusNote>}</Slot>
            <Slot order={5}>
              <div className={styles.form}>
                <h2 className={styles.sectionTitle}>My requests</h2>
                {requests.length === 0 ? (
                  <InfoNote>No requests yet.</InfoNote>
                ) : (
                  requests.map((request) => (
                    <InfoCard key={request.id}>
                      <h3 className={styles.familyName}>{request.serviceName}</h3>
                      <p className={styles.familyRelation}>
                        Status: <strong>{request.status}</strong>
                      </p>
                      <p className={styles.familyMeta}>
                        Requested for:{' '}
                        {request.requestedSchedule
                          ? new Date(request.requestedSchedule).toLocaleString()
                          : 'Not specified'}
                      </p>
                      {request.specialInstructions && (
                        <p className={styles.familyRelation}>{request.specialInstructions}</p>
                      )}
                      {request.visitId && (
                        <p className={styles.familyMeta}>Work order visit: #{request.visitId}</p>
                      )}
                    </InfoCard>
                  ))
                )}
              </div>
            </Slot>
            <Slot order={6}>
              <p className={styles.meta}>This records a service request only. No payment is taken here.</p>
            </Slot>
          </>
        }
        right={
          <Slot order={4}>
            {loading ? (
              <p className={styles.lead}>Loading extra services…</p>
            ) : services.length === 0 ? (
              <InfoCard>
                <h2 className={styles.sectionTitle}>No extra services available</h2>
              </InfoCard>
            ) : (
              <InfoCard>
                <div className={styles.form}>
                  <h2 className={styles.sectionTitle}>New request</h2>
                  <ActionStack>
                    {services.map((item) => (
                      <ChoiceButton
                        key={item.id}
                        label={item.name}
                        selected={item.id === serviceId}
                        onSelect={() => setServiceId(item.id)}
                        disabled={submitting}
                      />
                    ))}
                  </ActionStack>
                  {selected?.description && <p className={styles.lead}>{selected.description}</p>}
                  <label className={styles.fieldLabel}>
                    <span>Requested date and time</span>
                    <input
                      type="datetime-local"
                      value={schedule}
                      disabled={submitting}
                      onChange={(event) => setSchedule(event.target.value)}
                    />
                  </label>
                  <label className={styles.fieldLabel}>
                    <span>Anything we should know?</span>
                    <textarea
                      value={note}
                      disabled={submitting}
                      onChange={(event) => setNote(event.target.value)}
                      placeholder="Optional instructions"
                    />
                  </label>
                  <WideButton onClick={submit} disabled={submitting}>
                    {submitting ? 'Sending…' : `Request ${selected?.name ?? 'service'}`}
                  </WideButton>
                </div>
              </InfoCard>
            )}
          </Slot>
        }
        footer={
          <ScreenFooter>
            <SpeakButton />
          </ScreenFooter>
        }
      />
    </ElderShell>
  )
}
