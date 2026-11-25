import { Navigate, Route, Routes } from 'react-router-dom'
import DevOpsShell from './pages/DevOpsShell'
import Hub from './pages/Hub'
import StagePage from './pages/StagePage'

/** Mounted by the app at /devops/*. Lazy-loaded, so Java/Rust/PostgreSQL learners never download any of it. */
export default function DevOpsRoutes() {
  return (
    <Routes>
      <Route element={<DevOpsShell />}>
        <Route index element={<Hub />} />
        <Route path="stage/:n" element={<StagePage />} />
        <Route path="*" element={<Navigate to="/devops" replace />} />
      </Route>
    </Routes>
  )
}
