import { api } from '../../shared/api/client'
import type { ValueAddedService, ValueAddedServiceRequest, ValueAddedServiceRequestCreate } from './types'

export function fetchValueAddedServices(): Promise<ValueAddedService[]> {
  return api<ValueAddedService[]>('/elders/me/value-added-services')
}

export function fetchElderValueAddedServiceRequests(): Promise<ValueAddedServiceRequest[]> {
  return api<ValueAddedServiceRequest[]>('/elders/me/value-added-service-requests')
}

export function createElderValueAddedServiceRequest(
  request: ValueAddedServiceRequestCreate,
): Promise<ValueAddedServiceRequest> {
  return api<ValueAddedServiceRequest>('/elders/me/value-added-service-requests', {
    method: 'POST',
    body: JSON.stringify(request),
  })
}

export function fetchFamilyValueAddedServiceRequests(elderId: number): Promise<ValueAddedServiceRequest[]> {
  return api<ValueAddedServiceRequest[]>(`/family/value-added-service-requests?elderId=${elderId}`)
}

export function decideValueAddedServiceRequest(
  id: number,
  decision: 'APPROVED' | 'REJECTED',
): Promise<ValueAddedServiceRequest> {
  return api<ValueAddedServiceRequest>(`/family/value-added-service-requests/${id}/decision`, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  })
}
