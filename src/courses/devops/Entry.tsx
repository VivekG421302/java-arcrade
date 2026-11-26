import { Component, Suspense, lazy, type ReactNode } from 'react'

// The DevOps routes live in their own lazy chunk. This wrapper is imported statically by App.tsx and owns BOTH the Suspense boundary and an
// error boundary: App's only other <Suspense> sits inside <Layout>, which this module deliberately lives outside of. Without a boundary here,
// the first client-side navigation to /devops suspends with nothing to show and the page stays blank until a reload.
const DevOpsRoutes = lazy(() => import('./routes'))

const RELOAD_FLAG = 'devops:chunk-reloaded'
const isChunkError = (e: Error) => /dynamically imported module|Loading chunk|ChunkLoadError|Importing a module script failed/i.test(`${e.name} ${e.message}`)

class Boundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }
  static getDerivedStateFromError(error: Error) { return { error } }
  componentDidCatch(error: Error) {
    // A deploy replaces the hashed chunk files, so an already-open tab can fail to fetch the module: one automatic reload fixes it.
    if (isChunkError(error) && !sessionStorage.getItem(RELOAD_FLAG)) { sessionStorage.setItem(RELOAD_FLAG, '1'); window.location.reload() }
  }
  render() {
    const { error } = this.state
    if (!error) return this.props.children
    const resetData = () => {
      for (const k of Object.keys(localStorage)) if (k.startsWith('devops:v1:')) localStorage.removeItem(k)
      window.location.reload()
    }
    const btn = 'inline-flex min-h-[44px] items-center rounded-lg px-4 font-medium'
    return (
      <main className="mx-auto max-w-xl px-5 py-12" role="alert">
        <h1 className="text-2xl font-bold">The DevOps module hit a problem</h1>
        <p className="mt-2 text-slate-600 dark:text-slate-400">{isChunkError(error) ? 'A newer version of the site was published while this page was open. Reloading fetches it.' : 'Something unexpected happened while drawing this page. Your other courses are not affected.'}</p>
        <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs text-slate-700 dark:bg-white/5 dark:text-slate-300">{error.message}</pre>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => window.location.reload()} className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}>Reload the page</button>
          <button type="button" onClick={resetData} className={`${btn} bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-100`}>Reset DevOps data and reload</button>
          <a href="/" className={`${btn} text-slate-700 underline dark:text-slate-300`}>Back to your courses</a>
        </div>
      </main>
    )
  }
}

export default function DevOpsEntry() {
  return (
    <Boundary>
      <Suspense fallback={<p className="grid h-full place-items-center p-8 text-slate-500" role="status">Loading the DevOps module…</p>}>
        <DevOpsRoutes />
      </Suspense>
    </Boundary>
  )
}
