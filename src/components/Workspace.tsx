import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, PanelBottom, PanelLeft, PanelLeftClose, PanelLeftOpen, PanelRight, PanelTop, Play, RotateCcw, SquareTerminal, X } from 'lucide-react'
import { content, leetUrl } from '../lib/content'
import { runJava, type RunResult } from '../lib/runner'
import { DEFAULTS, useIde, type Dock } from '../hooks/useIde'
import { useTips } from '../hooks/useTips'
import { keyLabel, matches, tip } from '../lib/shortcuts'
import CodeEditor from './CodeEditor'
import Resizer from './Resizer'

const spring = { type: 'spring', stiffness: 240, damping: 30 } as const
const slide = { duration: 0.34, ease: [0.32, 0.72, 0, 1] } as const   // smooth in both directions
const instant = { duration: 0 } as const
const MIN_PHONE = 320, MIN_IDE = 560, MIN_PANE = 96
const GAP = 12
const SCRATCH = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
`

type Res = { state: 'idle' } | { state: 'running' } | { state: 'error'; message: string } | ({ state: 'done' } & RunResult)

/** One screen, two views: the app shrinks to a phone-sized view and the IDE appears beside it. Both are resizable. */
export default function Workspace({ children }: { children: ReactNode }) {
  const { open, hidden, phoneW, setPhoneW, toggle } = useIde()
  const root = useRef<HTMLDivElement>(null)
  const phone = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  useTips()

  useEffect(() => { if (phone.current) phone.current.inert = hidden }, [hidden])   // no tabbing into the hidden view
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (matches(e, 'ide')) { e.preventDefault(); toggle() } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [toggle])

  const clamp = (w: number) => Math.max(MIN_PHONE, Math.min(w, (root.current?.clientWidth ?? 1400) - GAP * 2 - MIN_IDE))
  const t = dragging ? instant : spring

  return (
    <motion.div
      ref={root} initial={false} animate={{ padding: open ? GAP : 0 }} transition={spring}
      className={`relative flex h-dvh overflow-hidden transition-colors duration-500 ${open ? 'bg-slate-200 dark:bg-[#050608]' : ''}`}
    >
      <motion.div
        ref={phone} initial={false}
        animate={{ width: !open ? '100%' : hidden ? 0 : clamp(phoneW), borderRadius: open ? 28 : 0 }} transition={t}
        className={`relative shrink-0 overflow-hidden ${open ? 'shadow-2xl ring-1 ring-black/5 dark:ring-white/10' : ''}`}
      >
        {/* anchored to the right edge, so shrinking the container looks like the screen sliding out to the left */}
        <motion.div initial={false} animate={{ width: open ? clamp(phoneW) : '100%' }} transition={t} className="absolute inset-y-0 right-0 bg-white dark:bg-[#0f1115]">
          {/* a plain div (framer would override transform): makes `position: fixed` children, like the drawers, relative to this view */}
          <div className="h-full w-full [transform:translateZ(0)]">{children}</div>
        </motion.div>
      </motion.div>

      {/* drag handle between the two screens */}
      <motion.div initial={false} animate={{ width: open && !hidden ? GAP : 0 }} transition={t} className="relative shrink-0">
        {open && !hidden && (
          <Resizer axis="x" label="Resize app view"
            onStart={() => setDragging(true)} onEnd={() => setDragging(false)}
            onDrag={(x) => setPhoneW(clamp(x - (root.current?.getBoundingClientRect().left ?? 0) - GAP - GAP / 2))}
            onNudge={(dx) => setPhoneW(clamp(phoneW + dx * 24))} onReset={() => setPhoneW(DEFAULTS.phoneW)} />
        )}
      </motion.div>

      <AnimatePresence>{open && <IdePanel key="ide" />}</AnimatePresence>
    </motion.div>
  )
}

const ib = 'grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'
const DOCKS: [Dock, typeof PanelBottom, string][] = [['bottom', PanelBottom, 'Terminal at bottom'], ['right', PanelRight, 'Terminal on right'], ['top', PanelTop, 'Terminal on top'], ['left', PanelLeft, 'Terminal on left']]

function IdePanel() {
  const ide = useIde()
  const { qn, hidden, dock, termOpen, termH, termW, phoneW, go, setPhoneW, setDock, setTermOpen, setTermSize } = ide
  const q = qn ? content.questions.find((x) => x.n === qn) : undefined
  const starter = q?.starter ?? SCRATCH
  const key = `code:${qn ?? 'scratch'}`
  const read = () => { try { return localStorage.getItem(key) ?? starter } catch { return starter } }
  const [code, setCode] = useState(read)
  const [res, setRes] = useState<Res>({ state: 'idle' })
  const [dragT, setDragT] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const swap = useRef<number>()
  useEffect(() => { setCode(read()); setRes({ state: 'idle' }) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(swap.current), [])

  const change = (v: string) => { setCode(v); try { localStorage.setItem(key, v) } catch { /* ignore */ } }
  const reset = () => change(starter)
  const run = async () => {
    if (res.state === 'running') return
    setRes({ state: 'running' })
    try { setRes({ state: 'done', ...(await runJava(code)) }) } catch (e) { setRes({ state: 'error', message: e instanceof Error ? e.message : String(e) }) }
  }

  const col = dock === 'bottom' || dock === 'top'
  const size = col ? termH : termW
  const dir = { bottom: 'flex-col', top: 'flex-col-reverse', right: 'flex-row', left: 'flex-row-reverse' }[dock]
  const anchor = { bottom: 'inset-x-0 bottom-0', top: 'inset-x-0 top-0', right: 'inset-y-0 right-0', left: 'inset-y-0 left-0' }[dock]
  const maxPane = () => { const r = body.current?.getBoundingClientRect(); return (col ? r?.height : r?.width ?? 800)! - 160 }
  const setSize = (n: number) => setTermSize(col ? 'h' : 'w', Math.max(MIN_PANE, Math.min(n, maxPane() || 600)))

  // collapse, then re-enter from the new edge, so docking is always the same smooth slide
  const moveDock = (d: Dock) => {
    window.clearTimeout(swap.current)
    if (termOpen && d !== dock) {
      setTermOpen(false)
      swap.current = window.setTimeout(() => { setDock(d); setTermOpen(true) }, 360)
    } else { setDock(d); setTermOpen(true) }
  }
  const cycleDock = () => moveDock(DOCKS[(DOCKS.findIndex(([d]) => d === dock) + 1) % DOCKS.length][0])

  // keyboard shortcuts (latest closures kept in a ref)
  const actions = useRef<(e: KeyboardEvent) => void>(() => {})
  actions.current = (e) => {
    const hit = (id: Parameters<typeof matches>[1], fn: () => void) => { if (matches(e, id)) { e.preventDefault(); fn(); return true } return false }
    hit('run', run) || hit('terminal', () => setTermOpen(!termOpen)) || hit('hideApp', ide.toggleHidden) || hit('next', () => go(1)) || hit('prev', () => go(-1)) ||
      hit('dock', cycleDock) || hit('reset', reset) || hit('focus', () => document.getElementById('ide-editor')?.focus()) ||
      hit('solution', () => q && window.dispatchEvent(new CustomEvent('ide:solution', { detail: q.n }))) ||
      hit('leetcode', () => q && window.open(leetUrl(q.title), '_blank', 'noopener')) ||
      hit('appNarrower', () => setPhoneW(Math.max(MIN_PHONE, phoneW - 24))) || hit('appWider', () => setPhoneW(phoneW + 24)) ||
      hit('termSmaller', () => setSize(size - 24)) || hit('termBigger', () => setSize(size + 24))
  }
  useEffect(() => {
    const h = (e: KeyboardEvent) => actions.current(e)
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [])

  const dragTerm = (x: number, y: number) => {
    const r = body.current!.getBoundingClientRect()
    setSize({ bottom: r.bottom - y, top: y - r.top, right: r.right - x, left: x - r.left }[dock] - 4)
  }
  const nudge = (dx: number, dy: number) => setSize(size + { bottom: -dy, top: dy, right: -dx, left: dx }[dock] * 24)

  const total = content.questions.length
  const hiddenTerm = col ? { height: 0, opacity: 0 } : { width: 0, opacity: 0 }
  const shownTerm = col ? { height: size, opacity: 1 } : { width: size, opacity: 1 }
  const tt = dragT ? instant : slide

  return (
    <motion.section
      initial={{ opacity: 0, x: 90 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 90 }} transition={spring}
      className="dark-surface relative flex min-w-0 flex-1 flex-col rounded-[28px] bg-[#0b0c10] p-2 text-slate-200 shadow-2xl ring-1 ring-white/10"
    >
      <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-1">
        <button type="button" onClick={ide.toggleHidden} aria-label={hidden ? 'Show the app view' : 'Hide the app view'} {...tip(hidden ? 'Bring back the app' : 'Hide the app', 'hideApp')} data-tip-start="" className={ib}>
          {hidden ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
        <button type="button" onClick={() => go(-1)} disabled={qn !== null && qn <= 1} aria-label="Previous problem" {...tip('Previous problem', 'prev')} className={ib}><ChevronLeft size={18} aria-hidden /></button>
        <p className="min-w-0 flex-1 truncate text-center font-sans text-sm text-slate-300">
          {q ? <><span className="font-mono text-slate-500">{q.n}/{total}</span> {q.title}</> : 'Scratch pad'}
          <span className="ml-2 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">Main.java</span>
        </p>
        <button type="button" onClick={() => go(1)} disabled={qn !== null && qn >= total} aria-label="Next problem" {...tip('Next problem', 'next')} className={ib}><ChevronRight size={18} aria-hidden /></button>
        <div className="ml-1 flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5" role="group" aria-label="Terminal position">
          {DOCKS.map(([d, Icon, label]) => (
            <button key={d} type="button" aria-pressed={dock === d} aria-label={label} {...tip(label, undefined, `${keyLabel('dock')} cycles`)} onClick={() => moveDock(d)}
              className={`${ib} h-8 w-8 ${dock === d && termOpen ? 'bg-white/10 text-sky-400' : ''}`}><Icon size={16} aria-hidden /></button>
          ))}
        </div>
        <button type="button" onClick={() => setTermOpen(!termOpen)} aria-pressed={termOpen} aria-label="Toggle terminal" {...tip('Toggle terminal', 'terminal')} className={`${ib} ${termOpen ? 'text-sky-400' : ''}`}><SquareTerminal size={18} aria-hidden /></button>
        <button type="button" onClick={reset} aria-label="Reset code" {...tip('Reset to starter', 'reset')} className={ib}><RotateCcw size={16} aria-hidden /></button>
        <button id="ide-run" type="button" onClick={run} disabled={res.state === 'running'} aria-label="Run code" {...tip('Run', 'run')}
          className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {res.state === 'running' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />} Run
        </button>
        <button type="button" onClick={ide.close} aria-label="Close IDE" {...tip('Close IDE', 'ide')} data-tip-end="" className={`${ib} ml-1`}><X size={18} aria-hidden /></button>
      </header>

      <div ref={body} className={`flex min-h-0 flex-1 ${dir}`}>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl"><CodeEditor value={code} onChange={change} /></div>
        <AnimatePresence initial={false}>
          {termOpen && (
            <motion.div key="grip" initial={{ [col ? 'height' : 'width']: 0 }} animate={{ [col ? 'height' : 'width']: 8 }} exit={{ [col ? 'height' : 'width']: 0 }} transition={slide} className="relative shrink-0">
              <Resizer axis={col ? 'y' : 'x'} label="Resize terminal" onStart={() => setDragT(true)} onEnd={() => setDragT(false)}
                onDrag={dragTerm} onNudge={nudge} onReset={() => setTermSize(col ? 'h' : 'w', col ? DEFAULTS.termH : DEFAULTS.termW)} />
            </motion.div>
          )}
          {termOpen && (
            <motion.div key="term" initial={hiddenTerm} animate={shownTerm} exit={hiddenTerm} transition={tt}
              style={col ? { maxHeight: '70%' } : { maxWidth: '70%' }} className="relative shrink-0 overflow-hidden rounded-2xl bg-[#14161b]">
              {/* fixed size, anchored to the dock edge: the terminal slides in from / out to that edge instead of squashing */}
              <div className={`absolute ${anchor}`} style={col ? { height: size } : { width: size }}>
                <Terminal res={res} onClear={() => setRes({ state: 'idle' })} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.section>
  )
}

function Terminal({ res, onClear }: { res: Res; onClear: () => void }) {
  const dim = 'text-slate-500'
  return (
    <div className="flex h-full flex-col text-[13px]">
      <div className="flex shrink-0 items-center justify-between px-4 py-2 font-sans text-xs text-slate-400">
        <span className="inline-flex items-center gap-2"><SquareTerminal size={14} aria-hidden /> Terminal</span>
        {res.state !== 'idle' && <button type="button" onClick={onClear} aria-label="Clear terminal" className="rounded px-2 py-1 hover:bg-white/10 hover:text-white">Clear</button>}
      </div>
      <pre tabIndex={0} className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-4 pb-4 font-mono leading-6 text-[#d4d4d4] outline-none" aria-live="polite">
        {res.state === 'idle' && <span className={dim}>Press Run ({keyLabel('run')}) to compile and run Main.java</span>}
        {res.state === 'running' && <><span className="text-emerald-400">$ </span>javac Main.java &amp;&amp; java Main{'\n'}<span className={dim}>Compiling and running…</span></>}
        {res.state === 'error' && <span className="text-red-400">{res.message}</span>}
        {res.state === 'done' && (
          <>
            <span className="text-emerald-400">$ </span>javac Main.java &amp;&amp; java Main{'\n'}
            {res.compile && <span className="text-red-400">{res.compile}{'\n'}</span>}
            {res.stdout}
            {res.stderr && <span className="text-red-400">{res.stderr}{'\n'}</span>}
            {'\n'}<span className={dim}>{res.status}{res.time ? ` · ${res.time}s` : ''}{res.memory ? ` · ${(res.memory / 1024).toFixed(1)} MB` : ''}</span>
          </>
        )}
      </pre>
    </div>
  )
}
