import { api } from '../../shared/api/client'
import type { FamilyCaregiver, FamilyCredential } from './types'

/**
 * Reads a caregiver's public profile using the current family session.
 * @param caregiverId Caregiver assigned to an accessible elder's visit
 * @param signal Cancels an outstanding request
 * @return Authorised caregiver's public profile
 * @author Wang Zhili
 */
export function getFamilyCaregiver(caregiverId: number, signal?: AbortSignal): Promise<FamilyCaregiver> {
  return api<FamilyCaregiver>(`/caregivers/${caregiverId}`, { signal })
}

/**
 * Reads the caregiver's public credentials in the API's display order.
 * @param caregiverId Caregiver assigned to an accessible elder's visit
 * @param signal Cancels an outstanding request
 * @return Public credentials, or an empty array when none are available
 * @author Wang Zhili
 */
export function listFamilyCredentials(caregiverId: number, signal?: AbortSignal): Promise<FamilyCredential[]> {
  return api<FamilyCredential[]>(`/caregivers/${caregiverId}/credentials`, { signal })
}
