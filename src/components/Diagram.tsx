import { useEffect, useId, useMemo, useState } from 'react'
import { layoutFlow, layoutSeq, type TW } from '../lib/diagramLayout'

/** Compact diagram specs written in the roadmap markdown (```diagram / ```sequence fences), drawn as theme-aware SVG. */
const FONTS = { node: '600 12px Inter, system-ui, sans-serif', label: '400 11px Inter, system-ui, sans-serif' }
let ctx: CanvasRenderingContext2D | null | undefined
const tw: TW = (s, kind) => {
  if (ctx === undefined) ctx = typeof document !== 'undefined' ? document.createElement('canvas').getContext('2d') : null
  if (!ctx) return s.length * (kind === 'node' ? 7.4 : 6.4)
  ctx.font = FONTS[kind]
  return ctx.measureText(s).width * 1.06 + 2   // small safety margin: fonts differ a little between systems
}

const halo = 'stroke-white dark:stroke-[#0f1115]'
const labelCls = `fill-slate-500 dark:fill-slate-400 ${halo}`
const labelStyle = { font: FONTS.label, paintOrder: 'stroke' as const, strokeWidth: 4 }
const nodeText = { font: FONTS.node, textAnchor: 'middle' as const }

function Frame({ vb, id, children }: { vb: [number, number, number, number]; id: string; children: React.ReactNode }) {
  return (
    <div className="my-5 overflow-x-auto rounded-lg bg-slate-50 p-2 dark:bg-white/[0.03]">
      <svg role="img" viewBox={vb.join(' ')} width={vb[2]} style={{ maxWidth: '100%', minWidth: Math.min(vb[2], vb[2] * 0.72), height: 'auto' }} className="mx-auto block text-slate-700 dark:text-slate-300">
        <defs><marker id={id} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10z" fill="currentColor" /></marker></defs>
        {children}
      </svg>
    </div>
  )
}

/** Re-measure once web fonts have loaded, so boxes fit the real text. */
function useFontsReady() {
  const [n, setN] = useState(0)
  useEffect(() => { document.fonts?.ready.then(() => setN(1)) }, [])
  return n
}

function Flow({ n, e }: { n: string; e: string }) {
  const id = useId(), fonts = useFontsReady()
  const L = useMemo(() => layoutFlow(n, e, tw), [n, e, fonts])
  return (
    <Frame vb={L.vb} id={id}>
      {L.edges.map((g, i) => (
        <g key={i}>
          <path d={g.d} fill="none" stroke="currentColor" strokeWidth={1.3} markerEnd={`url(#${id})`} />
          {g.label && <text x={g.lx} y={g.ly + 4} textAnchor={g.anchor} className={labelCls} style={labelStyle}>{g.label}</text>}
        </g>
      ))}
      {L.nodes.map((v) => (
        <g key={v.id}>
          <rect x={v.x - v.w / 2} y={v.y - v.h / 2} width={v.w} height={v.h} rx={6} strokeWidth={1.3} stroke="currentColor" className={v.f ? 'fill-slate-700 dark:fill-slate-200' : 'fill-white dark:fill-[#1a1d25]'} />
          <text style={nodeText} className={v.f ? 'fill-white dark:fill-slate-900' : 'fill-slate-800 dark:fill-slate-100'}>
            {v.lines.map((t, i) => <tspan key={i} x={v.x} y={v.y - ((v.lines.length - 1) * 16) / 2 + i * 16 + 4}>{t}</tspan>)}
          </text>
        </g>
      ))}
    </Frame>
  )
}

function Sequence({ p, m }: { p: string; m: string }) {
  const id = useId(), fonts = useFontsReady()
  const L = useMemo(() => layoutSeq(p, m, tw), [p, m, fonts])
  const bottom = L.vb[3] - 6
  return (
    <Frame vb={L.vb} id={id}>
      {L.parts.map((q) => (
        <g key={q.id}>
          <line x1={q.x} y1={L.head} x2={q.x} y2={bottom} stroke="currentColor" strokeOpacity={0.5} strokeWidth={1.3} strokeDasharray="4 4" />
          <rect x={q.x - q.w / 2} y={2} width={q.w} height={L.head - 2} rx={6} strokeWidth={1.3} stroke="currentColor" className="fill-white dark:fill-[#1a1d25]" />
          <text style={nodeText} className="fill-slate-800 dark:fill-slate-100">
            {q.lines.map((t, i) => <tspan key={i} x={q.x} y={2 + (L.head - 2) / 2 - ((q.lines.length - 1) * 16) / 2 + i * 16 + 4}>{t}</tspan>)}
          </text>
        </g>
      ))}
      {L.msgs.map((x, i) =>
        x.self ? (
          <g key={i}><path d={`M${x.x1} ${x.y - 8} h30 v16 h-30`} fill="none" stroke="currentColor" strokeWidth={1.3} markerEnd={`url(#${id})`} /><text x={x.x1 + 36} y={x.y + 4} textAnchor="start" className={labelCls} style={labelStyle}>{x.label}</text></g>
        ) : (
          <g key={i}><line x1={x.x1} y1={x.y} x2={x.x2 + (x.x2 > x.x1 ? -4 : 4)} y2={x.y} stroke="currentColor" strokeWidth={1.3} strokeDasharray={x.ret ? '6 3' : undefined} markerEnd={`url(#${id})`} /><text x={(x.x1 + x.x2) / 2} y={x.y - 7} textAnchor="middle" className={labelCls} style={labelStyle}>{x.label}</text></g>
        ),
      )}
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
