import { useId } from 'react'

/** Compact diagram specs written in the roadmap markdown (```diagram / ```sequence fences), drawn as theme-aware SVG. */
const halo = 'stroke-white dark:stroke-[#0f1115]'
const label = `fill-slate-500 dark:fill-slate-400 ${halo}`
const labelStyle = { font: '11px Inter, system-ui, sans-serif', textAnchor: 'middle' as const, paintOrder: 'stroke' as const, strokeWidth: 4 }
const nodeText = { font: '600 12px Inter, system-ui, sans-serif', textAnchor: 'middle' as const }

const pair = (s: string) => {
  const [a, q] = s.split('>'), k = q.indexOf(':')
  return { a, b: k < 0 ? q : q.slice(0, k), l: k < 0 ? '' : q.slice(k + 1) }
}

function Frame({ w, h, id, children }: { w: number; h: number; id: string; children: React.ReactNode }) {
  return (
    <div className="my-5 overflow-x-auto rounded-lg bg-slate-50 p-2 dark:bg-white/[0.03]">
      <svg role="img" width={w} viewBox={`0 0 ${w} ${h}`} style={{ maxWidth: '100%', height: 'auto' }} className="text-slate-700 dark:text-slate-300">
        <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker></defs>
        {children}
      </svg>
    </div>
  )
}

function Flow({ n, e }: { n: string; e: string }) {
  const id = useId()
  const CW = 250, RH = 84, W = 140, H = 40
  let mc = 0, mr = 0
  const N: Record<string, { l: string; f: boolean; x: number; y: number }> = {}
  n.split('|').forEach((s) => {
    const parts = s.split(':'), p = parts[0], r = parts[parts.length - 1], c = parts[parts.length - 2], l = parts.slice(1, -2).join(':'), f = l[0] === '!'   // labels may contain ':'
    N[p] = { l: f ? l.slice(1) : l, f, x: +c * CW + W / 2 + 10, y: +r * RH + H / 2 + 36 }
    mc = Math.max(mc, +c); mr = Math.max(mr, +r)
  })
  const E = e.split('|').map(pair)
  return (
    <Frame w={(mc + 1) * CW + 20} h={mr * RH + H + 60} id={id}>
      {E.map((x, i) => {
        const A = N[x.a], B = N[x.b]
        if (!A || !B) return null
        if (x.a === x.b) {
          const y = A.y - H / 2
          return <g key={i}><path d={`M${A.x - 20} ${y} C${A.x - 50} ${y - 45} ${A.x + 50} ${y - 45} ${A.x + 20} ${y}`} fill="none" stroke="currentColor" strokeWidth={1.3} markerEnd={`url(#${id})`} /><text x={A.x} y={y - 32} className={label} style={labelStyle}>{x.l}</text></g>
        }
        const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy), ux = dx / L, uy = dy / L
        const off = E.some((o) => o.a === x.b && o.b === x.a) ? 9 : 0, px = -uy * off, py = ux * off
        const t = Math.min(W / 2 / Math.abs(ux || 1e-9), H / 2 / Math.abs(uy || 1e-9)) + 3
        const x1 = A.x + ux * t + px, y1 = A.y + uy * t + py, x2 = B.x - ux * t + px, y2 = B.y - uy * t + py
        return <g key={i}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={1.3} markerEnd={`url(#${id})`} /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 5} className={label} style={labelStyle}>{x.l}</text></g>
      })}
      {Object.entries(N).map(([k, v]) => (
        <g key={k}>
          <rect x={v.x - W / 2} y={v.y - H / 2} width={W} height={H} rx={6} strokeWidth={1.3} stroke="currentColor" className={v.f ? 'fill-slate-700 dark:fill-slate-200' : 'fill-white dark:fill-[#1a1d25]'} />
          <text x={v.x} y={v.y + 4} style={nodeText} className={v.f ? 'fill-white dark:fill-slate-900' : 'fill-slate-800 dark:fill-slate-100'}>{v.l}</text>
        </g>
      ))}
    </Frame>
  )
}

function Sequence({ p, m }: { p: string; m: string }) {
  const id = useId()
  const CW = 170, RH = 40, W = 130, H = 34
  const P = p.split('|').map((s) => { const k = s.indexOf(':'); return [s.slice(0, k), s.slice(k + 1)] }), X: Record<string, number> = {}
  P.forEach((q, i) => (X[q[0]] = i * CW + W / 2 + 10))
  const Ms = m.split('|').map(pair), h = H + Ms.length * RH + 30, w = P.length * CW + 20
  return (
    <Frame w={w} h={h} id={id}>
      {P.map((q) => {
        const x = X[q[0]]
        return (
          <g key={q[0]}>
            <line x1={x} y1={H} x2={x} y2={h - 8} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.3} strokeDasharray="4 4" />
            <rect x={x - W / 2} y={2} width={W} height={H} rx={6} strokeWidth={1.3} stroke="currentColor" className="fill-white dark:fill-[#1a1d25]" />
            <text x={x} y={H / 2 + 6} style={nodeText} className="fill-slate-800 dark:fill-slate-100">{q[1]}</text>
          </g>
        )
      })}
      {Ms.map((x, i) => {
        const y = H + 30 + i * RH, ret = x.l[0] === '~', l = `${i + 1}. ${ret ? x.l.slice(1) : x.l}`
        if (x.a === x.b) {
          const cx = X[x.a]
          return <g key={i}><path d={`M${cx} ${y - 8} h28 v16 h-28`} fill="none" stroke="currentColor" strokeWidth={1.3} markerEnd={`url(#${id})`} /><text x={cx + 34} y={y + 3} className={label} style={{ ...labelStyle, textAnchor: 'start' }}>{l}</text></g>
        }
        const x1 = X[x.a], x2 = X[x.b]
        return <g key={i}><line x1={x1} y1={y} x2={x2 + (x2 > x1 ? -4 : 4)} y2={y} stroke="currentColor" strokeWidth={1.3} strokeDasharray={ret ? '6 3' : undefined} markerEnd={`url(#${id})`} /><text x={(x1 + x2) / 2} y={y - 6} className={label} style={labelStyle}>{l}</text></g>
      })}
    </Frame>
  )
}

export default function Diagram({ kind, spec }: { kind: 'diagram' | 'sequence'; spec: string }) {
  try {
    const o = JSON.parse(spec)
    return kind === 'sequence' ? <Sequence p={o.p} m={o.m} /> : <Flow n={o.n} e={o.e} />
  } catch {
    return null
  }
}
