import { api } from './client'

/** Mirrors profile.domain.model.Elder — GET /api/elders/{id} returns it as-is (no DTO yet). */
export type ElderResponse = {
  id: number
  userId: number | null
  fullName: string
  gender: 'MALE' | 'FEMALE' | 'OTHER' | null
  dateOfBirth: string | null
  phone: string | null
  address: string | null
  postalCode: string | null
  sector: string | null
  preferredDialects: string | null
  livesAlone: boolean | null
  mobilityLevel: 'INDEPENDENT' | 'ASSISTIVE_CANE' | 'WHEELCHAIR_BEDBOUND' | null
  continuityPreference: 'PREFERRED' | 'REQUIRED' | 'NONE' | null
  medicalNotes: string | null
  createdAt: string
  updatedAt: string
}

export function fetchElder(id: string): Promise<ElderResponse> {
  return api<ElderResponse>(`/elders/${id}`)
}

/**
 * Row shape for GET /api/elders — profile.controller.dto.ElderListItemResponse. The three
 * primaryCaregiver fields are all null while the elder has no primary caregiver.
 */
export type ElderListItem = {
  id: number
  fullName: string
  dateOfBirth: string | null
  address: string | null
  sector: string | null
  planStatus: 'published' | 'draft' | 'stopped' | 'none'
  planVersion: number | null
  nextVisitDate: string | null
  primaryCaregiverId: number | null
  primaryCaregiverName: string | null
  primaryCaregiverAssignedAt: string | null
}

/**
 * Lists elders visible to the current user.
 * @param signal Cancels an outstanding request
 * @return Elder list using the shared profile response
 * @author Wang Zhili
 */
export function fetchElderList(signal?: AbortSignal): Promise<ElderListItem[]> {
  return api<ElderListItem[]>('/elders', { signal })
}

/** One row of GET /api/caregivers — profile.controller.dto.CaregiverOptionResponse. */
export type CaregiverOption = {
  id: number
  fullName: string
  sector: string | null
  status: 'ONBOARDING' | 'AVAILABLE' | 'BUSY' | 'INACTIVE'
  /** Server-side Caregiver.isAssignable(): false for onboarding or inactive caregivers. */
  assignable: boolean
}

/** Every caregiver, by name, for the manager's picker (manager only). */
export function fetchCaregivers(): Promise<CaregiverOption[]> {
  return api<CaregiverOption[]>('/caregivers')
}

/** PUT /api/elders/{elderId}/primary-caregiver response — profile.controller.dto.PrimaryCaregiverResponse. */
export type PrimaryCaregiverResponse = {
  caregiverId: number
  fullName: string
  assignedAt: string
}

/** Names the caregiver as the elder's primary caregiver, replacing any existing one. */
export function assignPrimaryCaregiver(elderId: string, caregiverId: number): Promise<PrimaryCaregiverResponse> {
  return api<PrimaryCaregiverResponse>(`/elders/${elderId}/primary-caregiver`, {
    method: 'PUT',
    body: JSON.stringify({ caregiverId }),
  })
}

/** Removes the elder's primary caregiver; succeeds even if none is assigned. */
export function removePrimaryCaregiver(elderId: string): Promise<void> {
  return api<void>(`/elders/${elderId}/primary-caregiver`, { method: 'DELETE' })
}
