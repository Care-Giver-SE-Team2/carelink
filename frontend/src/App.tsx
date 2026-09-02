import { BrowserRouter, Link, Route, Routes } from 'react-router-dom'

import ManagerHome from './routes/manager'
import CaregiverHome from './routes/caregiver'
import FamilyHome from './routes/family'
import ElderHome from './routes/elder'

/**
 * One React application serving four kinds of user. Each role owns one folder
 * under routes/, so no two people edit the same file.
 *
 * This landing page exists for development and demonstration only; in use, a
 * signed-in user is sent straight to the client that matches their role.
 */
const ROLES = [
  { path: '/manager', label: 'Manager console', cn: '主管台', note: '桌面布局' },
  { path: '/caregiver', label: 'Caregiver client', cn: '护理员端', note: '移动优先' },
  { path: '/family', label: 'Family portal', cn: '家属端', note: '移动优先' },
  { path: '/elder', label: 'Elder client', cn: '老人端', note: '大字号、高对比' },
]

function Landing() {
  return (
    <main style={{ padding: 'var(--gap)', maxWidth: 640, margin: '0 auto' }}>
      <h1>CareLink</h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Development entry point. Pick a client.
      </p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 'var(--gap)' }}>
        {ROLES.map((role) => (
          <li key={role.path}>
            <Link
              to={role.path}
              className="tap-target"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--gap)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius)',
                padding: 'var(--gap)',
                textDecoration: 'none',
                color: 'var(--text)',
              }}
            >
              <strong>{role.cn}</strong>
              <span style={{ color: 'var(--text-muted)' }}>
                {role.label} · {role.note}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/manager/*" element={<ManagerHome />} />
        <Route path="/caregiver/*" element={<CaregiverHome />} />
        <Route path="/family/*" element={<FamilyHome />} />
        <Route path="/elder/*" element={<ElderHome />} />
      </Routes>
    </BrowserRouter>
  )
}
