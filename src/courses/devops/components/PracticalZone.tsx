import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Eye, FolderSync, Lightbulb, LifeBuoy, Plus, RotateCcw, SquareTerminal, X, type LucideIcon } from 'lucide-react'
import { usePersisted } from '../../../hooks/usePersisted'
import { useSim, useStageDef, useTracker } from '../runtime'
import FileZillaPane from './FileZillaPane'
import StepBar from './StepBar'
import TerminalPane from './TerminalPane'
import TopologyMap from './TopologyMap'

export type ZoneTab = 'ftp' | 'term'

const pill = (on: boolean) => `relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ${on ? 'bg-sky-600 text-white ring-sky-600' : 'text-slate-700 ring-slate-300 hover:bg-slate-200/70 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10'}`
const iconTab = (on: boolean) => `relative grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ${on ? 'bg-sky-600 text-white ring-sky-600' : 'text-slate-700 ring-slate-300 hover:bg-slate-200/70 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10'}`
const card = 'overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-300/70 dark:bg-[#181b22] dark:ring-white/10'

/**
 * The practical zone has two zones: FileZilla, and the Terminal zone. The Terminal zone stacks a collapsible strip that
 * holds View (eye) and Hint (bulb) on top of the terminal. Two layouts over the SAME element tree (so terminals,
 * FileZilla state and typed text survive a switch):
 *  - tabs: one zone at a time, picked from the header
 *  - grid: both zones side by side, used when the roadmap is collapsed and this zone has the whole width
 */
export default function PracticalZone({ layout, visible, lead, trail }: { layout: 'tabs' | 'grid'; visible: boolean; lead?: ReactNode; trail?: ReactNode }) {
  const sim = useSim()
  const tracker = useTracker()
  const def = useStageDef()
  const grid = layout === 'grid'
  const [saved, setTab] = usePersisted<ZoneTab>('ui:devops:tab', 'term')
  const tab: ZoneTab = saved === 'ftp' ? 'ftp' : 'term'
  // View and Hint share one strip above the terminal and switch like browser tabs; the strip itself can be collapsed
  const [stripSaved, setStripTab] = usePersisted<'view' | 'hint'>('ui:devops:strip', 'hint')
  const stripTab: 'view' | 'hint' = stripSaved === 'view' ? 'view' : 'hint'
  const [stripOpen, setStripOpen] = usePersisted('ui:devops:stripOpen', true)
  const showTerm = grid || tab === 'term'
  const showFtp = grid || tab === 'ftp'
  const hintVisible = stripOpen && showTerm && stripTab === 'hint'
  const viewVisible = stripOpen && showTerm && stripTab === 'view'

  // "Type it for me" in the hint puts text in the terminal prompt: bring the terminal forward so it is seen
  const seenDraft = useRef(sim.draftSeq)
  useEffect(() => { if (sim.draftSeq !== seenDraft.current) { seenDraft.current = sim.draftSeq; setTab('term') } })
  // picking a lab or chaos lab in the roadmap loads its first step: show the terminal zone with the hint open
  const focusKey = tracker.p.focus ? `${tracker.p.focus.kind}:${tracker.p.focus.id}` : ''
  const seenFocus = useRef(focusKey)
  useEffect(() => { if (focusKey !== seenFocus.current) { seenFocus.current = focusKey; setTab('term'); setStripTab('hint'); setStripOpen(true) } }, [focusKey, setTab, setStripTab, setStripOpen])
  // a dot on the bulb when a step passed or failed while the hint is out of sight
  const fbAt = tracker.feedback?.at
  const [seenFb, setSeenFb] = useState(fbAt)
  useEffect(() => { if (hintVisible) setSeenFb(fbAt) }, [hintVisible, fbAt])
  const hintDot = !hintVisible && fbAt !== undefined && fbAt !== seenFb

  // header icons: show that tab of the strip; pressing the one already showing collapses the strip
  const toggle = (which: 'view' | 'hint') => {
    if (!showTerm) { setTab('term'); setStripTab(which); setStripOpen(true) }
    else if (stripOpen && stripTab === which) setStripOpen(false)
    else { setStripTab(which); setStripOpen(true) }
  }
  const label = (i: number) => { const s = sim.tabs[i].shell; return s.rescue ? 'Rescue console' : s.ssh ? `PuTTY ${s.ssh.user}@shop-server` : sim.tabs.length > 1 ? `Laptop ${i + 1}` : 'Laptop' }
  const termVisible = visible && showTerm

  const tabBtn = (id: ZoneTab, Icon: LucideIcon, text: string, tip: string) => (
    <button key={id} role="tab" type="button" id={`zone-tab-${id}`} aria-selected={tab === id} aria-controls={`zone-panel-${id}`} aria-label={text} data-tip={tip} onClick={() => setTab(id)} className={pill(tab === id)}>
      <Icon size={16} aria-hidden /><span className={tab === id ? '' : 'hidden sm:inline'}>{text}</span>
    </button>
  )
  const toggleBtn = (which: 'view' | 'hint', Icon: LucideIcon, text: string, tip: string, on: boolean, dot = false) => (
    <button key={which} type="button" aria-pressed={on} aria-label={on ? `Hide ${text}` : `Show ${text}`} data-tip={tip} data-tip-end={which === 'hint' && !trail ? '' : undefined} onClick={() => toggle(which)} className={iconTab(on)}>
      <Icon size={18} aria-hidden />
      {dot && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-50 dark:ring-[#0f1115]" aria-label="New feedback" />}
    </button>
  )

  const stripTabBtn = (id: 'view' | 'hint', Icon: LucideIcon, text: string, dot = false) => (
    <button key={id} role="tab" type="button" aria-selected={stripTab === id} aria-controls={`zone-panel-${id}`} onClick={() => setStripTab(id)} className={`relative inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-sm font-medium ${stripTab === id ? 'bg-white text-slate-900 shadow-sm dark:bg-[#2a2f3b] dark:text-white' : 'text-slate-600 hover:bg-slate-300/50 dark:text-slate-400 dark:hover:bg-white/10'}`}>
      <Icon size={14} aria-hidden />{text}
      {dot && stripTab !== id && <span className="h-2 w-2 rounded-full bg-amber-400" aria-label="New feedback" />}
    </button>
  )

  const footer = (
    <div className={`flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 ${grid ? '' : 'border-t border-slate-200 dark:border-white/10'}`}>
      <span>Runs entirely in your browser. Nothing is sent to a server.</span>
      <button type="button" onClick={() => { if (window.confirm('Reset the simulated laptop and server to their starting state? Your lab progress is kept.')) { sim.reset(); tracker.focus(tracker.p.focus ?? { kind: 'lab', id: tracker.stage.labs[0].id }) } }} className="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded px-2 hover:bg-slate-200 dark:hover:bg-white/10"><RotateCcw size={13} aria-hidden />Reset simulator</button>
    </div>
  )

  const zoneCls = (shown: boolean) => grid ? `flex min-h-0 min-w-0 flex-col ${card}` : shown ? 'flex min-h-0 flex-1 flex-col' : 'hidden'

  return (
    <section id="playground" aria-label="Practice server" className="flex h-full min-h-0 min-w-0 flex-col px-2 pb-2">
      <header className="flex h-14 shrink-0 items-center gap-2">
        {lead}
        {grid
          ? (
            <>
              <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">Stage {def.stage.number}: practice server</h2>
              <div className="flex shrink-0 items-center gap-2">
                {toggleBtn('view', Eye, 'View', 'View: live map of the server', viewVisible)}
                {toggleBtn('hint', Lightbulb, 'Hint', 'Hint: what to do now', hintVisible, hintDot)}
              </div>
            </>
          )
          : (
            <div role="tablist" aria-label="Practice zones" className="flex min-w-0 flex-1 items-center gap-2">
              {tabBtn('ftp', FolderSync, 'FileZilla', 'FileZilla: send files to the server')}
              {tabBtn('term', SquareTerminal, 'Terminal', 'Terminal zone: terminals, view and hint')}
              <span className="flex-1" />
              {toggleBtn('view', Eye, 'View', 'View: live map of the server', viewVisible)}
              {toggleBtn('hint', Lightbulb, 'Hint', 'Hint: what to do now', hintVisible, hintDot)}
            </div>
          )}
        {trail}
      </header>

      <div className={grid ? 'grid min-h-0 flex-1 grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] gap-2' : `flex min-h-0 flex-1 flex-col ${card}`}>
        {/* Terminal zone: View + Hint share a collapsible strip on top, the terminal sits below */}
        <div id="zone-panel-term" role={grid ? undefined : 'tabpanel'} aria-labelledby={grid ? undefined : 'zone-tab-term'} className={zoneCls(showTerm)}>
          <div className={`${stripOpen ? 'flex' : 'hidden'} max-h-[46vh] shrink-0 flex-col border-b border-slate-200 dark:border-white/10`}>
            <div role="tablist" aria-label="View and hint" className="flex h-10 shrink-0 items-center gap-1 bg-slate-200/60 px-2 dark:bg-white/5">
              {stripTabBtn('view', Eye, 'View')}
              {stripTabBtn('hint', Lightbulb, 'Hint', hintDot)}
              <span className="flex-1" />
              <button type="button" onClick={() => setStripOpen(false)} aria-label="Collapse view and hint" data-tip="Collapse" data-tip-end="" className="grid h-8 w-8 place-items-center rounded hover:bg-slate-300/70 dark:hover:bg-white/10"><X size={14} aria-hidden /></button>
            </div>
            {/* both stay mounted so the map and the hint keep their state while the other one is in front */}
            <div className="min-h-0 flex-1 overflow-auto">
              <div id="zone-panel-view" role="tabpanel" aria-label="View" className={stripTab === 'view' ? '' : 'hidden'}>
                <div className="[&_svg]:mx-auto [&_svg]:max-h-[30vh] [&_svg]:w-auto [&_svg]:max-w-full"><TopologyMap world={sim.world} nodes={def.spec.topology.nodes} /></div>
              </div>
              <div id="zone-panel-hint" role="tabpanel" aria-label="Hint" className={stripTab === 'hint' ? '' : 'hidden'}><StepBar /></div>
            </div>
          </div>
          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
              {sim.tabs.map((t, i) => <TerminalPane key={t.shell.id} tabId={t.shell.id} visible={termVisible && sim.active === i} />)}
            </div>
            {/* VS Code style list of terminals: a strip above the terminal on small screens, a column on the right otherwise */}
            <aside aria-label="Terminals" className="order-first flex shrink-0 items-stretch gap-1 overflow-x-auto border-b border-white/10 bg-[#12151b] p-1 text-slate-300 no-scrollbar md:order-last md:w-44 md:flex-col md:overflow-y-auto md:overflow-x-hidden md:border-b-0 md:border-l">
              <div className="flex gap-1 md:flex-col" role="list">
                {sim.tabs.map((t, i) => {
                  const on = sim.active === i
                  return (
                    <div key={t.shell.id} role="listitem" className={`flex shrink-0 items-center rounded-md border-l-2 md:shrink ${on ? 'border-sky-400 bg-white/10 text-white' : 'border-transparent hover:bg-white/5'}`}>
                      <button type="button" aria-current={on ? 'true' : undefined} onClick={() => sim.selectTab(i)} className="flex min-h-[40px] min-w-0 flex-1 items-center gap-1.5 whitespace-nowrap px-2 text-left text-sm md:whitespace-normal">
                        <SquareTerminal size={14} aria-hidden className="shrink-0" /><span className="min-w-0 truncate">{label(i)}</span>
                      </button>
                      <button type="button" aria-label={`Close ${label(i)}`} data-tip={t.shell.ssh ? 'Closing a PuTTY window hangs up its session' : 'Close terminal'} data-tip-end="" onClick={() => sim.closeTab(t.shell.id)} className="grid h-10 w-9 shrink-0 place-items-center rounded hover:bg-white/10"><X size={14} aria-hidden /></button>
                    </div>
                  )
                })}
              </div>
              <button type="button" onClick={() => { sim.addTab(); setTab('term') }} disabled={sim.tabs.length >= 4} aria-label="New laptop terminal" data-tip="New laptop terminal" className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm hover:bg-white/10 disabled:opacity-40"><Plus size={15} aria-hidden /><span className="hidden md:inline">New terminal</span></button>
              {def.spec.rescueConsole && <button type="button" onClick={() => { sim.openRescue(); setTab('term') }} disabled={sim.tabs.length >= 4} data-tip="Hosting company's out-of-band console: works even when the firewall blocks SSH" data-tip-end="" className="inline-flex min-h-[40px] shrink-0 items-center gap-1.5 whitespace-nowrap rounded-md px-2 text-sm hover:bg-white/10 disabled:opacity-40"><LifeBuoy size={15} aria-hidden />Rescue console</button>}
            </aside>
          </div>
        </div>

        <div id="zone-panel-ftp" role={grid ? undefined : 'tabpanel'} aria-labelledby={grid ? undefined : 'zone-tab-ftp'} className={zoneCls(showFtp)}>
          <div className="flex min-h-0 flex-1 flex-col"><FileZillaPane /></div>
        </div>

        {!grid && footer}
      </div>
      {grid && footer}
    </section>
  )
}
