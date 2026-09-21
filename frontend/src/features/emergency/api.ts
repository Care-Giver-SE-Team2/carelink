import { api } from '../../shared/api/client'

export interface EmergencyCall {
  id: number
  elderId: number
  reportedByUserId: number
  source: string
  category: string
  severity: string
  status: string
  latitude: number | null
  longitude: number | null
  locationText: string | null
  description: string | null
  createdAt: string
}

/**
 * Raises an SOS for the currently authenticated elder.
 *
 * The backend resolves the elder profile from the current session,
 * so the frontend does not need to know or send an elderId.
 */
export function createEmergencyCall(): Promise<EmergencyCall> {
  return api<EmergencyCall>(
    '/elders/me/emergency-calls',
    {
      method: 'POST',
      body: JSON.stringify({}),
    },
  )
}