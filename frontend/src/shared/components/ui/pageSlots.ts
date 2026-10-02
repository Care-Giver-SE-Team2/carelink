export type PageSlot = number | 'gap'

/** How many slots (numbers and gaps) the pagination always shows once there are more pages. */
const SLOTS = 7

/**
 * The page numbers to show, always the same count so the control keeps its length from page
 * to page: every page when there are at most seven; otherwise first, last, and the current
 * page with a neighbour either side, with a gap marker wherever numbers are skipped. Near
 * either end the gap closes and the run extends instead, so page 3 of 17 reads
 * 1 2 3 4 5 … 17 and page 9 reads 1 … 8 9 10 … 17.
 */
export function pageSlots(page: number, pageCount: number): PageSlot[] {
  if (pageCount <= 0) return []
  if (pageCount <= SLOTS) return Array.from({ length: pageCount }, (_, i) => i + 1)
  const run = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => from + i)
  if (page <= SLOTS - 3) return [...run(1, SLOTS - 2), 'gap', pageCount]
  if (page >= pageCount - (SLOTS - 4)) return [1, 'gap', ...run(pageCount - (SLOTS - 3), pageCount)]
  return [1, 'gap', page - 1, page, page + 1, 'gap', pageCount]
}
