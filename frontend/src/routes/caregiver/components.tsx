import { useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api/client'
import styles from './Caregiver.module.css'

export function QueryError({ error, retry, profile = false }: { error: unknown; retry: () => void; profile?: boolean }) {
  const navigate = useNavigate()
  const status = error instanceof ApiError ? error.status : 0
  useEffect(() => { if (status === 401) navigate('/', { replace: true }) }, [status, navigate])
  if (status === 401) return <p role="status">Your session has ended. Returning to sign in…</p>
  const heading = status === 403 ? 'Access not permitted' : status === 404 ? profile ? 'Caregiver profile not linked' : 'Visit not found' : status === 400 ? 'Check the date range' : 'Unable to load this page'
  const message = status === 403 ? 'This page is available only to the caregiver currently assigned to the visit.'
    : status === 404 ? profile ? 'Your account has no caregiver profile. Ask your manager to link it.' : 'This visit is unavailable. Return to your schedule.'
    : status === 400 ? 'Enter both dates in order, with a range of at most 31 days.'
    : status === 409 ? 'This visit’s plan data needs attention. Please contact your manager.'
    : 'Check your connection and try again. Previously loaded care details have been cleared.'
  return <div className={styles.error} role="alert"><h2>{heading}</h2><p>{message}</p><button className={styles.button} onClick={retry}>Try again</button>{' '}<Link to="/caregiver">My schedule</Link></div>
}
