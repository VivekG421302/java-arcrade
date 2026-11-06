import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, Loader2, PanelBottom, PanelLeft, PanelLeftClose, PanelLeftOpen, PanelRight, PanelTop, Play, RotateCcw, SquareTerminal, Type, WrapText, X, Minus, Plus } from 'lucide-react'
import { leetUrl, type CourseMeta } from '../lib/content'
import { errorLines, runCode, type RunResult } from '../lib/runner'
import { useCourse } from '../hooks/useCourse'
import { DEFAULTS, useIde, type Dock } from '../hooks/useIde'
import { NARROW, useKeyboardInset, useMedia } from '../hooks/useMedia'
import { useTips } from '../hooks/useTips'
import { keyLabel, matches, tip } from '../lib/shortcuts'
import CodeEditor, { type EditorApi, type Jump } from './CodeEditor'
import Resizer from './Resizer'
import SymbolBar from './SymbolBar'

const spring = { type: 'spring', stiffness: 240, damping: 30 } as const
const slide = { duration: 0.34, ease: [0.32, 0.72, 0, 1] } as const   // smooth in both directions
const instant = { duration: 0 } as const
const MIN_PHONE = 320, MIN_IDE = 560, MIN_PANE = 96
const GAP = 12
const SCRATCH = {
  java: `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
`,
  rust: `fn main() {
    println!("Hello, Rust!");
}
`,
}

type Res = { state: 'idle' } | { state: 'running' } | { state: 'error'; message: string } | ({ state: 'done' } & RunResult)

/**
 * One screen, two views. Wide screens: the app shrinks to a phone-sized view with the IDE beside it (both resizable).
 * Narrow screens: the app and the IDE are two full-screen views that you switch between.
 */
export default function Workspace({ children }: { children: ReactNode }) {
  const { open, hidden, phoneW, setPhoneW, setHidden, toggleSmart } = useIde()
  const narrow = useMedia(NARROW)
  const root = useRef<HTMLDivElement>(null)
  const phone = useRef<HTMLDivElement>(null)
  const [dragging, setDragging] = useState(false)
  useTips()

  useEffect(() => { if (phone.current) phone.current.inert = hidden }, [hidden])   // no tabbing into the hidden view
  useEffect(() => { if (open && narrow) setHidden(true) }, [open, narrow, setHidden])   // small screens: land on the IDE
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (matches(e, 'ide')) { e.preventDefault(); toggleSmart(narrow) } }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [toggleSmart, narrow])

  const clamp = (w: number) => Math.max(MIN_PHONE, Math.min(w, (root.current?.clientWidth ?? 1400) - GAP * 2 - MIN_IDE))
  const t = dragging ? instant : spring
  const gap = narrow ? 8 : GAP
  const phoneWidth = !open ? '100%' : hidden ? 0 : narrow ? '100%' : clamp(phoneW)
  const innerWidth = open && !narrow ? clamp(phoneW) : '100%'

  return (
    <motion.div
      ref={root} initial={false} animate={{ padding: open ? gap : 0 }} transition={spring}
      className={`relative flex h-dvh overflow-hidden transition-colors duration-500 ${open ? 'bg-slate-200 dark:bg-[#050608]' : ''}`}
    >
      <motion.div
        ref={phone} initial={false} animate={{ width: phoneWidth, borderRadius: open ? (narrow ? 20 : 28) : 0 }} transition={t}
        className={`relative shrink-0 overflow-hidden ${open ? 'shadow-2xl ring-1 ring-black/5 dark:ring-white/10' : ''}`}
      >
        {/* anchored to the right edge, so shrinking the container looks like the screen sliding out to the left */}
        <motion.div initial={false} animate={{ width: innerWidth }} transition={t} className="absolute inset-y-0 right-0 bg-white dark:bg-[#0f1115]">
          {/* a plain div (framer would override transform): makes `position: fixed` children relative to this view */}
          <div className="h-full w-full [transform:translateZ(0)]">{children}</div>
        </motion.div>
      </motion.div>

      {/* drag handle between the two screens (wide screens only) */}
      <motion.div initial={false} animate={{ width: open && !hidden && !narrow ? GAP : 0 }} transition={t} className="relative shrink-0">
        {open && !hidden && !narrow && (
          <Resizer axis="x" label="Resize app view"
            onStart={() => setDragging(true)} onEnd={() => setDragging(false)}
            onDrag={(x) => setPhoneW(clamp(x - (root.current?.getBoundingClientRect().left ?? 0) - GAP - GAP / 2))}
            onNudge={(dx) => setPhoneW(clamp(phoneW + dx * 24))} onReset={() => setPhoneW(DEFAULTS.phoneW)} />
        )}
      </motion.div>

      <AnimatePresence>{open && <IdePanel key="ide" narrow={narrow} />}</AnimatePresence>
    </motion.div>
  )
}

const ib = 'grid h-9 w-9 shrink-0 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent'
const DOCKS: [Dock, typeof PanelBottom, string][] = [['bottom', PanelBottom, 'Bottom'], ['right', PanelRight, 'Right'], ['top', PanelTop, 'Top'], ['left', PanelLeft, 'Left']]
const MIN_FONT = 10, MAX_FONT = 24, DEFAULT_FONT = 13

function IdePanel({ narrow }: { narrow: boolean }) {
  const ide = useIde()
  const { data: content, meta, course } = useCourse()
  const { qn, hidden, termOpen, termH, termW, phoneW, go, setPhoneW, setDock, setTermOpen, setTermSize, fontSize, setFontSize } = ide
  const wrapOn = ide.wrap ?? narrow                                   // automatic: wrap on small screens
  const bumpFont = (d: number) => setFontSize((n) => Math.max(MIN_FONT, Math.min(MAX_FONT, n + d)))
  const dock: Dock = narrow ? 'bottom' : ide.dock                     // small screens always use the bottom dock
  const q = qn ? content.questions.find((x) => x.n === qn) : undefined
  const starter = q?.starter ?? SCRATCH[meta.lang]
  const key = `code:${course === 'rust' ? 'rust:' : ''}${qn ?? 'scratch'}`          // Java keys keep their old names
  const read = () => { try { return localStorage.getItem(key) ?? starter } catch { return starter } }
  const [code, setCode] = useState(read)
  const [res, setRes] = useState<Res>({ state: 'idle' })
  const [errLines, setErrLines] = useState<number[]>([])
  const [jump, setJump] = useState<Jump | undefined>()
  const [dragT, setDragT] = useState(false)
  const [focused, setFocused] = useState(false)
  const body = useRef<HTMLDivElement>(null)
  const editor = useRef<EditorApi>(null)
  const swap = useRef<number>()
  const touchy = useMedia(`${NARROW}, (pointer: coarse)`)
  const inset = useKeyboardInset(touchy && focused)
  useEffect(() => { setCode(read()); setRes({ state: 'idle' }); setErrLines([]) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => () => window.clearTimeout(swap.current), [])

  const change = (v: string) => { setCode(v); setErrLines([]); try { localStorage.setItem(key, v) } catch { /* ignore */ } }   // line numbers shift when you edit
  const reset = () => change(starter)
  const run = async () => {
    if (res.state === 'running') return
    setRes({ state: 'running' })
    setErrLines([])
    try {
      const r = await runCode(meta.lang, code)
      const lines = errorLines(r)
      setRes({ state: 'done', ...r })
      setErrLines(lines)
      if (lines.length) setJump({ line: lines[0], id: Date.now() })   // scroll the first error into view
    } catch (e) { setRes({ state: 'error', message: e instanceof Error ? e.message : String(e) }) }
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
      hit('termSmaller', () => setSize(size - 24)) || hit('termBigger', () => setSize(size + 24)) ||
      hit('fontSmaller', () => bumpFont(-1)) || hit('fontBigger', () => bumpFont(1)) || hit('wrap', () => ide.setWrap(!wrapOn))
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
  const visible = !narrow || hidden                                    // narrow: the IDE and the app take turns on screen
  const api = useMemo(() => ({ insert: (t: string, b?: number) => editor.current?.insert(t, b), move: (d: number) => editor.current?.move(d), blur: () => editor.current?.blur() }), [])

  return (
    <motion.section
      initial={{ opacity: 0, x: 90 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 90 }} transition={spring}
      className={`dark-surface relative min-w-0 flex-1 flex-col rounded-[28px] bg-[#0b0c10] p-2 text-slate-200 shadow-2xl ring-1 ring-white/10 ${visible ? 'flex' : 'hidden'}`}
    >
      <header className="flex shrink-0 items-center gap-1 px-1 pb-2 pt-1">
        <button type="button" onClick={ide.toggleHidden} aria-label={hidden ? 'Show the app view' : 'Hide the app view'} {...tip(hidden ? 'Bring back the app' : 'Hide the app', 'hideApp')} data-tip-start="" className={ib}>
          {hidden ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
        <button type="button" onClick={() => go(-1)} disabled={qn !== null && qn <= 1} aria-label="Previous problem" {...tip('Previous problem', 'prev')} className={ib}><ChevronLeft size={18} aria-hidden /></button>
        <p className="min-w-0 flex-1 truncate text-center font-sans text-sm text-slate-300">
          {q ? <><span className="font-mono text-slate-500">{q.n}/{total}</span> {q.title}</> : 'Scratch pad'}
          {!narrow && <span className="ml-2 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">{meta.file}</span>}
        </p>
        <button type="button" onClick={() => go(1)} disabled={qn !== null && qn >= total} aria-label="Next problem" {...tip('Next problem', 'next')} className={ib}><ChevronRight size={18} aria-hidden /></button>
        {!narrow && <DockPicker dock={dock} termOpen={termOpen} onPick={moveDock} />}
        <button type="button" onClick={() => setTermOpen(!termOpen)} aria-pressed={termOpen} aria-label="Toggle terminal" {...tip('Toggle terminal', 'terminal')} className={`${ib} ${termOpen ? 'text-sky-400' : ''}`}><SquareTerminal size={18} aria-hidden /></button>
        <ViewOptions fontSize={fontSize} wrap={wrapOn} onFont={bumpFont} onFontReset={() => setFontSize(DEFAULT_FONT)} onWrap={ide.setWrap} narrow={narrow} onReset={reset} />
        {!narrow && <button type="button" onClick={reset} aria-label="Reset code" {...tip('Reset to starter', 'reset')} className={ib}><RotateCcw size={16} aria-hidden /></button>}
        <button id="ide-run" type="button" onClick={run} disabled={res.state === 'running'} aria-label="Run code" aria-busy={res.state === 'running'} {...tip('Run', 'run')}
          className="ml-0.5 inline-flex h-9 shrink-0 items-center gap-2 rounded-lg bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {res.state === 'running' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />}{!narrow && ' Run'}
        </button>
        <button type="button" onClick={ide.close} aria-label="Close IDE" {...tip('Close IDE', 'ide')} data-tip-end="" className={ib}><X size={18} aria-hidden /></button>
      </header>

      <div ref={body} className={`flex min-h-0 flex-1 ${dir}`}>
        <div className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          <CodeEditor ref={editor} value={code} onChange={change} errorLines={errLines} jump={jump} onFocusChange={setFocused} fontSize={fontSize} wrap={wrapOn} lang={meta.lang} />
        </div>
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
                <Terminal meta={meta} res={res} onClear={() => { setRes({ state: 'idle' }); setErrLines([]) }} onJump={(line) => setJump({ line, id: Date.now(), focus: true })} />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {touchy && focused && createPortal(<SymbolBar editor={api} inset={inset} onHide={api.blur} lang={meta.lang} />, document.body)}
    </motion.section>
  )
}

function useDismiss(open: boolean, ref: RefObject<HTMLElement>, close: () => void) {
  useEffect(() => {
    if (!open) return
    const d = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) close() }
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    document.addEventListener('pointerdown', d)
    window.addEventListener('keydown', k)
    return () => { document.removeEventListener('pointerdown', d); window.removeEventListener('keydown', k) }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps
}

const pop = 'absolute right-0 top-11 z-30 rounded-xl bg-[#171a20] p-1 shadow-xl ring-1 ring-white/10'
const popAnim = { initial: { opacity: 0, y: -6, scale: 0.96 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: -6, scale: 0.96 }, transition: { duration: 0.15 } }

/** Shows only the active terminal position; click to reveal the other three. */
function DockPicker({ dock, termOpen, onPick }: { dock: Dock; termOpen: boolean; onPick: (d: Dock) => void }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, ref, () => setOpen(false))
  const Active = DOCKS.find(([d]) => d === dock)![1]
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="menu" aria-expanded={open} aria-label="Terminal position" {...tip(`Terminal: ${dock}`, undefined, `${keyLabel('dock')} cycles`)} onClick={() => setOpen(!open)}
        className={`${ib} ${termOpen ? 'text-sky-400' : ''}`}><Active size={16} aria-hidden /></button>
      <AnimatePresence>
        {open && (
          <motion.div role="menu" aria-label="Move terminal to" {...popAnim} className={`${pop} w-36`}>
            {DOCKS.filter(([d]) => d !== dock).map(([d, Icon, label]) => (
              <button key={d} type="button" role="menuitem" aria-label={`Dock terminal ${label.toLowerCase()}`} onClick={() => { onPick(d); setOpen(false) }}
                className="flex h-9 w-full items-center gap-3 rounded-lg px-3 text-sm text-slate-300 hover:bg-white/10 hover:text-white"><Icon size={16} aria-hidden /> {label}</button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Editor-only view options: text size and line wrapping (the app itself is untouched). */
function ViewOptions({ fontSize, wrap, onFont, onFontReset, onWrap, narrow, onReset }: {
  fontSize: number; wrap: boolean; onFont: (d: number) => void; onFontReset: () => void; onWrap: (w: boolean) => void; narrow: boolean; onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  useDismiss(open, ref, () => setOpen(false))
  const step = 'grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-slate-300 hover:bg-white/10 disabled:opacity-30'
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-haspopup="dialog" aria-expanded={open} aria-label="Editor text options" {...tip('Text size and wrapping')} onClick={() => setOpen(!open)} className={`${ib} ${open ? 'text-sky-400' : ''}`}><Type size={17} aria-hidden /></button>
      <AnimatePresence>
        {open && (
          <motion.div role="dialog" aria-label="Editor text options" {...popAnim} className={`${pop} w-64 space-y-3 p-3 text-sm`}>
            <div className="flex items-center justify-between">
              <span className="text-slate-300">Text size</span>
              <span className="flex items-center gap-1">
                <button type="button" aria-label="Smaller text" {...tip('Smaller text', 'fontSmaller')} disabled={fontSize <= MIN_FONT} onClick={() => onFont(-1)} className={step}><Minus size={14} aria-hidden /></button>
                <button type="button" aria-label="Reset text size" {...tip('Reset text size')} onClick={onFontReset} className="min-w-[3.25rem] rounded-lg px-1 py-1 text-center font-mono text-slate-200 hover:bg-white/5">{fontSize}px</button>
                <button type="button" aria-label="Bigger text" {...tip('Bigger text', 'fontBigger')} disabled={fontSize >= MAX_FONT} onClick={() => onFont(1)} className={step}><Plus size={14} aria-hidden /></button>
              </span>
            </div>
            <button type="button" role="switch" aria-checked={wrap} {...tip('Wrap long lines', 'wrap')} onClick={() => onWrap(!wrap)} className="flex w-full items-center justify-between rounded-lg py-1 text-left">
              <span className="inline-flex items-center gap-2 text-slate-300"><WrapText size={16} aria-hidden /> Wrap lines</span>
              <span className={`relative h-5 w-9 rounded-full transition-colors ${wrap ? 'bg-sky-500' : 'bg-white/15'}`}>
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${wrap ? 'left-[1.15rem]' : 'left-0.5'}`} />
              </span>
            </button>
            {narrow && <button type="button" onClick={() => { onReset(); setOpen(false) }} className="flex h-9 w-full items-center gap-2 rounded-lg px-1 text-slate-300 hover:bg-white/10"><RotateCcw size={15} aria-hidden /> Reset code to starter</button>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/** Turns `Main.java:12` / `main.rs:12` into a button that jumps the editor to that line. */
function Linked({ text, onJump }: { text: string; onJump: (line: number) => void }) {
  return (
    <>
      {text.split(/((?:Main\.java|main\.rs):\d+)/g).map((part, i) => {
        const m = part.match(/^(?:Main\.java|main\.rs):(\d+)$/)
        return m
          ? <button key={i} type="button" aria-label={`Go to line ${m[1]}`} onClick={() => onJump(Number(m[1]))} className="cursor-pointer underline decoration-dotted underline-offset-2 hover:text-red-300">{part}</button>
          : part
      })}
    </>
  )
}

function Terminal({ meta, res, onClear, onJump }: { meta: CourseMeta; res: Res; onClear: () => void; onJump: (line: number) => void }) {
  const dim = 'text-slate-500'
  return (
    <div className="flex h-full flex-col text-[13px]">
      <div className="flex shrink-0 items-center justify-between px-4 py-2 font-sans text-xs text-slate-400">
        <span className="inline-flex items-center gap-2"><SquareTerminal size={14} aria-hidden /> Terminal</span>
        {res.state !== 'idle' && <button type="button" onClick={onClear} aria-label="Clear terminal" className="rounded px-2 py-1 hover:bg-white/10 hover:text-white">Clear</button>}
      </div>
      <pre tabIndex={0} className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-4 pb-4 font-mono leading-6 text-[#d4d4d4] outline-none" aria-live="polite">
        {res.state === 'idle' && <span className={dim}>Press Run ({keyLabel('run')}) to compile and run {meta.file}</span>}
        {res.state === 'running' && <><span className="text-emerald-400">$ </span>{meta.build}{'\n'}<span className={dim}>Compiling and running…</span></>}
        {res.state === 'error' && <span className="text-red-400">{res.message}</span>}
        {res.state === 'done' && (
          <>
            <span className="text-emerald-400">$ </span>{meta.build}{'\n'}
            {res.compile && <span className="text-red-400"><Linked text={res.compile} onJump={onJump} />{'\n'}</span>}
            {res.stdout}
            {res.stderr && <span className="text-red-400"><Linked text={res.stderr} onJump={onJump} />{'\n'}</span>}
            {'\n'}<span className={dim}>{res.status}{res.time ? ` · ${res.time}s` : ''}{res.memory ? ` · ${(res.memory / 1024).toFixed(1)} MB` : ''}</span>
          </>
        )}
      </pre>
    </div>
  )
}
