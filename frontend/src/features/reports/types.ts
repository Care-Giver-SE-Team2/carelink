/**
 * The report module's contract, field for field as the backend publishes it
 * (`docs/api/openapi-draft.yaml`, tag Reports: Report, ReportDetail,
 * ReportAmendment and the list page).
 *
 * Dates and times are strings and stay strings. The period is a Java
 * `LocalDate` ("2026-09-14"); `createdAt` is a `LocalDateTime` with no offset,
 * and with a fractional part only when the application has just written it -
 * a report read back from the database comes whole-second. Typing either as
 * `Date` would invite `new Date(value)`, which reads the text in whatever zone
 * the browser is in. See `presentation.ts` for how they are shown.
 *
 * @author Wang Ziyu
 */

/** Who a report is for. The same facts are filtered differently for each. */
export type ReportAudience = 'FAMILY' | 'REGULATOR' | 'INTERNAL'

/** Only PUBLISHED is produced: reports are filed as they are generated. */
export type ReportStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'

/** TEMPLATE until a language-model summary exists; it is not a failure. */
export type ReportGeneratedBy = 'MODEL' | 'TEMPLATE'

/** One filed report, without its text - a row of the list, or what Generate hands back. */
export interface Report {
  id: number
  elderId: number
  audience: ReportAudience
  periodStart: string
  periodEnd: string
  status: ReportStatus
  dataComplete: boolean
  missingItems: string[]
  generatedBy: ReportGeneratedBy
  createdAt: string | null
  archivedAt: string | null
}

/** One titled section. The body is plain text, one item per line. */
export interface ReportSection {
  title: string
  body: string
}

/** A correction appended to a report: dated, signed, never edited afterwards. */
export interface ReportAmendment {
  id: number
  note: string
  authorUserId: number
  createdAt: string
}

/** One report with its text, its disclaimer if its reader gets one, and every correction. */
export interface ReportDetail extends Report {
  sections: ReportSection[]
  disclaimer: string | null
  amendments: ReportAmendment[]
}

/** One page of the list. */
export interface ReportPage {
  items: Report[]
  page: number
  size: number
  totalElements: number
}

export interface ReportListQuery {
  page: number
  size: number
  elderId?: number
  audience?: ReportAudience
}

/** Body of POST /reports/generate. No elder means every elder with a visit in the period. */
export interface GenerateReportsRequest {
  elderId?: number
  periodStart: string
  periodEnd: string
}
