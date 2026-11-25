// Module-level singletons: the simulator and tracker outlive route changes, so a learner can wander to another course and come back
// to the exact terminal, files and lab step they left. All state lives in localStorage; nothing leaves the browser.
import { useSyncExternalStore } from 'react'
import { PLAYGROUND_STAGE1, STAGE_1 } from './data/stage1'
import { Simulator } from './engine/session'
import { sqlBridge } from './engine/shellTypes'
import { Tracker } from './engine/tracker'

interface Runtime { sim: Simulator; tracker: Tracker }
let rt: Runtime | null = null

export function runtime(): Runtime {
  if (!rt) {
    // `psql -c "SELECT ..."` reuses the app's in-browser PostgreSQL (PGlite worker) instead of a second SQL engine.
    sqlBridge.run = async (sql) => {
      try {
        const { runSql } = await import('../../lib/sqlRunner')
        const r = await runSql(sql)
        return { stdout: r.stdout, stderr: r.stderr }
      } catch (e) { return { stdout: '', stderr: `ERROR:  ${(e as Error).message}` } }
    }
    const sim = new Simulator(PLAYGROUND_STAGE1)
    rt = { sim, tracker: new Tracker(STAGE_1, sim) }
  }
  return rt
}

export function useSim(): Simulator {
  const { sim } = runtime()
  useSyncExternalStore(sim.subscribe, sim.getVersion)
  return sim
}

export function useTracker(): Tracker {
  const { sim, tracker } = runtime()
  useSyncExternalStore(sim.subscribe, sim.getVersion)
  useSyncExternalStore(tracker.subscribe, tracker.getVersion)
  return tracker
}
