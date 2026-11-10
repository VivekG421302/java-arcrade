import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { useCourse } from '../hooks/useCourse'
import { useProgress } from '../hooks/useProgress'
import TestRunner from '../components/TestRunner'

export default function TestView() {
  const { id } = useParams()
  const { data, meta } = useCourse()
  const PHASES = data.phases
  const unit = meta.unit
  const { statusOf } = useProgress()
  const phase = PHASES.find((p) => p.id === Number(id))
  if (!phase || statusOf(phase.id) === 'locked') return <Navigate to="/" replace />
  return (
    <div>
      <Link to={`/phase/${phase.id}`} className="inline-flex items-center gap-1 text-sm text-sky-500"><ArrowLeft size={14} aria-hidden /> Back to {unit} {phase.id}</Link>
      <h1 className="mb-6 mt-2 text-2xl font-bold">{unit} {phase.id} test: {phase.title}</h1>
      {/* One question at a time: lower cognitive load, easier keyboard flow, and code questions get the full width. */}
      <TestRunner key={phase.id} phaseId={phase.id} />
    </div>
  )
}
