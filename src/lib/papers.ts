import type { Phase } from './content'
import type { TestQ } from './tests'

export type PaperPart = { title: string; marks: number; ans: string }
export type Paper = { a: TestQ[]; b: PaperPart[]; c: PaperPart[]; total: number }

const tidy = (t: string) => t.replace(/\s*\(read this first\)\s*/i, '').trim()

/** Readable paragraphs of a section (code, diagrams, tables and headings dropped). */
const paragraphs = (md: string) =>
  md.replace(/```[\s\S]*?```/g, '').split('\n').filter((l) => !/^\s*(#|\||-{3,})/.test(l)).join('\n')
    .split(/\n\s*\n/).map((s) => s.trim()).filter((s) => s.length > 60)

const cut = (s: string, n: number) => {
  let out = s.length <= n ? s : s.slice(0, n).replace(/[^.!?]*$/, '') || s.slice(0, n)
  if ((out.match(/\*\*/g) || []).length % 2) out += '**'
  return out.trim()
}

const spread = <T,>(a: T[], k: number): T[] => Array.from({ length: k }, (_, i) => a[a.length >= k ? Math.floor((i * a.length) / k) : i % a.length])

/**
 * One 40-mark paper per module, built from the module itself: Section A = the module's test questions (1 mark each),
 * Section B = 5 short explanations, Section C = 4 detailed explanations (5 marks each). Model answers are the chapter's own words.
 */
export function buildPaper(phase: Phase, tests: TestQ[] | undefined): Paper {
  const a = (tests ?? []).slice(0, 5)
  const pool = phase.sections.map((s) => ({ title: tidy(s.title), ps: paragraphs(s.md) })).filter((s) => s.ps.length)
  if (!pool.length) return { a, b: [], c: [], total: a.length }
  const bSecs = spread(pool, 5)
  const rest = pool.filter((s) => !bSecs.includes(s))
  const cSecs = spread(rest.length >= 4 ? rest : pool, 4)
  const bTotal = 40 - a.length - 20
  const b = bSecs.map((s, i) => ({
    title: `Explain briefly: ${s.title}.`, marks: Math.floor(bTotal / 5) + (i < bTotal % 5 ? 1 : 0), ans: cut(s.ps[0], 380),
  }))
  const c = cSecs.map((s) => ({
    title: `Explain in detail, with an example where you can: ${s.title}.`, marks: 5, ans: cut(s.ps.slice(0, 3).join('\n\n'), 1100),
  }))
  return { a, b, c, total: a.length + b.reduce((n, x) => n + x.marks, 0) + c.reduce((n, x) => n + x.marks, 0) }
}
