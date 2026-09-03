import { BrowserRouter, Route, Routes } from 'react-router-dom'

import ManagerHome from './routes/manager'
import CaregiverHome from './routes/caregiver'
import FamilyHome from './routes/family'
import ElderHome from './routes/elder'
import LandingHome from './routes/landing'
import NotFound from './routes/not-found'

/**
 * One React application serving four kinds of user. Each role owns one folder
 * under routes/, so no two people edit the same file.
 *
 * The landing page (sign-in + pitch) is the entry point: a signed-out
 * visitor lands there, and a signed-in user is sent straight to the client
 * that matches their role.
 */
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingHome />} />
        <Route path="/manager/*" element={<ManagerHome />} />
        <Route path="/caregiver/*" element={<CaregiverHome />} />
        <Route path="/family/*" element={<FamilyHome />} />
        <Route path="/elder/*" element={<ElderHome />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </BrowserRouter>
  )
}
