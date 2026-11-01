import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Loader2, PanelBottom, PanelLeft, PanelLeftClose, PanelLeftOpen, PanelRight, PanelTop, Play, RotateCcw, SquareTerminal, X } from 'lucide-react'
import { content } from '../lib/content'
import { runJava, type RunResult } from '../lib/runner'
import { useIde, type Dock } from '../hooks/useIde'
import CodeEditor from './CodeEditor'

const PHONE = 400
const spring = { type: 'spring', stiffness: 240, damping: 30 } as const
const SCRATCH = `import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, Java!");
    }
}
`

type Res = { state: 'idle' } | { state: 'running' } | { state: 'error'; message: string } | ({ state: 'done' } & RunResult)

/** One screen, two views: the app shrinks to a phone-sized view and the IDE appears beside it. */
export default function Workspace({ children }: { children: ReactNode }) {
  const { open, hidden } = useIde()
  const phone = useRef<HTMLDivElement>(null)
  useEffect(() => { if (phone.current) phone.current.inert = hidden }, [hidden])   // no tabbing into the hidden view

  return (
    <motion.div
      initial={false} animate={{ padding: open ? 12 : 0 }} transition={spring}
      className={`relative flex h-dvh overflow-hidden transition-colors duration-500 ${open ? 'bg-slate-200 dark:bg-[#050608]' : ''}`}
    >
      <motion.div
        ref={phone} initial={false}
        animate={{ width: !open ? '100%' : hidden ? 0 : PHONE, marginRight: open && !hidden ? 12 : 0, borderRadius: open ? 28 : 0 }}
        transition={spring}
        className={`relative shrink-0 overflow-hidden ${open ? 'shadow-2xl ring-1 ring-black/5 dark:ring-white/10' : ''}`}
      >
        {/* anchored to the right edge, so shrinking the container looks like the screen sliding out to the left */}
        <motion.div
          initial={false} animate={{ width: open ? PHONE : '100%' }} transition={spring}
          className="absolute inset-y-0 right-0 bg-white dark:bg-[#0f1115]"
        >
          {/* a plain div (framer would override transform): makes `position: fixed` children, like the drawers, relative to this view */}
          <div className="h-full w-full [transform:translateZ(0)]">{children}</div>
        </motion.div>
      </motion.div>
      <AnimatePresence>{open && <IdePanel key="ide" />}</AnimatePresence>
    </motion.div>
  )
}

const ib = 'grid h-9 w-9 place-items-center rounded-lg text-slate-400 hover:bg-white/10 hover:text-white'
const dockIcons: [Dock, typeof PanelBottom, string][] = [['bottom', PanelBottom, 'Terminal at bottom'], ['right', PanelRight, 'Terminal on right'], ['top', PanelTop, 'Terminal on top'], ['left', PanelLeft, 'Terminal on left']]

function IdePanel() {
  const { qn, hidden, toggleHidden, close, dock, setDock, termOpen, toggleTerm } = useIde()
  const q = qn ? content.questions.find((x) => x.n === qn) : undefined
  const starter = q?.starter ?? SCRATCH
  const key = `code:${qn ?? 'scratch'}`
  const read = () => { try { return localStorage.getItem(key) ?? starter } catch { return starter } }
  const [code, setCode] = useState(read)
  const [res, setRes] = useState<Res>({ state: 'idle' })
  useEffect(() => { setCode(read()); setRes({ state: 'idle' }) }, [key]) // eslint-disable-line react-hooks/exhaustive-deps

  const change = (v: string) => { setCode(v); try { localStorage.setItem(key, v) } catch { /* ignore */ } }
  const reset = () => change(starter)
  const run = async () => {
    if (res.state === 'running') return
    setRes({ state: 'running' })
    try { setRes({ state: 'done', ...(await runJava(code)) }) } catch (e) { setRes({ state: 'error', message: e instanceof Error ? e.message : String(e) }) }
  }

  const col = dock === 'bottom' || dock === 'top'
  const dir = { bottom: 'flex-col', top: 'flex-col-reverse', right: 'flex-row', left: 'flex-row-reverse' }[dock]

  return (
    <motion.section
      initial={{ opacity: 0, x: 90 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 90 }} transition={spring}
      className="dark-surface relative flex min-w-0 flex-1 flex-col rounded-[28px] bg-[#0b0c10] p-2 text-slate-200 shadow-2xl ring-1 ring-white/10"
    >
      <header className="flex shrink-0 items-center gap-1 px-2 pb-2 pt-1">
        <button type="button" onClick={toggleHidden} aria-label={hidden ? 'Show the app view' : 'Hide the app view'} data-tip={hidden ? 'Bring back the app' : 'Hide the app'} data-tip-start="" className={ib}>
          {hidden ? <PanelLeftOpen size={18} aria-hidden /> : <PanelLeftClose size={18} aria-hidden />}
        </button>
        <p className="mx-2 min-w-0 flex-1 truncate font-sans text-sm text-slate-300">
          {q ? <><span className="font-mono text-slate-500">{q.n}.</span> {q.title}</> : 'Scratch pad'}
          <span className="ml-2 rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[11px] text-slate-500">Main.java</span>
        </p>
        <div className="flex items-center gap-0.5 rounded-xl bg-white/5 p-0.5" role="group" aria-label="Terminal position">
          {dockIcons.map(([d, Icon, label]) => (
            <button key={d} type="button" aria-pressed={dock === d} aria-label={label} data-tip={label}
              onClick={() => { setDock(d); if (!termOpen) toggleTerm() }}
              className={`${ib} h-8 w-8 ${dock === d && termOpen ? 'bg-white/10 text-sky-400' : ''}`}><Icon size={16} aria-hidden /></button>
          ))}
        </div>
        <button type="button" onClick={toggleTerm} aria-pressed={termOpen} aria-label="Toggle terminal" data-tip="Toggle terminal" className={`${ib} ${termOpen ? 'text-sky-400' : ''}`}><SquareTerminal size={18} aria-hidden /></button>
        <button type="button" onClick={reset} aria-label="Reset code" data-tip="Reset to starter" className={ib}><RotateCcw size={16} aria-hidden /></button>
        <button type="button" onClick={run} disabled={res.state === 'running'} aria-label="Run code" data-tip="Run (Ctrl+Enter)"
          className="ml-1 inline-flex h-9 items-center gap-2 rounded-lg bg-emerald-600 px-3.5 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60">
          {res.state === 'running' ? <Loader2 size={16} className="animate-spin" aria-hidden /> : <Play size={16} aria-hidden />} Run
        </button>
        <button type="button" onClick={close} aria-label="Close IDE" data-tip="Close IDE" data-tip-end="" className={`${ib} ml-1`}><X size={18} aria-hidden /></button>
      </header>

      <div className={`flex min-h-0 flex-1 gap-2 ${dir}`}>
        <motion.div layout transition={spring} className="min-h-0 min-w-0 flex-1 overflow-hidden rounded-2xl">
          <CodeEditor value={code} onChange={change} onRun={run} />
        </motion.div>
        <AnimatePresence initial={false}>
          {termOpen && (
            <motion.div key="term" layout transition={spring} initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className={`min-h-0 min-w-0 shrink-0 overflow-hidden rounded-2xl bg-[#14161b] ${col ? 'h-[36%]' : 'w-[38%]'}`}>
              <Terminal res={res} onClear={() => setRes({ state: 'idle' })} />
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
        {res.state !== 'idle' && <button type="button" onClick={onClear} className="rounded px-2 py-1 hover:bg-white/10 hover:text-white">Clear</button>}
      </div>
      <pre className="m-0 min-h-0 flex-1 overflow-auto whitespace-pre-wrap break-words px-4 pb-4 font-mono leading-6 text-[#d4d4d4]" aria-live="polite">
        {res.state === 'idle' && <span className={dim}>Press Run (Ctrl+Enter) to compile and run Main.java</span>}
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
