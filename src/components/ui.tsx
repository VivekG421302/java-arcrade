import { CheckCircle2, ChevronRight, Lock, Moon, RefreshCw, Sun, type LucideIcon } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import type { Status } from '../hooks/useProgress'

export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label ?? 'Progress'}
      className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
      <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

export function PhaseBadge({ status, score }: { status: Status; score?: number | null }) {
  const m: Record<Status, [LucideIcon, string, string]> = {
    locked: [Lock, 'Locked', 'bg-slate-500/15 text-slate-500'],
    in_progress: [RefreshCw, 'In progress', 'bg-sky-500/15 text-sky-500'],
    completed: [CheckCircle2, score != null ? `Completed · ${score}%` : 'Completed', 'bg-emerald-500/15 text-emerald-500'],
  }
  const [Icon, label, cls] = m[status]
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-sans text-xs font-medium ${cls}`}><Icon size={13} aria-hidden />{label}</span>
}

export function Accordion({ title, meta, children, defaultOpen = false }: { title: ReactNode; meta?: ReactNode; children: ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="my-3 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
      <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
        className="flex min-h-[44px] w-full items-center gap-3 px-4 py-3 text-left font-sans font-semibold hover:bg-slate-100 dark:hover:bg-white/5">
        <ChevronRight size={16} aria-hidden className={`shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
        <span className="flex-1">{title}</span>
        {meta}
      </button>
      {open && <div className="px-4 pb-4 pt-1">{children}</div>}
    </div>
  )
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => localStorage.getItem('theme') !== 'light')
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
    localStorage.setItem('theme', dark ? 'dark' : 'light')
  }, [dark])
  return (
    <button type="button" onClick={() => setDark(!dark)} aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'} data-tip={dark ? 'Light mode' : 'Dark mode'} data-tip-end=""
      className="grid h-11 w-11 place-items-center rounded-md hover:bg-slate-200 dark:hover:bg-white/10">
      {dark ? <Sun size={20} aria-hidden /> : <Moon size={20} aria-hidden />}
    </button>
  )
}
