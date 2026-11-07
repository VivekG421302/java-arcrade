import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, ChevronDown, Cog, Coffee } from 'lucide-react'
import { COURSE_IDS, COURSE_META, COURSES, type CourseId } from '../lib/content'
import { useCourse } from '../hooks/useCourse'
import { tip } from '../lib/shortcuts'

const icons = { java: Coffee, rust: Cog }
const accent = { java: 'border-amber-500/50 bg-amber-500/10 text-amber-600 dark:text-amber-500', rust: 'border-orange-600/50 bg-orange-600/10 text-orange-600 dark:text-orange-500' }

function useSwitch() {
  const { course, setCourse } = useCourse()
  const nav = useNavigate()
  return { course, pick: (c: CourseId) => { if (c !== course) { setCourse(c); nav('/') } } }
}

/** Course selector for the middle of the top bar. */
function CourseDropdown() {
  const { course, pick } = useSwitch()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const down = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('pointerdown', down)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', down); window.removeEventListener('keydown', esc) }
  }, [open])
  const Icon = icons[course]
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="listbox" aria-expanded={open} aria-label={`Course: ${COURSE_META[course].name}. Change course`} {...tip('Choose course', 'course')} onClick={() => setOpen(!open)}
        className="inline-flex h-11 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-slate-700 hover:bg-slate-200/70 dark:text-slate-200 dark:hover:bg-white/10">
        <Icon size={17} aria-hidden />
        <span>{COURSE_META[course].name}</span>
        <ChevronDown size={14} aria-hidden className={`text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      <div className="pointer-events-none absolute left-1/2 top-12 z-40 w-64 max-w-[90vw] -translate-x-1/2">
        <AnimatePresence>
          {open && (
            <motion.ul role="listbox" aria-label="Course" initial={{ opacity: 0, y: -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.97 }} transition={{ duration: 0.15 }}
              className="pointer-events-auto rounded-xl bg-white p-1 shadow-xl ring-1 ring-slate-200 dark:bg-[#171a20] dark:ring-white/10">
              {COURSE_IDS.map((c) => {
                const I = icons[c], d = COURSES[c]
                return (
                  <li key={c} role="option" aria-selected={course === c}>
                    <button type="button" onClick={() => { pick(c); setOpen(false) }}
                      className="flex min-h-[48px] w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-900/5 dark:hover:bg-white/10">
                      <I size={18} aria-hidden className="shrink-0 text-slate-600 dark:text-slate-300" />
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-slate-800 dark:text-slate-100">{COURSE_META[c].name}</span>
                        <span className="block text-xs text-slate-500 dark:text-slate-400">{d.phases.length} phases · {d.questions.length} problems · {d.projects.length} projects</span>
                      </span>
                      {course === c && <Check size={16} aria-hidden className="shrink-0 text-sky-600 dark:text-sky-400" />}
                    </button>
                  </li>
                )
              })}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

/** "cards" = big choices on the home page, "dropdown" = compact selector for the top bar. */
export default function CourseSwitcher({ variant }: { variant: 'cards' | 'dropdown' }) {
  const { course, pick } = useSwitch()
  if (variant === 'dropdown') return <CourseDropdown />
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
