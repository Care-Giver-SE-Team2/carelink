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

/** Row shape for GET /api/elders — profile.controller.dto.ElderListItemResponse. */
export type ElderListItem = {
  id: number
  fullName: string
  dateOfBirth: string | null
  address: string | null
  sector: string | null
  planStatus: 'published' | 'draft' | 'none'
  planVersion: number | null
}

export function fetchElderList(): Promise<ElderListItem[]> {
  return api<ElderListItem[]>('/elders')
}
