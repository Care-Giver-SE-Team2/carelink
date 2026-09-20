import { api } from '../../shared/api/client'
import type {
  IntakeApplication,
  IntakeApplicationCreateRequest,
  IntakeApplicationPage,
  IntakeListQuery,
} from './types'

/**
 * Queries the current family's applications with pagination and an optional status.
 * @param query Page number, page size and optional application status
 * @param signal Cancels an outstanding request
 * @return The matching application page
 * @author Wang Zhili
 */
export function listIntakeApplications(
  { page, size, status }: IntakeListQuery,
  signal?: AbortSignal,
): Promise<IntakeApplicationPage> {
  const query = new URLSearchParams({ page: String(page), size: String(size) })
  if (status) query.set('status', status)
  return api<IntakeApplicationPage>('/intake-applications?' + query, { signal })
}

/**
 * Reads an application that the current family is authorised to view.
 * @param id Application identifier
 * @param signal Cancels an outstanding request
 * @return The application and its recorded review details
 * @author Wang Zhili
 */
export function getIntakeApplication(id: string, signal?: AbortSignal): Promise<IntakeApplication> {
  return api<IntakeApplication>('/intake-applications/' + encodeURIComponent(id), { signal })
}

/**
 * Submits family-supplied details without automatically retrying a write.
 * @param input Elder information and requested care
 * @param signal Cancels the request
 * @return The saved application, including its server-assigned identifier
 * @author Wang Zhili
 */
export async function submitIntakeApplication(
  input: IntakeApplicationCreateRequest,
  signal?: AbortSignal,
): Promise<IntakeApplication> {
  const application = await api<IntakeApplication>('/intake-applications', {
    method: 'POST',
    body: JSON.stringify(input),
    signal,
  })
  if (
    !application ||
    !Number.isSafeInteger(application.id) ||
    application.id <= 0 ||
    application.status !== 'SUBMITTED'
  ) {
    throw new Error('The submission response could not be confirmed')
  }
  return application
}
