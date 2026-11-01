import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Workspace from './components/Workspace'

const Landing = lazy(() => import('./pages/Landing'))
const PhaseView = lazy(() => import('./pages/PhaseView'))
const TestView = lazy(() => import('./pages/TestView'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const AntiPatterns = lazy(() => import('./pages/AntiPatterns'))
const Scenarios = lazy(() => import('./pages/Scenarios'))

export default function App() {
  return (
    <Workspace>
    <Suspense fallback={<p className="p-8 text-slate-500" role="status">Loading…</p>}>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="phase/:id" element={<PhaseView />} />
          <Route path="phase/:id/test" element={<TestView />} />
          <Route path="questions" element={<QuestionBank />} />
          <Route path="anti-patterns" element={<AntiPatterns />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </Suspense>
    </Workspace>
  )
}
