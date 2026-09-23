const dateFormatter = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })

/** An ISO "yyyy-MM-dd" or full ISO datetime string as "23 Sep 2026", matching Header.tsx's date style. */
export function formatDate(isoDateOrDateTime: string): string {
  const iso = isoDateOrDateTime.length <= 10 ? `${isoDateOrDateTime}T00:00:00` : isoDateOrDateTime
  return dateFormatter.format(new Date(iso))
}

/** An ISO "yyyy-MM-dd" next-visit date as "23 Sep 2026", matching Header.tsx's date style. */
export function formatNextVisit(nextVisitDate: string | null): string | null {
  if (!nextVisitDate) return null
  return formatDate(nextVisitDate)
}
