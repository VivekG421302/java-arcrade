import { Bell, BellOff, CheckCircle2, ChevronDown, ChevronRight, Coffee, Flame, ListTree, Lock, Menu, RefreshCw } from 'lucide-react'
import { useEffect, useState, type FormEvent } from 'react'
import { Link, NavLink, Outlet, useLocation, useMatch } from 'react-router-dom'
import { content, PHASES } from '../lib/content'
import { useAuth } from '../hooks/useAuth'
import { useProgress } from '../hooks/useProgress'
import { ThemeToggle } from './ui'
import { disableReminders, enableReminders, reminderBlocked, reminderEnabled, reminderSupported, startLocalScheduler, subscribePush } from '../lib/reminder'

function ReminderToggle() {
  const { user } = useAuth()
  const { current } = useProgress()
  const [on, setOn] = useState(reminderEnabled)
  const body = `Midday check-in: update your progress and continue Phase ${current}.`
  useEffect(() => (on ? startLocalScheduler(() => body) : undefined), [on, body])
  useEffect(() => { if (on && user) void subscribePush(user.id).catch(() => false) }, [on, user])
  if (!reminderSupported()) return null
  const blocked = reminderBlocked()
  const toggle = async () => {
    if (on) { await disableReminders(); setOn(false) } else setOn(await enableReminders(user?.id))
  }
  const label = blocked ? 'Notifications are blocked in your browser settings' : on ? 'Daily 12:00 reminder on (click to turn off)' : 'Remind me daily at 12:00'
  return (
    <button type="button" onClick={toggle} disabled={blocked} aria-pressed={on} aria-label={label} title={label}
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

function TopBar({ onMenu, onToc }: { onMenu: () => void; onToc: () => void }) {
  const { user, enabled, signOut } = useAuth()
  const { streak, current } = useProgress()
  const [modal, setModal] = useState(false)
  const phase = PHASES.find((p) => p.id === current)
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-slate-200 bg-white/90 px-2 backdrop-blur dark:border-white/10 dark:bg-[#0f1115]/90 md:px-4">
      <button type="button" onClick={onMenu} aria-label="Open navigation" className="grid h-11 w-11 place-items-center rounded-md hover:bg-slate-200 dark:hover:bg-white/10 md:hidden"><Menu size={20} aria-hidden /></button>
      <Link to="/" className="inline-flex items-center gap-2 font-semibold tracking-tight"><Coffee size={18} aria-hidden /> Java Mastery</Link>
      {phase && <span className="ml-3 hidden truncate text-sm text-slate-500 sm:block">Now: Phase {phase.id} · {phase.title}</span>}
      <div className="ml-auto flex items-center gap-1">
        <span title="Day streak" className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 px-2.5 py-1 text-xs font-medium text-orange-500"><Flame size={14} aria-hidden /> {streak}</span>
        <button type="button" onClick={onToc} aria-label="Toggle table of contents" className="hidden h-11 w-11 place-items-center rounded-md hover:bg-slate-200 dark:hover:bg-white/10 xl:grid"><ListTree size={20} aria-hidden /></button>
        <ReminderToggle />
        <ThemeToggle />
        {user ? (
          <button type="button" onClick={signOut} title={`${user.email} — sign out`} aria-label="Sign out"
            className="grid h-11 w-11 place-items-center"><span className="grid h-8 w-8 place-items-center rounded-full bg-sky-600 text-sm font-semibold uppercase text-white">{user.email?.[0]}</span></button>
        ) : enabled ? (
          <button type="button" onClick={() => setModal(true)} className="min-h-[44px] rounded-md px-3 text-sm font-medium text-sky-500 hover:bg-sky-500/10">Sign in</button>
        ) : (
          <span className="px-2 text-xs text-slate-500" title="Add Supabase env vars to sync progress across devices">Guest</span>
        )}
      </div>
      {modal && <AuthModal onClose={() => setModal(false)} />}
    </header>
  )
}

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { statusOf, readPct } = useProgress()
  const loc = useLocation()
  const m = useMatch('/phase/:id/*')
  const [expanded, setExpanded] = useState<number[]>([])
  useEffect(() => { if (m?.params.id) setExpanded((e) => Array.from(new Set([...e, Number(m.params.id)]))) }, [m?.params.id])
  const heading = 'px-4 pb-1 pt-5 text-xs font-semibold uppercase tracking-wider text-slate-500'
  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={onClose} aria-hidden />}
      <aside aria-label="Sidebar" className={`fixed bottom-0 left-0 top-14 z-40 w-[300px] max-w-[85vw] overflow-y-auto border-r border-slate-200 bg-slate-50 pb-10 transition-transform dark:border-white/10 dark:bg-[#12151b] md:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}>
        <nav aria-label="Primary">
          <h2 className={heading}>Part 1 · Roadmap</h2>
          {PHASES.map((p) => {
            const st = statusOf(p.id)
            const isOpen = expanded.includes(p.id) && st !== 'locked'
            return (
              <div key={p.id}>
                {st === 'locked' ? (
                  <span className={`${link} cursor-not-allowed border-transparent text-slate-400 opacity-60`} aria-disabled="true" title={`Complete Phase ${p.id - 1} test to unlock`}>
                    <Lock size={16} aria-hidden /> Phase {p.id}: {p.title}
                  </span>
                ) : (
                  <div className="flex">
                    <NavLink to={`/phase/${p.id}`} end className={({ isActive }) => `${link} flex-1 ${isActive && !loc.hash ? active : idle}`}>
                      {(() => { const I = statusIcon[st]; return <I size={16} aria-hidden className={`shrink-0 ${statusColor[st]}`} /> })()}<span>Phase {p.id}: {p.title}</span>
                    </NavLink>
                    <button type="button" aria-expanded={isOpen} aria-label={`Toggle Phase ${p.id} sections`} className="grid w-11 place-items-center text-slate-500"
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
          <NavLink to="/questions" end className={({ isActive }) => `${link} ${isActive && !loc.search ? active : idle}`}>All 100 questions</NavLink>
          {cats.map((c) => (
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

function TOC() {
  const m = useMatch('/phase/:id')
  const { hash } = useLocation()
  const phase = PHASES.find((p) => p.id === Number(m?.params.id))
  if (!phase) return null
  return (
    <aside aria-label="On this page" className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-60 shrink-0 overflow-y-auto p-6 xl:block">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">On this page</p>
      <ul className="space-y-1 border-l border-slate-200 dark:border-white/10">
        {phase.sections.map((s) => (
          <li key={s.id}>
            <a href={`#${s.id}`} className={`block py-1 pl-3 text-sm ${hash === `#${s.id}` ? 'text-sky-500' : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'}`}>{s.title}</a>
          </li>
        ))}
      </ul>
    </aside>
  )
}

export default function Layout() {
  const [open, setOpen] = useState(false)
  const [toc, setToc] = useState(true)
  const { pathname, hash } = useLocation()
  useEffect(() => { setOpen(false); if (!hash) window.scrollTo(0, 0) }, [pathname, hash])
  return (
    <div className="min-h-screen">
      <TopBar onMenu={() => setOpen(true)} onToc={() => setToc(!toc)} />
      <Sidebar open={open} onClose={() => setOpen(false)} />
      <div className="flex md:pl-[300px]">
        <main className="min-w-0 flex-1 px-4 py-8 md:px-10">
          <div className="mx-auto max-w-[800px]"><Outlet /></div>
        </main>
        {toc && <TOC />}
      </div>
    </div>
  )
}
