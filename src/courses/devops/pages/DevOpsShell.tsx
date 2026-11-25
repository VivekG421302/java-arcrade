import { Suspense } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import CourseSwitcher from '../../../components/CourseSwitcher'
import { ThemeToggle } from '../../../components/ui'

const btn = 'inline-flex h-11 items-center gap-1.5 rounded-md px-3 text-sm font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100'

/** Page frame for the DevOps module: same top bar pattern as the other courses, its own scroll area. */
export default function DevOpsShell() {
  return (
    <div className="relative flex h-full flex-col">
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-1 px-2 md:px-4">
        <Link to="/" className={btn} aria-label="Back to your courses"><ArrowLeft size={18} aria-hidden /><span className="hidden sm:inline">Courses</span></Link>
        <div className="flex min-w-0 flex-1 justify-center"><CourseSwitcher /></div>
        <ThemeToggle />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <Suspense fallback={<p className="p-8 text-center text-slate-500" role="status">Loading…</p>}><Outlet /></Suspense>
      </div>
    </div>
  )
}
