import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { BookOpen, Lock, PanelLeftClose, PanelLeftOpen, PanelRightClose, PanelRightOpen, SquareTerminal } from 'lucide-react'
import { useMedia } from '../../../hooks/useMedia'
import { usePersisted } from '../../../hooks/usePersisted'
import ChaosPanel from '../components/ChaosPanel'
import DataTable from '../components/DataTable'
import DevOpsChrome, { barBtn } from '../components/DevOpsChrome'
import DiagramView from '../components/DiagramView'
import GatePanel from '../components/GatePanel'
import ImagineCard from '../components/ImagineCard'
import LabPanel from '../components/LabPanel'
import PracticalZone from '../components/PracticalZone'
import { STAGES, StageCtx, useTracker } from '../runtime'

/** From this width the roadmap and the practical zone sit side by side; below it they take turns on screen. */
const WIDE = '(min-width: 1024px)'

export default function StagePage() {
  const no = Number(useParams().n)
  if (!STAGES[no]) return <Navigate to="/devops" replace />
  return <StageCtx.Provider value={no}><StageBody no={no} /></StageCtx.Provider>
}

const sideBtn = `${barBtn} !flex !w-auto items-center gap-1.5 px-2.5 text-sm font-medium`
const zoneBtn = 'inline-flex h-11 shrink-0 items-center gap-1.5 rounded-lg px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/10 dark:hover:text-slate-100'

function StageBody({ no }: { no: number }) {
  const t = useTracker()
  const prev = useTracker(Math.max(1, no - 1))
  const wide = useMedia(WIDE)
  // Wide screens remember which sides are open (never both closed). Small screens show one side at a time.
  const [leftSaved, setLeft] = usePersisted('ui:devops:left', true)
  const [rightSaved, setRight] = usePersisted('ui:devops:right', true)
  const [side, setSide] = useState<'left' | 'right'>('left')
  const stage = t.stage
  const read = t.p.imagineRead
  const locked = no > 1 && !prev.p.stageComplete

  const hasZone = read
  const showLeft = !hasZone || (wide ? leftSaved || !rightSaved : side === 'left')
  const showRight = hasZone && (wide ? rightSaved || !leftSaved : side === 'right')
  const both = showLeft && showRight
  const openRight = () => { if (wide) setRight(true); else setSide('right') }
  const openLeft = () => { if (wide) setLeft(true); else setSide('left') }
  const closeLeft = () => { setRight(true); setLeft(false) }
  const closeRight = () => { setLeft(true); setRight(false) }

  // Starting a lab or chaos lab in the roadmap must bring the practical zone into view, even if it was collapsed
  const focusKey = t.p.focus ? `${t.p.focus.kind}:${t.p.focus.id}` : ''
  const seenFocus = useRef(focusKey)
  useEffect(() => {
    if (focusKey === seenFocus.current) return
    seenFocus.current = focusKey
    if (hasZone) { if (wide) setRight(true); else setSide('right') }
  }, [focusKey, hasZone, wide, setRight])

  if (locked) {
    return (
      <DevOpsChrome>
        <div className="h-full overflow-y-auto">
          <div className="mx-auto max-w-2xl px-5 py-10">
            <h1 className="flex items-center gap-2 text-2xl font-bold"><Lock size={20} aria-hidden />Stage {no} is locked</h1>
            <p className="mt-2 text-slate-600 dark:text-slate-400">Finish Stage {no - 1}: its labs, its required chaos lab, and its quiz. The checklist is at the bottom of that stage.</p>
            <Link to={`/devops/stage/${no - 1}`} className="mt-4 inline-flex min-h-[44px] items-center rounded-lg bg-sky-600 px-4 font-medium text-white hover:bg-sky-500">Go to Stage {no - 1}</Link>
          </div>
        </div>
      </DevOpsChrome>
    )
  }

  // roadmap side (in the navbar): collapse it, or bring the practical zone back / switch to it
  let leftExtra: ReactNode = null
  if (hasZone && showRight && wide) leftExtra = <button type="button" onClick={closeLeft} aria-label="Collapse the roadmap" data-tip="Collapse roadmap" className={barBtn}><PanelLeftClose size={20} aria-hidden /></button>
  else if (hasZone && !showRight) leftExtra = <button type="button" onClick={openRight} aria-label={wide ? 'Open the practical zone' : 'Switch to the practical zone'} data-tip="Practical zone" className={sideBtn}>{wide ? <PanelRightOpen size={20} aria-hidden /> : <SquareTerminal size={20} aria-hidden />}<span className="hidden sm:inline">Practice</span></button>

  // practical side (in the zone's own bar)
  const zoneLead = !showLeft
    ? <button type="button" onClick={openLeft} aria-label={wide ? 'Show the roadmap' : 'Back to the roadmap'} data-tip={wide ? 'Show roadmap' : 'Roadmap'} data-tip-start="" className={zoneBtn}>{wide ? <PanelLeftOpen size={20} aria-hidden /> : <BookOpen size={20} aria-hidden />}<span className="hidden sm:inline">Roadmap</span></button>
    : null
  const zoneTrail = both && wide
    ? <button type="button" onClick={closeRight} aria-label="Collapse the practical zone" data-tip="Collapse practical zone" data-tip-end="" className={`${zoneBtn} w-11 justify-center !px-0`}><PanelRightClose size={20} aria-hidden /></button>
    : null

  const roadmap = (
    <div className="mx-auto w-full max-w-[820px] px-4 pb-24 pt-2 md:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 dark:text-slate-400"><Link to="/devops" className="hover:text-sky-500">Course map</Link> / Stage {stage.number}</nav>
      <header className="mt-2">
        <h1 className="text-3xl font-bold tracking-tight">Stage {stage.number}: {stage.title}</h1>
        <p className="mt-1 font-serif text-lg text-slate-600 dark:text-slate-400">{stage.eraName}</p>
      </header>

      <div className="mt-6">
        <ImagineCard card={stage.imagineCard} read={read} onRead={() => t.markImagineRead()} />
        {read ? (
          <>
            <section aria-labelledby="map-h" className="mt-10">
              <h2 id="map-h" className="text-xl font-bold">The whole picture</h2>
              <p className="mt-1 text-slate-600 dark:text-slate-400">The same shop, now with its real parts and door numbers.</p>
              {stage.architectureFlow.map((d) => <DiagramView key={d.id} spec={d} />)}
              {stage.extraTables?.map((tb) => <DataTable key={tb.id} table={tb} />)}
            </section>
            <LabPanel />
            <ChaosPanel />
            <section aria-labelledby="pain-h" className="mt-10">
              <h2 id="pain-h" className="text-xl font-bold">The pains that lead to Stage 2</h2>
              <DataTable table={stage.painPointTable} />
            </section>
            <section aria-labelledby="cheat-h" className="mt-10">
              <h2 id="cheat-h" className="text-xl font-bold">Cheat sheet</h2>
              <DataTable table={stage.cheatSheet} />
            </section>
            <GatePanel />
          </>
        ) : (
          <p className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100 p-4 text-slate-600 dark:bg-white/5 dark:text-slate-300" role="status"><Lock size={16} aria-hidden />The diagrams, labs and practice server open once you have read the story above.</p>
        )}
      </div>
    </div>
  )

  return (
    <div className="flex h-full min-h-0 w-full">
      <div className={showLeft ? 'flex h-full min-h-0 min-w-0 flex-1 flex-col' : 'hidden'}>
        <DevOpsChrome extra={leftExtra}>
          <div className="h-full overflow-y-auto overscroll-contain">{roadmap}</div>
        </DevOpsChrome>
      </div>
      {hasZone && (
        <div className={!showRight ? 'hidden' : both ? 'h-full min-h-0 w-[clamp(440px,46vw,640px)] shrink-0' : 'h-full min-h-0 min-w-0 flex-1'}>
          <PracticalZone layout={showLeft || !wide ? 'tabs' : 'grid'} visible={showRight} lead={zoneLead} trail={zoneTrail} />
        </div>
      )}
    </div>
  )
}
