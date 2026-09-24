import ReportList from './reports/ReportList'

/**
 * MG07 — generate and archive periodic reports.
 * The screen itself is in ./reports; this keeps the sidebar's route where
 * index.tsx expects to find it. MG08's spot checks are not on it yet.
 */
export default function Reports() {
  return <ReportList />
}
