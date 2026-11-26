import { Suspense } from 'react'
import { Outlet, useMatch } from 'react-router-dom'
import DevOpsChrome from '../components/DevOpsChrome'

/**
 * Page frame for the DevOps module. The course map gets the same top bar as the other courses; a stage page draws its own
 * (it splits the screen into roadmap | practical zone, and the bar belongs to the roadmap side).
 */
export default function DevOpsShell() {
  const onStage = !!useMatch('/devops/stage/:n')
  const body = <Suspense fallback={<p className="p-8 text-center text-slate-500" role="status">Loading…</p>}><Outlet /></Suspense>
  if (onStage) return <div className="relative flex h-full flex-col">{body}</div>
  return (
    <div className="relative flex h-full flex-col">
      <DevOpsChrome><div className="h-full overflow-y-auto overscroll-contain">{body}</div></DevOpsChrome>
    </div>
  )
}
