/** Layout for the compact ```diagram / ```sequence specs. Pure functions, so every diagram can be checked for overlaps in tests. */
export type TW = (s: string, kind: 'node' | 'label') => number

export type FNode = { id: string; lines: string[]; f: boolean; x: number; y: number; w: number; h: number }
export type FEdge = { d: string; label: string; lx: number; ly: number; anchor: 'middle' | 'start' | 'end'; lw: number; pts: [number, number][] }
export type FlowLayout = { nodes: FNode[]; edges: FEdge[]; vb: [number, number, number, number] }

const wrap = (s: string, max: number, tw: TW) => {
  const lines: string[] = []
  let cur = ''
  for (const w of s.split(' ')) {
    const t = cur ? `${cur} ${w}` : w
    if (cur && tw(t, 'node') > max) { lines.push(cur); cur = w } else cur = t
  }
  if (cur) lines.push(cur)
  return lines
}

const pair = (s: string) => {
  const [a, q] = s.split('>'), k = q.indexOf(':')
  return { a, b: k < 0 ? q : q.slice(0, k), l: k < 0 ? '' : q.slice(k + 1) }
}

export function layoutFlow(n: string, e: string, tw: TW): FlowLayout {
  const MAXW = 176
  const raw = n.split('|').map((s) => {
    const p = s.split(':'), r = +p[p.length - 1], c = +p[p.length - 2]   // labels may contain ':'
    let label = p.slice(1, -2).join(':')
    const f = label[0] === '!'
    if (f) label = label.slice(1)
    return { id: p[0], label, f, c, r }
  })
  const N: Record<string, FNode & { c: number; r: number }> = {}
  let mc = 0, mr = 0
  for (const x of raw) {
    const lines = wrap(x.label, MAXW, tw)
    const w = Math.max(100, Math.max(...lines.map((l) => tw(l, 'node'))) + 30)
    N[x.id] = { id: x.id, lines, f: x.f, x: 0, y: 0, w, h: Math.max(42, lines.length * 16 + 16), c: x.c, r: x.r }
    mc = Math.max(mc, x.c); mr = Math.max(mr, x.r)
  }
  const list = Object.values(N)
  const colW = Array(mc + 1).fill(0), rowH = Array(mr + 1).fill(0)
  list.forEach((v) => { colW[v.c] = Math.max(colW[v.c], v.w); rowH[v.r] = Math.max(rowH[v.r], v.h) })
  const gapX: number[] = Array(mc).fill(72), gapY: number[] = Array(mr).fill(74)

  const E = e.split('|').map(pair).filter((x) => N[x.a] && N[x.b])
  // make the horizontal room between columns big enough for each arrow's label
  for (const x of E) {
    if (!x.l || x.a === x.b) continue
    const lo = Math.min(N[x.a].c, N[x.b].c), hi = Math.max(N[x.a].c, N[x.b].c)
    if (lo === hi) continue
    const need = tw(x.l, 'label') + 32
    let avail = 0
    for (let k = lo; k < hi; k++) avail += gapX[k]
    for (let k = lo + 1; k < hi; k++) avail += colW[k]
    if (avail < need) gapX[lo] += need - avail
  }
  const X: number[] = [], Y: number[] = []
  let ax = 24
  for (let c = 0; c <= mc; c++) { X[c] = ax + colW[c] / 2; ax += colW[c] + (gapX[c] ?? 0) }
  let ay = 52
  for (let r = 0; r <= mr; r++) { Y[r] = ay + rowH[r] / 2; ay += rowH[r] + (gapY[r] ?? 0) }
  list.forEach((v) => { v.x = X[v.c]; v.y = Y[v.r] })

  const hitsNode = (px: number, py: number, skip: string[]) =>
    list.some((v) => !skip.includes(v.id) && Math.abs(px - v.x) < v.w / 2 + 8 && Math.abs(py - v.y) < v.h / 2 + 8)
  const border = (v: FNode, tx: number, ty: number): [number, number] => {
    const dx = tx - v.x, dy = ty - v.y, L = Math.hypot(dx, dy) || 1
    const t = Math.min(v.w / 2 / (Math.abs(dx) || 1e-9), v.h / 2 / (Math.abs(dy) || 1e-9))
    return [v.x + dx * t + (dx / L) * 3, v.y + dy * t + (dy / L) * 3]
  }

  type Pt = [number, number]
  const edges: FEdge[] = []
  const bidir = (a: string, b: string) => E.some((o) => o.a === b && o.b === a)
  const exitT = (p: Pt, dx: number, dy: number, v: FNode) => {   // distance along (dx,dy) from p (inside v) to v's border
    const tx = dx > 0 ? (v.x + v.w / 2 - p[0]) / dx : dx < 0 ? (v.x - v.w / 2 - p[0]) / dx : Infinity
    const ty = dy > 0 ? (v.y + v.h / 2 - p[1]) / dy : dy < 0 ? (v.y - v.h / 2 - p[1]) / dy : Infinity
    return Math.min(tx, ty)
  }
  const segX = (a: Pt, b: Pt, c: Pt, d: Pt) => {
    const o = (p: Pt, q: Pt, r: Pt) => (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0])
    return o(a, b, c) * o(a, b, d) < 0 && o(c, d, a) * o(c, d, b) < 0
  }
  const crossings = (pts: Pt[], others: Pt[][]) => {
    let n = 0
    for (const q of others) for (let i = 0; i + 1 < pts.length; i += 2) for (let k = 0; k + 1 < q.length; k += 2) if (segX(pts[i], pts[i + 1], q[k], q[k + 1])) n++
    return n
  }
  type Route = { d: string; pts: Pt[]; mid: Pt; ex: number; ey: number; side: Pt | null }
  const routes: (Route | null)[] = E.map(() => null)

  // pass 1: arrows that need no detour. A two-way pair becomes two parallel straight lines.
  E.forEach((x, ei) => {
    if (x.a === x.b) return
    const A = N[x.a], B = N[x.b]
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, nx = -uy, ny = ux
    const sh = bidir(x.a, x.b) ? 11 : 0
    const p0: Pt = [A.x + nx * sh, A.y + ny * sh], p1: Pt = [B.x + nx * sh, B.y + ny * sh]
    const ta = exitT(p0, ux, uy, A) + 3, tb = exitT([p1[0], p1[1]], -ux, -uy, B) + 3
    const S: Pt = [p0[0] + ux * ta, p0[1] + uy * ta], En: Pt = [p1[0] - ux * tb, p1[1] - uy * tb]
    const pts: Pt[] = []
    for (let i = 0; i < 24; i++) { const t = i / 24, u = (i + 1) / 24; pts.push([S[0] + (En[0] - S[0]) * t, S[1] + (En[1] - S[1]) * t], [S[0] + (En[0] - S[0]) * u, S[1] + (En[1] - S[1]) * u]) }
    if (pts.some((q) => hitsNode(q[0], q[1], [x.a, x.b]))) return
    routes[ei] = { d: `M${S[0]} ${S[1]} L${En[0]} ${En[1]}`, pts, mid: [(S[0] + En[0]) / 2, (S[1] + En[1]) / 2], ex: En[0] - S[0], ey: En[1] - S[1], side: sh ? [nx, ny] : null }
  })
  // pass 2: arrows that would cross a box get a curved detour; pick the one with the fewest crossings
  E.forEach((x, ei) => {
    if (x.a === x.b || routes[ei]) return
    const A = N[x.a], B = N[x.b]
    const mx = (A.x + B.x) / 2, my = (A.y + B.y) / 2, dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L
    const done = routes.filter((r): r is Route => !!r).map((r) => r.pts)
    let best: { cost: number; r: Route } | null = null
    for (const off of [40, -40, 72, -72, 104, -104, 140, -140]) {
      const C: Pt = [mx + nx * off, my + ny * off]
      const S = border(A, C[0], C[1]), En = border(B, C[0], C[1])
      const pts: Pt[] = []
      const at = (t: number): Pt => [(1 - t) ** 2 * S[0] + 2 * (1 - t) * t * C[0] + t * t * En[0], (1 - t) ** 2 * S[1] + 2 * (1 - t) * t * C[1] + t * t * En[1]]
      for (let i = 0; i < 24; i++) pts.push(at(i / 24), at((i + 1) / 24))
      const hits = pts.filter((q) => hitsNode(q[0], q[1], [x.a, x.b])).length
      const cost = hits * 1000 + crossings(pts, done) * 10 + Math.abs(off) / 10
      if (!best || cost < best.cost) best = { cost, r: { d: `M${S[0]} ${S[1]} Q${C[0]} ${C[1]} ${En[0]} ${En[1]}`, pts: [...pts, C, C], mid: at(0.5), ex: En[0] - S[0], ey: En[1] - S[1], side: [nx * Math.sign(off), ny * Math.sign(off)] } }
    }
    routes[ei] = best!.r
  })

  E.forEach((x, ei) => {
    const A = N[x.a], lw = x.l ? tw(x.l, 'label') : 0
    if (x.a === x.b) {
      const top = A.y - A.h / 2
      edges.push({ d: `M${A.x - 22} ${top} C${A.x - 56} ${top - 46} ${A.x + 56} ${top - 46} ${A.x + 22} ${top}`, label: x.l, lx: A.x, ly: top - 40, anchor: 'middle', lw, pts: [[A.x - 56, top - 46], [A.x + 56, top - 46]] })
      return
    }
    const r = routes[ei]!
    // label sits beside its own line (never across it): step out along the line's normal by half the label's extent in that direction
    let [sx, sy] = r.side ?? [0, 0]
    if (!r.side) {
      const Lr = Math.hypot(r.ex, r.ey) || 1
      sx = -r.ey / Lr; sy = r.ex / Lr
      if (sy > 0 || (Math.abs(sy) < 1e-6 && sx < 0)) { sx = -sx; sy = -sy }   // prefer above / right
    }
    const step = Math.abs(sx) * lw / 2 + Math.abs(sy) * 8 + 7
    const lx = r.mid[0] + sx * step, ly = r.mid[1] + sy * step, anchor: 'middle' | 'start' | 'end' = 'middle'
    edges.push({ d: r.d, label: x.l, lx, ly, anchor, lw, pts: r.pts })
  })

  // place arrow labels greedily: keep the default spot unless it touches a box or an earlier label, then nudge the smallest distance
  const lrect = (g: FEdge, dx: number, dy: number) => {
    const x1 = (g.anchor === 'middle' ? g.lx - g.lw / 2 : g.anchor === 'start' ? g.lx : g.lx - g.lw) + dx
    return { x1, x2: x1 + g.lw, y1: g.ly - 8 + dy, y2: g.ly + 6 + dy }
  }
  const cross = (a: { x1: number; x2: number; y1: number; y2: number }, b: { x1: number; x2: number; y1: number; y2: number }, pad: number) => a.x1 < b.x2 + pad && a.x2 > b.x1 - pad && a.y1 < b.y2 + pad && a.y2 > b.y1 - pad
  const segsHitRect = (pts: Pt[], r: { x1: number; x2: number; y1: number; y2: number }) => {
    const inside = (p: Pt) => p[0] > r.x1 && p[0] < r.x2 && p[1] > r.y1 && p[1] < r.y2
    const sides: [Pt, Pt][] = [[[r.x1, r.y1], [r.x2, r.y1]], [[r.x2, r.y1], [r.x2, r.y2]], [[r.x2, r.y2], [r.x1, r.y2]], [[r.x1, r.y2], [r.x1, r.y1]]]
    for (let i = 0; i + 1 < pts.length; i += 2) if (inside(pts[i]) || inside(pts[i + 1]) || sides.some((q) => segX(pts[i], pts[i + 1], q[0], q[1]))) return true
    return false
  }
  const placed: { x1: number; x2: number; y1: number; y2: number }[] = []
  const cands: [number, number][] = []
  for (const dy of [0, -14, 14, -28, 28, -42, 42]) for (const dx of [0, -22, 22, -44, 44]) cands.push([dx, dy])
  cands.sort((a, b) => Math.abs(a[0]) * 0.7 + Math.abs(a[1]) - (Math.abs(b[0]) * 0.7 + Math.abs(b[1])))
  for (const g of edges) {
    if (!g.label) continue
    const ok = (c: [number, number]) => {
      const r = lrect(g, c[0], c[1])
      return !list.some((v) => cross(r, { x1: v.x - v.w / 2, x2: v.x + v.w / 2, y1: v.y - v.h / 2, y2: v.y + v.h / 2 }, 2)) && !placed.some((q) => cross(r, q, 1)) && !edges.some((o) => segsHitRect(o.pts, r))
    }
    const pick = cands.find(ok) ?? cands[0]
    g.lx += pick[0]; g.ly += pick[1]
    placed.push(lrect(g, 0, 0))
  }

  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity   // tight bounds: nodes, arrow paths and labels only
  list.forEach((v) => { minX = Math.min(minX, v.x - v.w / 2); maxX = Math.max(maxX, v.x + v.w / 2); minY = Math.min(minY, v.y - v.h / 2); maxY = Math.max(maxY, v.y + v.h / 2) })
  edges.forEach((g) => {
    g.pts.forEach((p) => { minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]) })
    if (g.label) {
      const l = g.anchor === 'middle' ? g.lx - g.lw / 2 : g.anchor === 'start' ? g.lx : g.lx - g.lw
      minX = Math.min(minX, l); maxX = Math.max(maxX, l + g.lw); minY = Math.min(minY, g.ly - 10); maxY = Math.max(maxY, g.ly + 6)
    }
  })
  const P = 14
  return { nodes: list, edges, vb: [minX - P, minY - P, maxX - minX + 2 * P, maxY - minY + 2 * P] }
}

export type SeqLayout = { parts: { id: string; x: number; w: number; lines: string[] }[]; msgs: { x1: number; x2: number; y: number; ret: boolean; self: boolean; label: string; lw: number }[]; head: number; vb: [number, number, number, number] }

export function layoutSeq(p: string, m: string, tw: TW): SeqLayout {
  const P = p.split('|').map((s) => { const k = s.indexOf(':'); return { id: s.slice(0, k), label: s.slice(k + 1) } })
  const idx: Record<string, number> = {}
  P.forEach((q, i) => (idx[q.id] = i))
  const parts = P.map((q) => { const lines = wrap(q.label, 150, tw); return { id: q.id, lines, w: Math.max(110, Math.max(...lines.map((l) => tw(l, 'node'))) + 28), x: 0 } })
  const head = Math.max(...parts.map((q) => q.lines.length)) * 16 + 18
  const M = m.split('|').map(pair).filter((x) => x.a in idx && x.b in idx).map((x, i) => {
    const ret = x.l[0] === '~', label = `${i + 1}. ${ret ? x.l.slice(1) : x.l}`
    return { ai: idx[x.a], bi: idx[x.b], ret, label, lw: tw(label, 'label') }
  })
  const sp = parts.slice(1).map((q, i) => Math.max(150, (parts[i].w + q.w) / 2 + 28))
  ;[...M].filter((x) => x.ai !== x.bi).sort((a, b) => Math.abs(a.ai - a.bi) - Math.abs(b.ai - b.bi)).forEach((x) => {
    const lo = Math.min(x.ai, x.bi), hi = Math.max(x.ai, x.bi)
    let avail = 0
    for (let k = lo; k < hi; k++) avail += sp[k]
    if (avail < x.lw + 40) sp[hi - 1] += x.lw + 40 - avail
  })
  M.filter((x) => x.ai === x.bi && x.ai < parts.length - 1).forEach((x) => { sp[x.ai] = Math.max(sp[x.ai], x.lw + 60) })
  let ax = 14 + parts[0].w / 2
  parts.forEach((q, i) => { q.x = ax; if (i < sp.length) ax += sp[i] })
  const RH = 46
  const msgs = M.map((x, i) => ({ x1: parts[x.ai].x, x2: parts[x.bi].x, y: head + 34 + i * RH, ret: x.ret, self: x.ai === x.bi, label: x.label, lw: x.lw }))
  const last = M.find((x) => x.ai === x.bi && x.ai === parts.length - 1)
  const right = ax + parts[parts.length - 1].w / 2 + 14
  const w = Math.max(right, last ? ax + 34 + last.lw + 14 : 0)
  return { parts, msgs, head, vb: [0, 0, w, head + 34 + M.length * RH + 6] }
}
