import AbsenceList from './absences/AbsenceList'

/**
 * MG04 — re-roster on caregiver absence.
 * The screens are in ./absences; this keeps the sidebar's route where
 * index.tsx expects to find it.
 */
export default function Absences() {
  return <AbsenceList />
}
