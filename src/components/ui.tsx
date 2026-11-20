import { Check, CheckCircle2, ChevronRight, Lock, Moon, RefreshCw, Sun, type LucideIcon } from 'lucide-react'
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

const RING = { size: 24, stroke: 2.25 }
const RING_R = (RING.size - RING.stroke) / 2
const RING_C = 2 * Math.PI * RING_R

/**
 * Status of a module as one small chip: a progress ring that starts at the top, with a % (in progress), a tick (completed) or a
 * lock inside. The ring always draws the same number the chip shows (read % while in progress, test score once completed). The icons say the status, so no status words are used.
 * In a wide list on a device with hover, hovering the row grows the chip to also show the %, for new users (see .pb-text in
 * index.css). On phones, tablets and narrow panels it never grows, so it takes no extra width.
 */
export function PhaseBadge({ status, score, pct = 0 }: { status: Status; score?: number | null; pct?: number }) {
  const done = status === 'completed'
  const read = status === 'locked' ? 0 : Math.max(0, Math.min(100, Math.round(pct)))
  const tint: Record<Status, string> = {
    locked: 'bg-slate-500/20 text-slate-600 dark:bg-slate-300/15 dark:text-slate-300',   // clearly visible in both themes
    in_progress: 'bg-sky-500/15 text-sky-500',
    completed: 'bg-emerald-500/15 text-emerald-500',
  }
  // ONE number per chip, and the ring draws exactly that number: the test score once completed, the read % while in progress
  const shown = status === 'locked' ? 0 : done ? Math.max(0, Math.min(100, Math.round(score ?? 100))) : read
  const text = status === 'locked' ? 'Locked' : `${shown}%`
  const label = status === 'locked' ? 'Locked' : done ? `Completed, test score ${shown}%, ${read}% read` : `In progress, ${read}% read`
  const c = RING.size / 2
  return (
    <span role="img" aria-label={label} className={`pb inline-flex shrink-0 items-center rounded-full font-sans ${tint[status]}`}>
      <span aria-hidden className="relative grid place-items-center" style={{ width: RING.size, height: RING.size }}>
        <svg width={RING.size} height={RING.size} viewBox={`0 0 ${RING.size} ${RING.size}`} className="absolute inset-0 -rotate-90">
          <circle cx={c} cy={c} r={RING_R} fill="none" stroke="currentColor" strokeOpacity={status === 'locked' ? 0.4 : 0.22} strokeWidth={RING.stroke} />
          {shown > 0 && (
            <circle cx={c} cy={c} r={RING_R} fill="none" stroke="currentColor" strokeWidth={RING.stroke} strokeLinecap="round"
              strokeDasharray={`${(RING_C * shown) / 100} ${RING_C}`} className="transition-[stroke-dasharray] duration-500 motion-reduce:transition-none" />
          )}
        </svg>
        {status === 'locked' ? <Lock size={11} strokeWidth={2.5} />
          : done ? <Check size={13} strokeWidth={3} />
          : <>
              <span className="pb-num text-[8px] font-bold leading-none tabular-nums">{shown}%</span>
              <RefreshCw size={11} className="pb-ico" />
            </>}
      </span>
      {text && (
        <span aria-hidden className="pb-text">
          <span className="text-xs font-semibold tabular-nums">{text}</span>
        </span>
      )}
    </span>
  )
}

export function Accordion({ title, meta, actions, children, defaultOpen = false, open: controlled, onToggle }: {
  title: ReactNode; meta?: ReactNode; actions?: ReactNode; children: ReactNode; defaultOpen?: boolean; open?: boolean; onToggle?: (open: boolean) => void
}) {
  const [inner, setInner] = useState(defaultOpen)
  const open = controlled ?? inner
  const setOpen = (o: boolean) => (onToggle ? onToggle(o) : setInner(o))
  return (
    <div className="my-3 rounded-lg bg-slate-50 dark:bg-white/[0.03]">
      {/* actions are siblings of the toggle (a button cannot contain buttons) and only show while open */}
      <div className="qhead flex items-start gap-2 pr-3">
        <button type="button" aria-expanded={open} onClick={() => setOpen(!open)}
          className="flex min-h-[44px] min-w-0 flex-1 items-start gap-3 rounded-lg px-4 py-3 text-left font-sans font-semibold hover:bg-slate-100 dark:hover:bg-white/5">
          <ChevronRight size={16} aria-hidden className={`mt-1 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
          <span className="min-w-0 flex-1">
            <span className="block">{title}</span>
            {meta && <span className="mt-1.5 block">{meta}</span>}
          </span>
        </button>
        {open && actions && <div className="flex shrink-0 items-center gap-2 py-2.5">{actions}</div>}
      </div>
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
