import { useNavigate } from 'react-router-dom'
import { Cog, Coffee } from 'lucide-react'
import { COURSE_IDS, COURSE_META, COURSES, type CourseId } from '../lib/content'
import { useCourse } from '../hooks/useCourse'
import { tip } from '../lib/shortcuts'

const icons = { java: Coffee, rust: Cog }
const accent = { java: 'border-amber-500/50 bg-amber-500/10 text-amber-500', rust: 'border-orange-600/50 bg-orange-600/10 text-orange-500' }

/** Pick the course. "cards" = big choices for the home page, "pills" = compact switch for the sidebar. */
export default function CourseSwitcher({ variant }: { variant: 'cards' | 'pills' }) {
  const { course, setCourse } = useCourse()
  const nav = useNavigate()
  const pick = (c: CourseId) => { if (c !== course) { setCourse(c); nav('/') } }

  if (variant === 'pills') {
    return (
      <div role="group" aria-label="Course" className="mx-3 mt-3 flex gap-1 rounded-xl bg-slate-200/70 p-1 dark:bg-white/5">
        {COURSE_IDS.map((c) => {
          const Icon = icons[c]
          return (
            <button key={c} type="button" aria-pressed={course === c} onClick={() => pick(c)} {...tip(`Switch to ${COURSE_META[c].name}`, c === course ? undefined : 'course')}
              className={`flex min-h-[40px] flex-1 items-center justify-center gap-2 rounded-lg text-sm font-medium transition-colors ${course === c ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
              <Icon size={16} aria-hidden /> {COURSE_META[c].name}
            </button>
          )
        })}
      </div>
    )
  }
  return (
    <div role="group" aria-label="Choose your course" className="grid gap-3 sm:grid-cols-2">
      {COURSE_IDS.map((c) => {
        const Icon = icons[c], m = COURSE_META[c], d = COURSES[c]
        return (
          <button key={c} type="button" aria-pressed={course === c} onClick={() => pick(c)}
            className={`rounded-2xl border p-4 text-left transition-colors ${course === c ? accent[c] : 'border-slate-300/60 hover:bg-slate-100 dark:border-white/10 dark:hover:bg-white/5'}`}>
            <span className="flex items-center gap-2 font-semibold"><Icon size={18} aria-hidden /> {m.name}</span>
            <span className="mt-1 block text-sm font-normal text-slate-500">{d.phases.length} phases · {d.questions.length} problems · {d.projects.length} projects</span>
          </button>
        )
      })}
    </div>
  )
}
