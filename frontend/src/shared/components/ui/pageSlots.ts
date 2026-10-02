export type PageSlot = number | 'gap'

/**
 * The page numbers to show: first, last, and a window of three around the current page
 * (shifted inward at either end, so page 1 of 17 reads 1 2 3 … 17), with a gap marker
 * wherever numbers are skipped.
 */
export function pageSlots(page: number, pageCount: number): PageSlot[] {
  if (pageCount <= 0) return []
  const windowStart = Math.max(1, Math.min(page - 1, pageCount - 2))
  const shown = new Set([1, pageCount])
  for (let n = windowStart; n < windowStart + 3 && n <= pageCount; n++) shown.add(n)
  const slots: PageSlot[] = []
  let previous = 0
  for (const n of [...shown].sort((a, b) => a - b)) {
    if (n - previous > 1) slots.push('gap')
    slots.push(n)
    previous = n
  }
  return slots
}
