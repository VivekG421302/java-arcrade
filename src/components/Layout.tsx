import { Bell, BellOff, CheckCircle2, ChevronDown, ChevronRight, Coffee, Flame, ListTree, Lock, LogIn, LogOut, Menu, MoreHorizontal, RefreshCw } from 'lucide-react'
import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import { content, PHASES } from '../lib/content'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { ThemeToggle } from './ui'
import { disableReminders, enableReminders, reminderBlocked, reminderEnabled, reminderSupported, startLocalScheduler, subscribePush } from '../lib/reminder'

const CHANGE = 'reminder-change'

/** Always mounted (settings menu is collapsed): runs the in-app noon check and registers server push. */
function ReminderEngine() {
  const { user } = useAuth()
  const { current } = useProgress()
  const [on, setOn] = useState(reminderEnabled)
  useEffect(() => { const f = () => setOn(reminderEnabled()); window.addEventListener(CHANGE, f); return () => window.removeEventListener(CHANGE, f) }, [])
  const body = `Midday check-in: update your progress and continue Phase ${current}.`
  useEffect(() => (on ? startLocalScheduler(() => body) : undefined), [on, body])
  useEffect(() => { if (on && user) void subscribePush(user.id).catch(() => false) }, [on, user])
  return null
}

function ReminderToggle() {
  const { user } = useAuth()
  const [on, setOn] = useState(reminderEnabled)
  if (!reminderSupported()) return null
  const blocked = reminderBlocked()
  const toggle = async () => {
    if (on) { await disableReminders(); setOn(false) } else setOn(await enableReminders(user?.id))
    window.dispatchEvent(new Event(CHANGE))
  }
  const label = blocked ? 'Notifications are blocked in your browser settings' : on ? 'Daily 12:00 reminder on (click to turn off)' : 'Remind me daily at 12:00'
  return (
    <button type="button" onClick={toggle} disabled={blocked} aria-pressed={on} aria-label={label} data-tip={label} data-tip-end=""
      className={`grid h-11 w-11 place-items-center rounded-md hover:bg-slate-200 disabled:opacity-40 dark:hover:bg-white/10 ${on ? 'text-sky-500' : ''}`}>
      {on ? <Bell size={20} aria-hidden /> : <BellOff size={20} aria-hidden />}
    </button>
  )
}

const statusIcon = { locked: Lock, in_progress: RefreshCw, completed: CheckCircle2 }
const statusColor = { locked: 'text-slate-400', in_progress: 'text-sky-500', completed: 'text-emerald-500' }
const link = 'flex min-h-[44px] items-center gap-2 border-l-2 px-4 py-2 text-sm'
const active = 'border-sky-500 bg-sky-500/10 font-medium text-sky-600 dark:text-sky-400'
const idle = 'border-transparent hover:bg-slate-200/70 dark:hover:bg-white/5'
const cats = Array.from(new Set(content.questions.map((q) => q.category)))

function AuthModal({ onClose }: { onClose: () => void }) {
  const { signIn, signUp } = useAuth()
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [f, setF] = useState({ email: '', password: '', name: '' })
  const [msg, setMsg] = useState<string | null>(null)
  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err = mode === 'in' ? await signIn(f.email, f.password) : await signUp(f.email, f.password, f.name)
    if (err) setMsg(err)
    else if (mode === 'up') setMsg('Check your email to confirm your account, then sign in.')
    else onClose()
  }
  const input = 'min-h-[44px] w-full rounded-md border border-slate-300 bg-transparent px-3 dark:border-white/20'
  return (
    <div role="dialog" aria-modal="true" aria-label="Sign in" className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4" onClick={onClose}>
      <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-sm space-y-3 rounded-xl bg-white p-6 shadow-xl dark:bg-[#171a21]">
        <h2 className="text-lg font-semibold">{mode === 'in' ? 'Sign in' : 'Create account'}</h2>
        {mode === 'up' && <input className={input} placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />}
        <input className={input} type="email" required placeholder="Email" autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <input className={input} type="password" required minLength={6} placeholder="Password" autoComplete={mode === 'in' ? 'current-password' : 'new-password'} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
        {msg && <p role="alert" className="text-sm text-amber-500">{msg}</p>}
        <button className="min-h-[44px] w-full rounded-md bg-sky-600 font-medium text-white hover:bg-sky-500">{mode === 'in' ? 'Sign in' : 'Sign up'}</button>
        <button type="button" onClick={() => setMode(mode === 'in' ? 'up' : 'in')} className="min-h-[44px] w-full text-sm text-sky-500">
          {mode === 'in' ? 'No account? Sign up' : 'Have an account? Sign in'}
        </button>
      </form>
    </div>
  )
}

function TopBar({ onMenu, onToc, tocAvailable }: { onMenu: () => void; onToc: () => void; tocAvailable: boolean }) {
  const { user, enabled, signOut } = useAuth()
  const { streak } = useProgress()
  const [modal, setModal] = useState(false)
  const [more, setMore] = useState(false)
  const btn = 'grid h-11 w-11 place-items-center rounded-md text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-slate-100'
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-1 bg-white/90 px-2 backdrop-blur dark:bg-[#0f1115]/90 md:px-4">
      <button type="button" onClick={onMenu} aria-label="Open navigation" data-tip="Menu" data-tip-start="" className={btn}><Menu size={20} aria-hidden /></button>
      <Link to="/" aria-label="Home" data-tip="Home" className={btn}><Coffee size={18} aria-hidden /></Link>
      <div className="ml-auto flex items-center gap-1">
        {tocAvailable && <button type="button" onClick={onToc} aria-label="Contents of this phase" data-tip="Contents" className={btn}><ListTree size={20} aria-hidden /></button>}
        <button type="button" onClick={() => setMore(!more)} aria-expanded={more} aria-label="Settings" data-tip="Settings" data-tip-end="" className={btn}><MoreHorizontal size={20} aria-hidden /></button>
      </div>
      {more && (
        <div className="absolute right-2 top-14 flex items-center gap-1 rounded-lg bg-white p-1 shadow-lg ring-1 ring-slate-200 dark:bg-[#171a21] dark:ring-white/10">
          <span data-tip="Day streak" data-tip-end="" className="relative inline-flex items-center gap-1 px-2 text-sm text-slate-500"><Flame size={14} aria-hidden /> {streak}</span>
          <ReminderToggle />
          <ThemeToggle />
          {user ? (
            <button type="button" onClick={signOut} data-tip="Sign out" data-tip-end="" aria-label="Sign out" className={btn}><LogOut size={18} aria-hidden /></button>
          ) : enabled ? (
            <button type="button" onClick={() => { setModal(true); setMore(false) }} aria-label="Sign in" data-tip="Sign in" data-tip-end="" className={btn}><LogIn size={18} aria-hidden /></button>
          ) : null}
        </div>
      )}
      {modal && <AuthModal onClose={() => setModal(false)} />}
    </header>
  )
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { statusOf, readPct } = useProgress()
  const loc = useLocation()
  const m = useMatch('/phase/:id/*')
  const [expanded, setExpanded] = useState<number[]>([])
  const [qOpen, setQOpen] = useState(false)
  useEffect(() => { if (!open) return; const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose(); window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k) }, [open, onClose])
  useEffect(() => { if (m?.params.id) setExpanded((e) => Array.from(new Set([...e, Number(m.params.id)]))) }, [m?.params.id])
  const heading = 'px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-slate-500'
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/40" onClick={onClose} aria-hidden />}
      <aside aria-label="Sidebar" className={`fixed bottom-0 left-0 top-14 z-40 w-[300px] max-w-[85vw] overflow-y-auto bg-white pb-10 shadow-xl transition-transform dark:bg-[#12151b] ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav aria-label="Primary">
          <h2 className={heading}>Part 1 · Roadmap</h2>
          {PHASES.map((p) => {
            const st = statusOf(p.id)
            const isOpen = expanded.includes(p.id) && st !== 'locked'
            return (
              <div key={p.id}>
                {st === 'locked' ? (
                  <span className={`${link} cursor-not-allowed border-transparent text-slate-400 opacity-60`} aria-disabled="true" data-tip={`Complete Phase ${p.id - 1} test to unlock`} data-tip-start="">
                    <Lock size={16} aria-hidden /> Phase {p.id}: {p.title}
                  </span>
                ) : (
                  <div className="flex">
                    <NavLink to={`/phase/${p.id}`} end className={({ isActive }) => `${link} flex-1 ${isActive && !loc.hash ? active : idle}`}>
                      {(() => { const I = statusIcon[st]; return <I size={16} aria-hidden className={`shrink-0 ${statusColor[st]}`} /> })()}<span>Phase {p.id}: {p.title}</span>
                    </NavLink>
                    <button type="button" aria-expanded={isOpen} aria-label={`Toggle Phase ${p.id} sections`} data-tip={isOpen ? "Collapse sections" : "Show sections"} data-tip-end="" className="grid w-11 place-items-center text-slate-500"
                      onClick={() => setExpanded(isOpen ? expanded.filter((x) => x !== p.id) : [...expanded, p.id])}>{isOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}</button>
                  </div>
                )}
                {isOpen && (
                  <ul className="ml-4">
                    {p.sections.map((s) => (
                      <li key={s.id}>
                        <Link to={`/phase/${p.id}#${s.id}`} className={`${link} text-xs ${loc.hash === `#${s.id}` ? active : idle}`}>{s.title}</Link>
                      </li>
                    ))}
                    <li className="px-4 pb-1 text-xs text-slate-500">{readPct(p)}% read</li>
                  </ul>
                )}
              </div>
            )
          })}

          <h2 className={heading}>Part 2 · Question Bank</h2>
          <div className="flex">
            <NavLink to="/questions" end className={({ isActive }) => `${link} flex-1 ${isActive && !loc.search ? active : idle}`}>All {content.questions.length} questions</NavLink>
            <button type="button" aria-expanded={qOpen} aria-label="Toggle question categories" data-tip={qOpen ? 'Collapse' : 'Categories'} data-tip-end="" className="grid w-11 place-items-center text-slate-500" onClick={() => setQOpen(!qOpen)}>{qOpen ? <ChevronDown size={16} aria-hidden /> : <ChevronRight size={16} aria-hidden />}</button>
          </div>
          {qOpen && cats.map((c) => (
            <Link key={c} to={{ pathname: '/questions', search: `?cat=${encodeURIComponent(c)}` }}
              className={`${link} pl-8 text-xs ${loc.pathname === '/questions' && loc.search === `?cat=${encodeURIComponent(c)}` ? active : idle}`}>{c}</Link>
          ))}

          <h2 className={heading}>Part 3 · Code Review</h2>
          <NavLink to="/anti-patterns" className={({ isActive }) => `${link} ${isActive ? active : idle}`}>Anti-Patterns (50)</NavLink>

          <h2 className={heading}>Part 4 · Production</h2>
          <NavLink to="/scenarios" className={({ isActive }) => `${link} ${isActive ? active : idle}`}>Scenarios (30)</NavLink>
        </nav>
      </aside>
    </>
  )
}

function TOC({ onClose }: { onClose: () => void }) {
  const m = useMatch('/phase/:id')
  const phase = PHASES.find((p) => p.id === Number(m?.params.id))
  if (!phase) return null
  return (
    <>
      <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} aria-hidden />
      <aside aria-label="On this page" className="fixed bottom-0 right-0 top-14 z-40 w-64 max-w-[85vw] overflow-y-auto bg-white p-5 shadow-xl dark:bg-[#12151b]">
        <ul className="space-y-1">
          {phase.sections.map((s) => (
            <li key={s.id}><a href={`#${s.id}`} onClick={onClose} className="block min-h-[44px] py-2.5 text-sm text-slate-600 hover:text-sky-500 dark:text-slate-400">{s.title}</a></li>
          ))}
        </ul>
      </aside>
    </>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [toc, setToc] = useState(false)
  const { pathname, hash } = useLocation()
  const onPhase = !!useMatch('/phase/:id')
  const close = useCallback(() => setOpen(false), [])
  useEffect(() => { setOpen(false); setToc(false); if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return (
    <div className="min-h-screen">
      <ReminderEngine />
      <TopBar onMenu={() => setOpen(true)} onToc={() => setToc(!toc)} tocAvailable={onPhase} />
      <Sidebar open={open} onClose={close} />
      <main className="px-5 pb-24 pt-6 md:px-10">
        <div className="mx-auto max-w-[760px]"><Outlet /></div>
      </main>
      {toc && onPhase && <TOC onClose={() => setToc(false)} />}
    </div>
  )
}
