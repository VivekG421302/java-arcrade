// Decides whether a run counts as "solved". Kept free of imports so the build scripts can run it too (scripts/verify-starters.mjs).
export type Checkable = { expect?: string[][]; loose?: boolean }

type Tree = string | Tree[]
const norm = (s: string) => s.replace(/["'\s]/g, '')

function parse(s: string, at: { i: number }): Tree {
  if (s[at.i] === '[') {
    at.i++
    const out: Tree[] = []
    while (at.i < s.length && s[at.i] !== ']') { out.push(parse(s, at)); if (s[at.i] === ',') at.i++ }
    at.i++
    return out
  }
  let j = at.i
  while (j < s.length && s[j] !== ',' && s[j] !== ']') j++
  const t = s.slice(at.i, j)
  at.i = j
  return t
}
const canon = (t: Tree): string => (Array.isArray(t) ? `[${t.map(canon).sort().join(',')}]` : t)

/** One printed line against one expected value: same text ignoring spaces and quotes, close numbers, or (loose) the same list in another order. */
function same(line: string, want: string, loose: boolean): boolean {
  const a = norm(line), b = norm(want)
  if (a === b) return true
  const x = Number(a), y = Number(b)
  if (a && b && Number.isFinite(x) && Number.isFinite(y)) return Math.abs(x - y) <= 1e-5 * Math.max(1, Math.abs(y))
  return loose && a.startsWith('[') && b.startsWith('[') && canon(parse(a, { i: 0 })) === canon(parse(b, { i: 0 }))
}

/** Every expected value appears among the printed lines, in order (other lines, e.g. your own debug prints, are ignored). */
export function matchesExpected(q: Checkable, stdout: string): boolean {
  const lines = stdout.replace(/\r/g, '').replace(/\n$/, '').split('\n').map((l) => l.trim())   // blank lines count: an expected "" is a blank line
  let from = 0
  for (const alts of q.expect ?? []) {
    const i = lines.findIndex((l, k) => k >= from && alts.some((w) => same(l, w, !!q.loose)))
    if (i < 0) return false
    from = i + 1
  }
  return true
}

/**
 * A run solves the problem when it finished cleanly and printed every expected answer.
 * Problems whose tests cannot be turned into calls (design problems) count once the starter's TODO is gone and the program printed something.
 */
export function isSolved(q: Checkable, code: string, r: { stdout: string; status: string }): boolean {
  if (!/^accepted$/i.test(r.status)) return false
  if (q.expect?.length) return matchesExpected(q, r.stdout)
  return r.stdout.trim() !== '' && !code.includes('TODO: write your solution')
}
