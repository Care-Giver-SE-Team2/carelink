import { Link, Navigate, Route, Routes } from 'react-router-dom'
import { IntakeLayout } from './intake/IntakeLayout'
import { IntakeListPage } from './intake/IntakeListPage'
import { IntakeDetailPage } from './intake/IntakeDetailPage'
import { IntakeCreatePage } from './intake/IntakeCreatePage'
import { FamilyLayout } from './components/FamilyLayout'
import { FamilySchedulePage } from './schedule/FamilySchedulePage'
import { FamilyReportListPage } from './reports/FamilyReportListPage'
import { FamilyReportDetailPage } from './reports/FamilyReportDetailPage'
import { FamilyWeeklySummaryPage } from './reports/FamilyWeeklySummaryPage'
import { FamilyVisitProgressPage } from './visits/FamilyVisitProgressPage'
import { FamilyHomePage } from './home/FamilyHomePage'
import { FamilyAccountPage } from './account/FamilyAccountPage'
import { SelectedElderProvider } from './components/FamilyElderContext'
import { FamilyRosterChangesPage } from './changes/FamilyRosterChangesPage'
import { FamilySpotChecksPage } from './spot-checks/FamilySpotChecksPage'
import { FamilyIncidentPage } from './incidents/FamilyIncidentPage'

/**
 * Family home, application, schedule, visit progress and care report routes.
 * @author Wang Zhili
 */
export default function FamilyHome() {
  return (
    <SelectedElderProvider>
    <Routes>
      <Route index element={<Navigate to="home" replace />} />
      <Route element={<FamilyLayout title="Home" />}>
        <Route path="home" element={<FamilyHomePage />} />
      </Route>
      <Route element={<FamilyLayout title="Incident details" />}>
        <Route path="incidents/:id" element={<FamilyIncidentPage />} />
      </Route>
      <Route element={<FamilyLayout title="Account" />}>
        <Route path="account" element={<FamilyAccountPage />} />
      </Route>
      <Route element={<FamilyLayout title="Visit progress" />}>
        <Route path="visits/:visitId" element={<FamilyVisitProgressPage />} />
      </Route>
      <Route element={<FamilyLayout title="Care reports" />}>
        <Route path="reports" element={<FamilyReportListPage />} />
      </Route>
      <Route element={<FamilyLayout title="Care report" />}>
        <Route path="reports/:id" element={<FamilyReportDetailPage />} />
      </Route>
      <Route element={<FamilyLayout title="Weekly care summary" />}>
        <Route path="reports/weekly" element={<FamilyWeeklySummaryPage />} />
      </Route>
      <Route element={<FamilyLayout title="Weekly schedule" />}>
        <Route path="schedule" element={<FamilySchedulePage />} />
      </Route>
      <Route element={<FamilyLayout title="Visit changes" />}>
        <Route path="changes" element={<FamilyRosterChangesPage />} />
      </Route>
      <Route element={<FamilyLayout title="Spot checks" />}>
        <Route path="spot-checks" element={<FamilySpotChecksPage />} />
      </Route>
      <Route element={<IntakeLayout />}>
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
    </SelectedElderProvider>
  )
}
