import { Link, Navigate, useParams } from 'react-router-dom'
import { Lock } from 'lucide-react'
import ChaosPanel from '../components/ChaosPanel'
import DataTable from '../components/DataTable'
import DiagramView from '../components/DiagramView'
import GatePanel from '../components/GatePanel'
import ImagineCard from '../components/ImagineCard'
import LabPanel from '../components/LabPanel'
import Playground from '../components/Playground'
import { useTracker } from '../runtime'

export default function StagePage() {
  const { n } = useParams()
  const t = useTracker()
  const stage = t.stage
  if (Number(n) !== stage.number) return <Navigate to="/devops" replace />
  const read = t.p.imagineRead
  return (
    <div className="mx-auto w-full max-w-[1400px] px-4 pb-24 pt-2 md:px-8">
      <nav aria-label="Breadcrumb" className="text-sm text-slate-500 dark:text-slate-400"><Link to="/devops" className="hover:text-sky-500">Course map</Link> / Stage {stage.number}</nav>
      <header className="mt-2">
        <h1 className="text-3xl font-bold tracking-tight">Stage {stage.number}: {stage.title}</h1>
        <p className="mt-1 font-serif text-lg text-slate-600 dark:text-slate-400">{stage.eraName}</p>
      </header>

      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,600px)] lg:gap-x-8">
        <div className="min-w-0 lg:col-start-1">
          <ImagineCard card={stage.imagineCard} read={read} onRead={() => t.markImagineRead()} />
          {read ? (
            <section aria-labelledby="map-h" className="mt-10">
              <h2 id="map-h" className="text-xl font-bold">The whole picture</h2>
              <p className="mt-1 text-slate-600 dark:text-slate-400">The same shop, now with its real parts and door numbers.</p>
              {stage.architectureFlow.map((d) => <DiagramView key={d.id} spec={d} />)}
              {stage.extraTables?.map((tb) => <DataTable key={tb.id} table={tb} />)}
            </section>
          ) : (
            <p className="mt-6 flex items-center gap-2 rounded-xl bg-slate-100 p-4 text-slate-600 dark:bg-white/5 dark:text-slate-300" role="status"><Lock size={16} aria-hidden />The diagrams, labs and practice server open once you have read the story above.</p>
          )}
        </div>

        {read && (
          <div className="mt-10 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-start lg:sticky lg:top-2">
            <Playground />
          </div>
        )}

        {read && (
          <div className="min-w-0 lg:col-start-1">
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
          </div>
        )}
      </div>
    </div>
  )
}
