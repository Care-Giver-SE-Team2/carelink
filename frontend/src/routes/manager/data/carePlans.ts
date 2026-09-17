/**
 * Care plan tree fixtures for screen 2a — see data/elders.ts for the shared
 * README on why this is hardcoded.
 *
 * A task's weekly effort is derived from its `visits` (one entry per
 * scheduled day, each carrying its own per-visit minutes — durations can
 * vary by day) and rolled up through ancestor sub-plans, per the handoff's
 * "the rollup must be computed client-side so edits recompute without a
 * round trip" requirement, and "tracked per-day, not as a single shared
 * value". See lib/planTree.ts.
 */

export type EvidenceType = 'CHECKLIST' | 'READING' | 'PHOTO'

export type DayVisit = { day: string; minutes: number }

export type TaskNode = {
  id: string
  type: 'task'
  name: string
  visits: DayVisit[]
  evidence: EvidenceType
}

export type SubPlanNode = {
  id: string
  type: 'subplan'
  name: string
  /** Sub-plans are flat — no nesting beyond this single level (see the handoff). */
  children: TaskNode[]
  defaultCollapsed?: boolean
}

export type PlanNode = TaskNode | SubPlanNode

export type PlanVersionEntry = { version: number; date: string; summary: string }

/**
 * Grouped catalog for the "Add sub-plan" step 1 picker: selecting an activity
 * both names the sub-plan and determines the single task it starts with — see
 * the handoff ("no separate preset-label step").
 */
export const ACTIVITY_CATALOG: { category: string; activities: string[] }[] = [
  { category: 'Personal care', activities: ['Bathing assistance', 'Grooming', 'Meal support'] },
  { category: 'Health monitoring', activities: ['Vital-sign check'] },
  { category: 'Medication support', activities: ['Morning reminder', 'Evening reminder'] },
  {
    category: 'Social and mobility',
    activities: ['Companionship walk', 'Light exercise', 'Errand accompaniment'],
  },
]

export type ElderProfile = {
  dialect: string
  family: string
  mobility: string
  continuity: string
  requiredCertifications: string[]
}

export type CarePlan = {
  elderId: string
  version: number
  status: 'published' | 'draft'
  visitsPerWeek: number
  lastEditedAt: string
  lastEditedBy: string
  tree: PlanNode[]
  versions: PlanVersionEntry[]
  /** Weekly-effort total as of the last publish — only set when `status` starts
   * as 'draft', so the draft-impact notice has a "from" figure to diff against. */
  priorPublishedHours?: number
}

const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/** Every day, same duration. */
function daily(minutes: number): DayVisit[] {
  return DAY_ORDER.map((day) => ({ day, minutes }))
}

/** Named days, same duration. */
function on(days: string[], minutes: number): DayVisit[] {
  return days.map((day) => ({ day, minutes }))
}

export const ELDER_PROFILES: Record<string, ElderProfile> = {
  'ELD-0311': {
    dialect: 'Malay, Hokkien',
    family: 'Wei Ling (daughter)',
    mobility: 'walker indoors',
    continuity: 'preferred',
    requiredCertifications: ['FIRST AID', 'MANUAL HANDLING', 'MEDICATION PROMPT'],
  },
  'ELD-0288': {
    dialect: 'English, Cantonese',
    family: 'Swee Hong (husband)',
    mobility: 'independent',
    continuity: 'preferred',
    requiredCertifications: ['FIRST AID'],
  },
  'ELD-0402': {
    dialect: 'Tamil, English',
    family: 'Priya (daughter)',
    mobility: 'wheelchair',
    continuity: 'required',
    requiredCertifications: ['FIRST AID', 'MANUAL HANDLING'],
  },
  'ELD-0193': {
    dialect: 'Hokkien, Teochew',
    family: 'Hui Min (granddaughter)',
    mobility: 'walker indoors',
    continuity: 'preferred',
    requiredCertifications: ['FIRST AID', 'MEDICATION PROMPT'],
  },
  'ELD-0367': {
    dialect: 'English, Malay',
    family: 'Guat Choo (wife)',
    mobility: 'independent',
    continuity: 'preferred',
    requiredCertifications: ['FIRST AID'],
  },
}

export const CARE_PLANS: Record<string, CarePlan> = {
  'ELD-0311': {
    elderId: 'ELD-0311',
    version: 4,
    status: 'published',
    visitsPerWeek: 5,
    lastEditedAt: '26 Aug',
    lastEditedBy: 'Tan Mei Ling',
    tree: [
      {
        id: 'personal-care',
        type: 'subplan',
        name: 'Personal care',
        children: [
          {
            id: 'bathing',
            type: 'task',
            name: 'Bathing assistance',
            visits: [
              { day: 'Mon', minutes: 30 },
              { day: 'Wed', minutes: 45 },
              { day: 'Fri', minutes: 60 },
            ],
            evidence: 'CHECKLIST',
          },
          {
            id: 'grooming',
            type: 'task',
            name: 'Grooming',
            visits: on(['Mon', 'Fri'], 15),
            evidence: 'CHECKLIST',
          },
        ],
      },
      {
        id: 'health-monitoring',
        type: 'subplan',
        name: 'Health monitoring',
        children: [
          {
            id: 'vitals',
            type: 'task',
            name: 'Vital-sign check',
            visits: daily(15),
            evidence: 'READING',
          },
        ],
      },
      {
        id: 'medication-support',
        type: 'subplan',
        name: 'Medication support',
        children: [
          {
            id: 'morning-reminder',
            type: 'task',
            name: 'Morning reminder',
            visits: daily(5),
            evidence: 'PHOTO',
          },
          {
            id: 'evening-reminder',
            type: 'task',
            name: 'Evening reminder',
            visits: daily(5),
            evidence: 'PHOTO',
          },
        ],
      },
      {
        id: 'social-mobility',
        type: 'subplan',
        name: 'Social and mobility',
        defaultCollapsed: true,
        children: [
          {
            id: 'companionship-walk',
            type: 'task',
            name: 'Companionship walk',
            visits: on(['Tue'], 20),
            evidence: 'CHECKLIST',
          },
          {
            id: 'light-exercise',
            type: 'task',
            name: 'Light exercise',
            visits: on(['Thu'], 10),
            evidence: 'CHECKLIST',
          },
          {
            id: 'errand-accompaniment',
            type: 'task',
            name: 'Errand accompaniment',
            visits: on(['Sat'], 5),
            evidence: 'CHECKLIST',
          },
        ],
      },
    ],
    versions: [
      { version: 4, date: '26 Aug', summary: 'vitals to daily' },
      { version: 3, date: '02 Jul', summary: 'grooming added' },
      { version: 2, date: '11 Apr', summary: 'intake revision' },
    ],
  },
  'ELD-0288': {
    elderId: 'ELD-0288',
    version: 2,
    status: 'published',
    visitsPerWeek: 3,
    lastEditedAt: '18 Jun',
    lastEditedBy: 'Tan Mei Ling',
    tree: [
      {
        id: 'personal-care',
        type: 'subplan',
        name: 'Personal care',
        children: [
          {
            id: 'bathing',
            type: 'task',
            name: 'Bathing assistance',
            visits: on(['Mon', 'Thu'], 30),
            evidence: 'CHECKLIST',
          },
        ],
      },
      {
        id: 'health-monitoring',
        type: 'subplan',
        name: 'Health monitoring',
        children: [
          {
            id: 'vitals',
            type: 'task',
            name: 'Vital-sign check',
            visits: on(['Mon', 'Wed', 'Fri'], 15),
            evidence: 'READING',
          },
        ],
      },
    ],
    versions: [
      { version: 2, date: '18 Jun', summary: 'bathing frequency reduced' },
      { version: 1, date: '02 Feb', summary: 'intake revision' },
    ],
  },
  'ELD-0402': {
    elderId: 'ELD-0402',
    version: 5,
    status: 'draft',
    priorPublishedHours: 3.0,
    visitsPerWeek: 4,
    lastEditedAt: '01 Sep',
    lastEditedBy: 'Tan Mei Ling',
    tree: [
      {
        id: 'personal-care',
        type: 'subplan',
        name: 'Personal care',
        children: [
          {
            id: 'bathing',
            type: 'task',
            name: 'Bathing assistance',
            visits: on(['Mon', 'Wed', 'Fri', 'Sun'], 40),
            evidence: 'CHECKLIST',
          },
        ],
      },
      {
        id: 'mobility',
        type: 'subplan',
        name: 'Mobility support',
        children: [
          {
            id: 'transfer-assist',
            type: 'task',
            name: 'Wheelchair transfer assist',
            visits: daily(10),
            evidence: 'CHECKLIST',
          },
        ],
      },
    ],
    versions: [
      { version: 4, date: '15 Jul', summary: 'mobility support added' },
      { version: 3, date: '20 May', summary: 'intake revision' },
    ],
  },
  'ELD-0193': {
    elderId: 'ELD-0193',
    version: 9,
    status: 'published',
    visitsPerWeek: 6,
    lastEditedAt: '30 Aug',
    lastEditedBy: 'Tan Mei Ling',
    tree: [
      {
        id: 'personal-care',
        type: 'subplan',
        name: 'Personal care',
        children: [
          {
            id: 'bathing',
            type: 'task',
            name: 'Bathing assistance',
            visits: daily(40),
            evidence: 'CHECKLIST',
          },
          {
            id: 'grooming',
            type: 'task',
            name: 'Grooming',
            visits: daily(10),
            evidence: 'CHECKLIST',
          },
        ],
      },
      {
        id: 'health-monitoring',
        type: 'subplan',
        name: 'Health monitoring',
        children: [
          {
            id: 'vitals',
            type: 'task',
            name: 'Vital-sign check',
            visits: daily(15),
            evidence: 'READING',
          },
        ],
      },
      {
        id: 'medication-support',
        type: 'subplan',
        name: 'Medication support',
        children: [
          {
            id: 'morning-reminder',
            type: 'task',
            name: 'Morning reminder',
            visits: daily(5),
            evidence: 'PHOTO',
          },
          {
            id: 'midday-reminder',
            type: 'task',
            name: 'Midday reminder',
            visits: daily(5),
            evidence: 'PHOTO',
          },
          {
            id: 'evening-reminder',
            type: 'task',
            name: 'Evening reminder',
            visits: daily(5),
            evidence: 'PHOTO',
          },
        ],
      },
    ],
    versions: [
      { version: 9, date: '30 Aug', summary: 'medication reminder added' },
      { version: 8, date: '14 Jul', summary: 'bathing to daily' },
      { version: 7, date: '02 Jun', summary: 'intake revision' },
    ],
  },
  'ELD-0367': {
    elderId: 'ELD-0367',
    version: 1,
    status: 'published',
    visitsPerWeek: 2,
    lastEditedAt: '20 Aug',
    lastEditedBy: 'Tan Mei Ling',
    tree: [
      {
        id: 'health-monitoring',
        type: 'subplan',
        name: 'Health monitoring',
        children: [
          {
            id: 'vitals',
            type: 'task',
            name: 'Vital-sign check',
            visits: on(['Tue', 'Sat'], 15),
            evidence: 'READING',
          },
        ],
      },
    ],
    versions: [{ version: 1, date: '20 Aug', summary: 'plan created' }],
  },
}
