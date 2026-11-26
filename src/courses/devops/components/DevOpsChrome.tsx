import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { CheckCircle2, Coffee, Compass, Lock, Menu, MoreHorizontal, RotateCcw, X } from 'lucide-react'
import CourseSwitcher from '../../../components/CourseSwitcher'
import { ThemeToggle } from '../../../components/ui'
import { resetPreferences } from '../../../hooks/usePersisted'
import { STAGE_CATALOG } from '../data/catalog'
import { STAGES, useTracker } from '../runtime'

const link = 'flex min-h-[44px] items-center gap-2 border-l-2 px-4 py-2 text-sm'
const active = 'border-sky-500 bg-sky-500/10 font-medium text-sky-600 dark:text-sky-400'
const idle = 'border-transparent hover:bg-slate-200/70 dark:hover:bg-white/5'
export const barBtn = 'grid h-11 w-11 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-slate-100'

/** The stage list behind the hamburger: same role as the phase list in the other courses. */
function StageDrawer({ onClose }: { onClose: () => void }) {
  const trackers: Record<number, ReturnType<typeof useTracker>> = { 1: useTracker(1), 2: useTracker(2) }
  useEffect(() => {
    const away = (e: PointerEvent) => { const t = e.target as Element; if (!t.closest('#devops-menu') && !t.closest('[data-menu-toggle]')) onClose() }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('pointerdown', away)
    window.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); window.removeEventListener('keydown', esc) }
  }, [onClose])
  return (
    <motion.aside id="devops-menu" aria-label="DevOps stages" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
      transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} className="absolute inset-0 z-20 overflow-y-auto bg-white pb-10 dark:bg-[var(--app-bg,#0f1115)] sm:right-auto sm:w-[320px] sm:border-r sm:border-slate-200/70 sm:dark:border-white/5">
      <nav aria-label="Stages" onClick={(e) => { if ((e.target as Element).closest('a')) onClose() }}>
        <h2 className="px-4 pb-1 pt-5 text-sm font-semibold text-slate-500">DevOps Mastery</h2>
        <NavLink to="/devops" end className={({ isActive }) => `${link} ${isActive ? active : idle}`}><Compass size={16} aria-hidden className="shrink-0 text-slate-400" />Course map</NavLink>
        {STAGE_CATALOG.map((s) => {
          const t = trackers[s.number]
          const prevDone = s.number === 1 || !!trackers[s.number - 1]?.p.stageComplete
          const live = s.live && !!STAGES[s.number]
          if (!live || !prevDone) {
            return <span key={s.number} aria-disabled="true" className={`${link} cursor-not-allowed border-transparent text-slate-400 opacity-60`} data-tip={live ? `Complete Stage ${s.number - 1} to unlock` : 'Content arrives in a later phase'} data-tip-start=""><Lock size={16} aria-hidden className="shrink-0" />Stage {s.number}: {s.title}</span>
          }
          return (
            <NavLink key={s.number} to={`/devops/stage/${s.number}`} className={({ isActive }) => `${link} ${isActive ? active : idle}`}>
              {t?.p.stageComplete ? <CheckCircle2 size={16} aria-hidden className="shrink-0 text-emerald-500" /> : <span className="grid h-4 w-4 shrink-0 place-items-center text-xs font-semibold text-slate-400" aria-hidden>{s.number}</span>}
              <span>Stage {s.number}: {s.title}</span>
            </NavLink>
          )
        })}
      </nav>
    </motion.aside>
  )
}

/**
 * The top bar every other course has (menu, home, course switcher, settings), plus a slot for panel toggles.
 * Children fill the area under the bar; the stage drawer slides over that area.
 */
export default function DevOpsChrome({ children, extra }: { children: ReactNode; extra?: ReactNode }) {
  const [menu, setMenu] = useState(false)
  const [more, setMore] = useState(false)
  const loc = useLocation()
  const pop = useRef<HTMLDivElement>(null)
  const moreBtn = useRef<HTMLButtonElement>(null)
  useEffect(() => { setMenu(false) }, [loc.pathname])
  useEffect(() => {
    if (!more) return
    const away = (e: PointerEvent) => { const t = e.target as Node; if (!pop.current?.contains(t) && !moreBtn.current?.contains(t)) setMore(false) }
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMore(false) }
    document.addEventListener('pointerdown', away)
    document.addEventListener('keydown', esc)
    return () => { document.removeEventListener('pointerdown', away); document.removeEventListener('keydown', esc) }
  }, [more])
  return (
    <div className="relative flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <header className="relative z-30 flex h-14 shrink-0 items-center gap-1 px-2 md:px-4">
        <button type="button" onClick={() => setMenu((o) => !o)} data-menu-toggle="" aria-expanded={menu} aria-controls="devops-menu" aria-label={menu ? 'Close navigation' : 'Open navigation'} data-tip={menu ? 'Close menu' : 'Stages'} data-tip-start="" className={barBtn}>{menu ? <X size={20} aria-hidden /> : <Menu size={20} aria-hidden />}</button>
        <Link to="/" aria-label="Home" data-tip="Home" className={barBtn}><Coffee size={18} aria-hidden /></Link>
        <div className="flex min-w-0 flex-1 justify-center"><CourseSwitcher /></div>
        <div className="flex items-center gap-1">
          {extra}
          <button ref={moreBtn} type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-label="Settings" data-tip="Settings" data-tip-end="" className={barBtn}><MoreHorizontal size={20} aria-hidden /></button>
        </div>
        {more && (
          <div ref={pop} className="absolute right-2 top-14 flex items-center gap-1 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-200 dark:bg-[#171a21] dark:ring-white/10">
            <ThemeToggle />
            <button type="button" onClick={() => { if (window.confirm('Reset layout and preferences (theme, panels, sidebar)? Your progress and code are kept.')) { resetPreferences(); window.location.reload() } }} aria-label="Reset layout and preferences" data-tip="Reset layout and preferences" data-tip-end="" className={barBtn}><RotateCcw size={17} aria-hidden /></button>
          </div>
        )}
      </header>
      <div className="relative min-h-0 flex-1">
        <AnimatePresence>{menu && <StageDrawer key="menu" onClose={() => setMenu(false)} />}</AnimatePresence>
        {children}
      </div>
    </div>
  )
}
