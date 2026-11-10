import { lazy } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Workspace from './components/Workspace'
import { useCourse } from './hooks/useCourse'

const Landing = lazy(() => import('./pages/Landing'))
const PhaseView = lazy(() => import('./pages/PhaseView'))
const TestView = lazy(() => import('./pages/TestView'))
const QuestionBank = lazy(() => import('./pages/QuestionBank'))
const AntiPatterns = lazy(() => import('./pages/AntiPatterns'))
const Scenarios = lazy(() => import('./pages/Scenarios'))
const Projects = lazy(() => import('./pages/Projects'))
const StudyGuide = lazy(() => import('./pages/StudyGuide'))

export default function App() {
  const { course } = useCourse()
  return (
    <Workspace>
      <Routes key={course}>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="study-guide" element={<StudyGuide />} />
          <Route path="phase/:id" element={course === 'java' ? <Navigate to="/study-guide" replace /> : <PhaseView />} />
          <Route path="phase/:id/test" element={course === 'java' ? <Navigate to="/study-guide" replace /> : <TestView />} />
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
