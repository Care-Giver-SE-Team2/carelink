import type { IntakeApplicationCreateRequest, MobilityLevel } from './types'

export interface IntakeFormValues {
  targetElderName: string
  targetElderAge: string
  targetAddress: string
  postalCode: string
  mobilityLevel: MobilityLevel
  preferredDialects: string
  careNeeds: string[]
  otherCareNeeds: string
  medicalNotes: string
}

export const emptyIntakeForm: IntakeFormValues = {
  targetElderName: '',
  targetElderAge: '',
  targetAddress: '',
  postalCode: '',
  mobilityLevel: 'INDEPENDENT',
  preferredDialects: '',
  careNeeds: [],
  otherCareNeeds: '',
  medicalNotes: '',
}

export type IntakeFormErrors = Partial<Record<keyof IntakeFormValues, string>>

/**
 * Checks form input against the submission contract and supported integer range.
 * @param values Elder information entered in the form
 * @return Field messages, or an empty object when the input is valid
 * @author Wang Zhili
 */
export function validateIntakeForm(values: IntakeFormValues): IntakeFormErrors {
  const errors: IntakeFormErrors = {}
  const requiredFields = [
    ['targetElderName', 'Elder full name', 100],
    ['targetAddress', 'Home address', 255],
    ['postalCode', 'Postal code', 10],
  ] as const
  for (const [field, label, limit] of requiredFields) {
    const value = values[field].trim()
    if (!value) errors[field] = label + ' is required.'
    else if ([...value].length > limit) errors[field] = 'Use ' + limit + ' characters or fewer.'
  }
  const age = values.targetElderAge.trim()
  if (age && (!/^\d+$/.test(age) || !Number.isInteger(Number(age)) || Number(age) > 2147483647)) {
    errors.targetElderAge = 'Enter a whole number from 0 to 2147483647.'
  }
  if ([...values.preferredDialects.trim()].length > 100) {
    errors.preferredDialects = 'Use 100 characters or fewer.'
  }
  return errors
}

/**
 * Converts form values to the family submission contract, omitting empty optional fields.
 * @param values Elder information entered in the form
 * @return Family-editable request fields with distinct care needs
 * @author Wang Zhili
 */
export function intakeFormRequest(values: IntakeFormValues): IntakeApplicationCreateRequest {
  const request: IntakeApplicationCreateRequest = {
    targetElderName: values.targetElderName.trim(),
    targetAddress: values.targetAddress.trim(),
    postalCode: values.postalCode.trim(),
    mobilityLevel: values.mobilityLevel,
    careNeeds: [
      ...new Set([
        ...values.careNeeds,
        ...values.otherCareNeeds
          .split('\n')
          .map((value) => value.trim())
          .filter(Boolean),
      ]),
    ],
  }
  if (values.targetElderAge.trim()) request.targetElderAge = Number(values.targetElderAge)
  if (values.preferredDialects.trim()) request.preferredDialects = values.preferredDialects.trim()
  if (values.medicalNotes.trim()) request.medicalNotes = values.medicalNotes
  return request
}
