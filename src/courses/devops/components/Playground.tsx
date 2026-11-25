import { useState } from 'react'
import { FolderSync, Plus, RotateCcw, SquareTerminal, X } from 'lucide-react'
import { useSim, useTracker } from '../runtime'
import FileZillaPane from './FileZillaPane'
import StepBar from './StepBar'
import TerminalPane from './TerminalPane'
import TopologyMap from './TopologyMap'

const tabBtn = (on: boolean) => `inline-flex min-h-[40px] items-center gap-1.5 whitespace-nowrap rounded-t-lg px-3 text-sm font-medium ${on ? 'bg-[#0b0d11] text-slate-100' : 'text-slate-600 hover:bg-slate-200/70 dark:text-slate-400 dark:hover:bg-white/5'}`

/**
 * The split-screen playground (spec 0.3): live topology map on top, terminal / FileZilla below.
 * Everything runs in the browser against the simulated world; nothing here talks to a server.
 */
export default function Playground() {
  const sim = useSim()
  const tracker = useTracker()
  const [pane, setPane] = useState<'term' | 'ftp'>('term')
  const label = (i: number) => { const s = sim.tabs[i].shell; return s.ssh ? `PuTTY ${s.ssh.user}@shop-server` : sim.tabs.length > 1 ? `Laptop ${i + 1}` : 'Laptop' }
  return (
    <section id="playground" aria-label="Practice server" className="flex min-h-[36rem] flex-col overflow-hidden rounded-2xl bg-slate-100 shadow-lg ring-1 ring-slate-300/70 dark:bg-[#181b22] dark:ring-white/10 lg:h-[calc(100dvh-5.5rem)]">
      <StepBar />
      <TopologyMap world={sim.world} />
      <div role="tablist" aria-label="Tools" className="flex shrink-0 items-end gap-1 overflow-x-auto px-2 no-scrollbar">
        {sim.tabs.map((t, i) => (
          <span key={t.shell.id} className="flex items-center">
            <button role="tab" type="button" aria-selected={pane === 'term' && sim.active === i} onClick={() => { setPane('term'); sim.selectTab(i) }} className={tabBtn(pane === 'term' && sim.active === i)}>
              <SquareTerminal size={15} aria-hidden />{label(i)}
            </button>
            <button type="button" aria-label={`Close ${label(i)}`} data-tip={t.shell.ssh ? 'Closing a PuTTY window hangs up its session' : 'Close tab'} onClick={() => sim.closeTab(t.shell.id)} className="grid h-8 w-8 place-items-center rounded text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10"><X size={14} aria-hidden /></button>
          </span>
        ))}
        <button type="button" onClick={() => { sim.addTab(); setPane('term') }} disabled={sim.tabs.length >= 4} aria-label="New laptop terminal tab" data-tip="New laptop terminal" className="grid h-10 w-10 shrink-0 place-items-center rounded text-slate-600 hover:bg-slate-200 disabled:opacity-40 dark:text-slate-300 dark:hover:bg-white/10"><Plus size={16} aria-hidden /></button>
        <button role="tab" type="button" aria-selected={pane === 'ftp'} onClick={() => setPane('ftp')} className={`${tabBtn(pane === 'ftp')} ml-auto`}><FolderSync size={15} aria-hidden />FileZilla</button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        {sim.tabs.map((t, i) => <TerminalPane key={t.shell.id} tabId={t.shell.id} visible={pane === 'term' && sim.active === i} />)}
        <div className={`min-h-0 flex-1 flex-col ${pane === 'ftp' ? 'flex' : 'hidden'}`}><FileZillaPane /></div>
      </div>
      <div className="flex shrink-0 items-center justify-between gap-2 border-t border-slate-200 px-3 py-1.5 text-xs text-slate-500 dark:border-white/10 dark:text-slate-400">
        <span>Runs entirely in your browser. Nothing is sent to a server.</span>
        <button type="button" onClick={() => { if (window.confirm('Reset the simulated laptop and server to their starting state? Your lab progress is kept.')) { sim.reset(); tracker.focus(tracker.p.focus ?? { kind: 'lab', id: 'lab-1-1' }) } }} className="inline-flex min-h-[32px] items-center gap-1.5 rounded px-2 hover:bg-slate-200 dark:hover:bg-white/10"><RotateCcw size={13} aria-hidden />Reset simulator</button>
      </div>
    </section>
  )
}
