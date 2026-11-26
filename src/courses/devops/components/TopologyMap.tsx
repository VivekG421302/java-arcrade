import { BADGE_META, deriveBadges, upstreamBroken } from '../engine/badges'
import { listensOn } from '../engine/nginx'
import { appProc, pgAccepting, ufwBlocks, type World } from '../engine/world'
import type { HealthBadge, TopologyNode } from '../types'

const W = 640, H = 236, BW = 144, BH = 54
const px = (x: number) => 78 + ((x - 10) / 66) * 484
const py = (y: number) => 40 + ((y - 16) / 58) * 156

type Edge = 'live' | 'broken' | 'idle'
const edgeClass: Record<Edge, string> = {
  live: 'stroke-emerald-500',
  broken: 'stroke-rose-500 [stroke-dasharray:6_5]',
  idle: 'stroke-slate-300 dark:stroke-slate-600 [stroke-dasharray:3_6]',
}
const nodeRing: Record<'ok' | 'warn' | 'bad', string> = { ok: 'stroke-emerald-500', warn: 'stroke-amber-500', bad: 'stroke-rose-500' }
const badgeText: Record<'ok' | 'warn' | 'bad', string> = { ok: 'fill-emerald-700 dark:fill-emerald-300', warn: 'fill-amber-700 dark:fill-amber-300', bad: 'fill-rose-700 dark:fill-rose-300' }

function edgeState(w: World, from: string, to: string): Edge {
  const app = !!appProc(w)
  switch (`${from}>${to}`) {
    case 'customer>app': return ufwBlocks(w, 8080) ? 'broken' : app ? 'live' : w.x.app.everStarted ? 'broken' : 'idle'
    case 'customer>nginx': return !(listensOn(w, 80) || listensOn(w, 443)) ? 'idle' : ufwBlocks(w, 80) && ufwBlocks(w, 443) ? 'broken' : 'live'
    case 'nginx>app': return !w.x.nginx.running ? 'idle' : upstreamBroken(w) ? 'broken' : 'live'
    case 'systemd>app': { const u = w.x.sd.units.springboot; return u?.active === 'active' ? 'live' : u?.active === 'activating' || u?.active === 'failed' ? 'broken' : 'idle' }
    case 'laptop>systemd': case 'laptop>vps': return ufwBlocks(w, 22) && !w.ssh.length ? 'broken' : w.ssh.length > 0 || w.x.sftp.connected ? 'live' : 'idle'
    case 'vps>app': return app ? 'live' : 'idle'
    case 'app>db': return app && pgAccepting(w) ? 'live' : w.x.app.lastExit === 'db-refused' ? 'broken' : 'idle'
    default: return 'idle'
  }
}

/** The "live visual topology map" (spec 0.3): every badge below is derived from the simulated server state, never hard-coded. */
export default function TopologyMap({ world, nodes }: { world: World; nodes: TopologyNode[] }) {
  const badges = deriveBadges(world)
  const badgeOf = (id: string): HealthBadge => (badges as Record<string, HealthBadge>)[id] ?? 'PENDING'
  const summary = `Topology health. ${nodes.map((n) => `${n.name} ${BADGE_META[badgeOf(n.id)].label}`).join(', ')}.`
  return (
    <div className="px-2 pt-2">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary} className="h-auto w-full">
        <title>{summary}</title>
        {nodes.flatMap((n) => n.edges.map((e) => {
          const t = nodes.find((x) => x.id === e.to)!
          const [x1, y1, x2, y2] = [px(n.x), py(n.y), px(t.x), py(t.y)]
          const st = edgeState(world, n.id, e.to)
          return (
            <g key={`${n.id}>${e.to}`}>
              <line x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={st === 'live' ? 2.5 : 2} className={edgeClass[st]} />
              <text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 6} textAnchor="middle" fontSize="11" strokeWidth="5" paintOrder="stroke" className="fill-slate-600 stroke-white dark:fill-slate-300 dark:stroke-[#181b22]">{e.label}</text>
            </g>
          )
        }))}
        {nodes.map((n) => {
          const b = badgeOf(n.id), m = BADGE_META[b]
          const x = px(n.x) - BW / 2, y = py(n.y) - BH / 2
          return (
            <g key={n.id}>
              <rect x={x} y={y} width={BW} height={BH} rx="10" strokeWidth="2" className={`fill-white dark:fill-[#22252d] ${nodeRing[m.tone]}`} />
              <text x={x + BW / 2} y={y + 21} textAnchor="middle" fontSize="12.5" fontWeight="600" className="fill-slate-800 dark:fill-slate-100">{n.name}</text>
              <text x={x + BW / 2} y={y + 40} textAnchor="middle" fontSize="11.5" fontWeight="600" className={badgeText[m.tone]}>{m.emoji} {m.label}</text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
