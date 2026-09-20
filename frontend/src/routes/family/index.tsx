import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { IntakeLayout } from './intake/IntakeLayout'
import { IntakeListPage } from './intake/IntakeListPage'
import { IntakeDetailPage } from './intake/IntakeDetailPage'
import { IntakeCreatePage } from './intake/IntakeCreatePage'

/**
 * Family routes; FM01 pages are isolated in the intake directory.
 * @author Wang Zhili
 */
export default function FamilyHome() {
  return (
    <Routes>
      <Route element={<IntakeLayout />}>
        <Route index element={<Navigate to="intake" replace />} />
        <Route path="intake" element={<IntakeListPage />} />
        <Route path="intake/new" element={<IntakeCreatePage />} />
        <Route path="intake/:id" element={<IntakeDetailPage />} />
        <Route
          path="*"
          element={
            <>
              <h1>Page not found</h1>
              <Link to="/family/intake">Back to applications</Link>
            </>
          }
        />
      </Route>
    </Routes>
  )
}
