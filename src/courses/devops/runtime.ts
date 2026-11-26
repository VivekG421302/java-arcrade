// Module-level singletons, one simulator + tracker per stage. They outlive route changes, so a learner can wander to another course
// and come back to the exact terminal, files and lab step they left. All state lives in localStorage; nothing leaves the browser.
import { createContext, useContext, useSyncExternalStore } from 'react'
import { PLAYGROUND_STAGE1, STAGE_1 } from './data/stage1'
import { PLAYGROUND_STAGE2, STAGE_2 } from './data/stage2'
import { Simulator, type SimOptions } from './engine/session'
import { sqlBridge } from './engine/shellTypes'
import { enterStage2 } from './engine/stage2world'
import { Tracker } from './engine/tracker'
import type { CourseStage, PlaygroundSpec } from './types'

export interface StageDef { stage: CourseStage; spec: PlaygroundSpec; options: SimOptions }

/** Add a stage here (and flip `live` in data/catalog.ts) to ship it. Stage 1 keeps its original storage keys. */
export const STAGES: Record<number, StageDef> = {
  1: { stage: STAGE_1, spec: PLAYGROUND_STAGE1, options: { stage: 1 } },
  2: { stage: STAGE_2, spec: PLAYGROUND_STAGE2, options: { stage: 2, key: 'devops:v1:sim:stage-2', init: enterStage2 } },
}

interface Runtime { sim: Simulator; tracker: Tracker }
const runtimes = new Map<number, Runtime>()
let bridged = false

export function runtime(n = 1): Runtime {
  let rt = runtimes.get(n)
  if (!rt) {
    if (!bridged) {
      bridged = true
      // `psql -c "SELECT ..."` reuses the app's in-browser PostgreSQL (PGlite worker) instead of a second SQL engine.
      sqlBridge.run = async (sql) => {
        try {
          const { runSql } = await import('../../lib/sqlRunner')
          const r = await runSql(sql)
          return { stdout: r.stdout, stderr: r.stderr }
        } catch (e) { return { stdout: '', stderr: `ERROR:  ${(e as Error).message}` } }
      }
    }
    const def = STAGES[n]
    const sim = new Simulator(def.spec, def.options)
    rt = { sim, tracker: new Tracker(def.stage, sim) }
    runtimes.set(n, rt)
  }
  return rt
}

/** Which stage the surrounding page is showing (set by StagePage). */
export const StageCtx = createContext<number>(1)
export const useStageNo = () => useContext(StageCtx)
export const useStageDef = (n?: number): StageDef => STAGES[n ?? useContext(StageCtx)]

export function useSim(n?: number): Simulator {
  const ctx = useContext(StageCtx)
  const { sim } = runtime(n ?? ctx)
  useSyncExternalStore(sim.subscribe, sim.getVersion)
  return sim
}

export function useTracker(n?: number): Tracker {
  const ctx = useContext(StageCtx)
  const { sim, tracker } = runtime(n ?? ctx)
  useSyncExternalStore(sim.subscribe, sim.getVersion)
  useSyncExternalStore(tracker.subscribe, tracker.getVersion)
  return tracker
}

export const resetAllDevops = () => { for (const n of Object.keys(STAGES).map(Number)) { const { sim, tracker } = runtime(n); tracker.resetProgress(); sim.reset() } }
