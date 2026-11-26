import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Eye, FolderSync, Lightbulb, LifeBuoy, Plus, RotateCcw, SquareTerminal, X, type LucideIcon } from 'lucide-react'
import { usePersisted } from '../../../hooks/usePersisted'
import { useSim, useStageDef, useTracker } from '../runtime'
import FileZillaPane from './FileZillaPane'
import StepBar from './StepBar'
import TerminalPane from './TerminalPane'
import TopologyMap from './TopologyMap'

export type ZoneTab = 'ftp' | 'term' | 'view' | 'hint'
const TAB_IDS: ZoneTab[] = ['ftp', 'term', 'view', 'hint']

const pill = (on: boolean) => `relative inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm font-medium ring-1 ${on ? 'bg-sky-600 text-white ring-sky-600' : 'text-slate-700 ring-slate-300 hover:bg-slate-200/70 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10'}`
const iconTab = (on: boolean) => `relative grid h-11 w-11 shrink-0 place-items-center rounded-lg ring-1 ${on ? 'bg-sky-600 text-white ring-sky-600' : 'text-slate-700 ring-slate-300 hover:bg-slate-200/70 dark:text-slate-300 dark:ring-white/15 dark:hover:bg-white/10'}`
const card = 'overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-300/70 dark:bg-[#181b22] dark:ring-white/10'

/**
 * The practical zone. Two layouts over the SAME element tree (so terminals, FileZilla state and typed text survive a switch):
 *  - tabs: one tool at a time, picked from the header (FileZilla, Terminal, the eye = live server map, the bulb = hint)
 *  - grid: all four tools on screen at once, used when the roadmap is collapsed and this zone has the whole width
 */
export default function PracticalZone({ layout, visible, lead, trail }: { layout: 'tabs' | 'grid'; visible: boolean; lead?: ReactNode; trail?: ReactNode }) {
  const sim = useSim()
  const tracker = useTracker()
  const def = useStageDef()
  const grid = layout === 'grid'
  const [saved, setTab] = usePersisted<ZoneTab>('ui:devops:tab', 'term')
  const tab: ZoneTab = TAB_IDS.includes(saved) ? saved : 'term'

  // "Type it for me" in the hint puts text in the terminal prompt: bring the terminal forward so it is seen
  const seenDraft = useRef(sim.draftSeq)
  useEffect(() => { if (sim.draftSeq !== seenDraft.current) { seenDraft.current = sim.draftSeq; setTab('term') } })
  // picking a lab or chaos lab in the roadmap loads its first step: show it
  const focusKey = tracker.p.focus ? `${tracker.p.focus.kind}:${tracker.p.focus.id}` : ''
  const seenFocus = useRef(focusKey)
  useEffect(() => { if (focusKey !== seenFocus.current) { seenFocus.current = focusKey; setTab('hint') } }, [focusKey, setTab])
  // a dot on the bulb when a step passed or failed while another tool is in front
  const fbAt = tracker.feedback?.at
  const [seenFb, setSeenFb] = useState(fbAt)
  useEffect(() => { if (grid || tab === 'hint') setSeenFb(fbAt) }, [grid, tab, fbAt])
  const hintDot = !grid && tab !== 'hint' && fbAt !== undefined && fbAt !== seenFb

  const label = (i: number) => { const s = sim.tabs[i].shell; return s.rescue ? 'Rescue console' : s.ssh ? `PuTTY ${s.ssh.user}@shop-server` : sim.tabs.length > 1 ? `Laptop ${i + 1}` : 'Laptop' }
  const shown = (id: ZoneTab) => grid || tab === id
  const panel = (id: ZoneTab) => grid
    ? `flex min-h-0 min-w-0 flex-col ${card} ${id === 'hint' || id === 'view' ? 'max-h-[40vh]' : ''}`
    : tab === id ? 'flex min-h-0 flex-1 flex-col' : 'hidden'
  const title = (Icon: LucideIcon, text: string) => grid && (
    <div className="flex h-9 shrink-0 items-center gap-2 border-b border-slate-200 px-3 text-sm font-medium dark:border-white/10"><Icon size={15} aria-hidden />{text}</div>
  )
  const termVisible = visible && shown('term')

  const tabBtn = (id: ZoneTab, Icon: LucideIcon, text: string, tip: string, dot = false) => (
    <button key={id} role="tab" type="button" id={`zone-tab-${id}`} aria-selected={tab === id} aria-controls={`zone-panel-${id}`} aria-label={text} data-tip={tip} onClick={() => setTab(id)} className={pill(tab === id)}>
      <Icon size={16} aria-hidden /><span className={tab === id ? '' : 'hidden sm:inline'}>{text}</span>
      {dot && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-50 dark:ring-[#0f1115]" aria-label="New feedback" />}
    </button>
  )
  const iconBtn = (id: ZoneTab, Icon: LucideIcon, text: string, tip: string, dot = false) => (
    <button key={id} role="tab" type="button" id={`zone-tab-${id}`} aria-selected={tab === id} aria-controls={`zone-panel-${id}`} aria-label={text} data-tip={tip} data-tip-end={id === 'hint' && !trail ? '' : undefined} onClick={() => setTab(id)} className={iconTab(tab === id)}>
      <Icon size={18} aria-hidden />
      {dot && <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-amber-400 ring-2 ring-slate-50 dark:ring-[#0f1115]" aria-label="New feedback" />}
    </button>
  )

  const footer = (
    <div className={`flex shrink-0 items-center justify-between gap-2 px-3 py-1.5 text-xs text-slate-500 dark:text-slate-400 ${grid ? '' : 'border-t border-slate-200 dark:border-white/10'}`}>
      <span>Runs entirely in your browser. Nothing is sent to a server.</span>
      <button type="button" onClick={() => { if (window.confirm('Reset the simulated laptop and server to their starting state? Your lab progress is kept.')) { sim.reset(); tracker.focus(tracker.p.focus ?? { kind: 'lab', id: tracker.stage.labs[0].id }) } }} className="inline-flex min-h-[32px] shrink-0 items-center gap-1.5 rounded px-2 hover:bg-slate-200 dark:hover:bg-white/10"><RotateCcw size={13} aria-hidden />Reset simulator</button>
    </div>
  )

  return (
    <section id="playground" aria-label="Practice server" className="flex h-full min-h-0 min-w-0 flex-col px-2 pb-2">
      <header className="flex h-14 shrink-0 items-center gap-2">
        {lead}
        {grid
          ? <h2 className="min-w-0 flex-1 truncate px-1 text-sm font-semibold">Stage {def.stage.number}: practice server</h2>
          : (
            <div role="tablist" aria-label="Practice tools" className="flex min-w-0 flex-1 items-center gap-2">
              {tabBtn('ftp', FolderSync, 'FileZilla', 'FileZilla: send files to the server')}
              {tabBtn('term', SquareTerminal, 'Terminal', 'Terminals: your laptop and the server')}
              <span className="flex-1" />
              {iconBtn('view', Eye, 'View', 'View: live map of the server')}
              {iconBtn('hint', Lightbulb, 'Hint', 'Hint: what to do now', hintDot)}
            </div>
          )}
        {trail}
      </header>

      <div className={grid ? 'grid min-h-0 flex-1 grid-cols-2 grid-rows-[auto_minmax(0,1fr)] gap-2' : `flex min-h-0 flex-1 flex-col ${card}`}>
        <div id="zone-panel-hint" role={grid ? undefined : 'tabpanel'} aria-labelledby={grid ? undefined : 'zone-tab-hint'} className={panel('hint')}>
          {title(Lightbulb, 'Hint')}
          <div className="min-h-0 flex-1 overflow-auto"><StepBar /></div>
        </div>

        <div id="zone-panel-view" role={grid ? undefined : 'tabpanel'} aria-labelledby={grid ? undefined : 'zone-tab-view'} className={panel('view')}>
          {title(Eye, 'View')}
          <div className="min-h-0 flex-1 overflow-auto"><TopologyMap world={sim.world} nodes={def.spec.topology.nodes} /></div>
        </div>

        <div id="zone-panel-term" role={grid ? undefined : 'tabpanel'} aria-labelledby={grid ? undefined : 'zone-tab-term'} className={panel('term')}>
          {title(SquareTerminal, 'Terminal')}
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

        <div id="zone-panel-ftp" role={grid ? undefined : 'tabpanel'} aria-labelledby={grid ? undefined : 'zone-tab-ftp'} className={panel('ftp')}>
          {title(FolderSync, 'FileZilla')}
          <div className="flex min-h-0 flex-1 flex-col"><FileZillaPane /></div>
        </div>

        {!grid && footer}
      </div>
      {grid && footer}
    </section>
  )
}
