// Main-thread side of the in-browser PostgreSQL: one worker, started on demand (or warmed up when the IDE opens), restarted if a script runs too long.
import type { RunResult } from './runner'

const LIMIT_MS = 15000   // WebAssembly PostgreSQL cannot honour statement_timeout, so a script that runs longer is stopped by killing the worker
let worker: Worker | null = null
let ready: Promise<void> | null = null
let seq = 0

function start(): Promise<void> {
  if (ready) return ready
  const w = new Worker(new URL('./sql/worker.ts', import.meta.url), { type: 'module' })
  worker = w
  const p = new Promise<void>((resolve, reject) => {
    w.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'ready') resolve()
      else if (e.data.type === 'fatal') reject(new Error(e.data.message))
    }
    w.onerror = () => reject(new Error('The in-browser PostgreSQL (PGlite) could not start. It needs to download about 15 MB on first use, so check your connection and try again.'))
    w.postMessage({ type: 'init' })
  })
  ready = p
  p.catch(() => { w.terminate(); if (worker === w) { worker = null; ready = null } })
  return p
}

/** Begin loading PostgreSQL in the background (call when the SQL IDE opens) so the first Run is quick. */
export function warmSql() { start().catch(() => undefined) }

export async function runSql(source: string): Promise<RunResult> {
  await start()
  const w = worker!
  const id = ++seq
  return new Promise<RunResult>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      w.terminate(); worker = null; ready = null
      resolve({ stdout: '', compile: '', time: (LIMIT_MS / 1000).toFixed(2), memory: null, status: 'Time Limit Exceeded',
        stderr: `The script ran for more than ${LIMIT_MS / 1000} seconds and was stopped (look for a query that never ends, such as a recursive CTE without a stop condition). The database was restarted, and the next run starts clean.\n` })
    }, LIMIT_MS)
    w.onmessage = (e: MessageEvent) => {
      const d = e.data
      if (d.id !== id) return
      window.clearTimeout(timer)
      if (d.type === 'fatal') reject(new Error(d.message))
      else resolve({ stdout: d.stdout, stderr: d.stderr, compile: '', status: d.failed ? 'Completed with errors' : 'Accepted', time: (d.ms / 1000).toFixed(2), memory: null })
    }
    w.postMessage({ type: 'run', id, sql: source })
  })
}
