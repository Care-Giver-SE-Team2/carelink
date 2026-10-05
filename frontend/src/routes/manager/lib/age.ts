/**
 * Whole years since a date of birth, as of today; null when it isn't on record (e.g. an elder
 * created from a family application, which asks only for an age).
 */
export function ageFromDateOfBirth(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const today = new Date()
  let age = today.getFullYear() - dob.getFullYear()
  const hasHadBirthdayThisYear =
    today.getMonth() > dob.getMonth() ||
    (today.getMonth() === dob.getMonth() && today.getDate() >= dob.getDate())
  if (!hasHadBirthdayThisYear) age -= 1
  return age
}

/** "82 y.o.", or "age unknown" when there is no date of birth. */
export function ageLabel(age: number | null): string {
  return age === null ? 'age unknown' : `${age} y.o.`
}
