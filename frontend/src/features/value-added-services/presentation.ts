/** "1 hour", "1½ hours", "3 hours", "45 minutes": how long the visit will be, in the elder's words. */
export function durationText(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`
  const hours = Math.floor(minutes / 60)
  const half = minutes % 60 >= 30 ? '½' : ''
  return `${hours}${half} hour${hours === 1 && !half ? '' : 's'}`
}
