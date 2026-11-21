// Web Worker that owns the in-browser PostgreSQL (PGlite). Running it off the main thread keeps the page responsive while the
// database starts (first start downloads ~15 MB), and lets the page kill a runaway query by terminating this worker.
import { PGlite } from '@electric-sql/pglite'
import { resetDb, runScript, type SqlDb } from './engine'

const ctx = self as unknown as { onmessage: ((e: MessageEvent) => void) | null; postMessage: (m: unknown) => void }
let db: PGlite | null = null

async function open(): Promise<PGlite> {
  if (!db) { db = new PGlite(); await db.waitReady }
  return db
}
async function restart() {
  const old = db
  db = null
  try { await old?.close() } catch { /* already gone */ }
  return open()
}

ctx.onmessage = async (e: MessageEvent) => {
  const m = e.data as { type: 'init' } | { type: 'run'; id: number; sql: string }
  try {
    if (m.type === 'init') { await open(); ctx.postMessage({ type: 'ready' }); return }
    const t0 = performance.now()
    let handle = (await open()) as unknown as SqlDb
    let r
    try { await resetDb(handle); r = await runScript(handle, m.sql) }
    catch { handle = (await restart()) as unknown as SqlDb; await resetDb(handle); r = await runScript(handle, m.sql) }   // the engine itself failed: start a clean database and try once more
    ctx.postMessage({ type: 'result', id: m.id, ...r, ms: Math.round(performance.now() - t0) })
  } catch (err) {
    ctx.postMessage({ type: 'fatal', id: (m as { id?: number }).id, message: err instanceof Error ? err.message : String(err) })
  }
}
