import { lazy } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Workspace from './components/Workspace'
import DevOpsEntry from './courses/devops/Entry'   // static on purpose: it owns the Suspense + error boundary for its own lazy chunk
import { useCourse } from './hooks/useCourse'

const Landing = lazy(() => import('./pages/Landing'))
const PhaseView = lazy(() => import('./pages/PhaseView'))
const TestView = lazy(() => import('./pages/TestView'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const AntiPatterns = lazy(() => import('./pages/AntiPatterns'))
const Scenarios = lazy(() => import('./pages/Scenarios'))
const Projects = lazy(() => import('./pages/Projects'))

export default function App() {
  const { course } = useCourse()
  return (
    <Workspace>
      <Routes key={course}>
        {/* the DevOps module is a sibling of the course layout: it has no CourseId, so Java/Rust/PostgreSQL data and progress are untouched */}
        <Route path="devops/*" element={<DevOpsEntry />} />
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="phase/:id" element={<PhaseView />} />
          <Route path="phase/:id/test" element={<TestView />} />
          <Route path="questions" element={<QuestionBank />} />
          <Route path="anti-patterns" element={<AntiPatterns />} />
          <Route path="scenarios" element={<Scenarios />} />
          <Route path="projects" element={<Projects />} />
          <Route path="*" element={<Landing />} />
        </Route>
      </Routes>
    </Workspace>
  )
}
