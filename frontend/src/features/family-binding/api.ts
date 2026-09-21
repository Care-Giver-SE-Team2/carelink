import { api } from '../../shared/api/client'

import type {
  CreateFamilyBindingRequest,
  FamilyBinding,
} from './types'

/**
 * Loads family bindings belonging to the currently authenticated elder.
 */
export function getFamilyBindings(): Promise<
  FamilyBinding[]
> {
  return api<FamilyBinding[]>(
    '/elders/me/family-bindings',
  )
}

/**
 * Creates a family binding request for the current elder.
 */
export function createFamilyBinding(
  request: CreateFamilyBindingRequest,
): Promise<FamilyBinding> {
  return api<FamilyBinding>(
    '/elders/me/family-bindings',
    {
      method: 'POST',
      body: JSON.stringify(request),
    },
  )
}

/**
 * Revokes one of the current elder's family bindings.
 */
export function revokeFamilyBinding(
  bindingId: number,
): Promise<FamilyBinding> {
  return api<FamilyBinding>(
    `/elders/me/family-bindings/${bindingId}`,
    {
      method: 'DELETE',
    },
  )
}