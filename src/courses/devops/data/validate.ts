// Build-time content checks (spec 4.4.7). `validateStage` runs when a stage module is imported, so a malformed table fails the dev server/build loudly.
import type { ComparisonTable, CourseStage, LabStep } from '../types'

export function validateTable(t: ComparisonTable): string[] {
  const errs = t.rows.flatMap((r, i) => (r.length === t.columns.length ? [] : [`table "${t.id}" row ${i + 1} has ${r.length} cells, expected ${t.columns.length}`]))
  if (t.rowSemantics && t.rowSemantics.length !== t.rows.length) errs.push(`table "${t.id}" has ${t.rowSemantics.length} rowSemantics for ${t.rows.length} rows`)
  return errs
}

export function validateStage(s: CourseStage): void {
  const errs: string[] = []
  const tables = [s.imagineCard.mappingTable, s.painPointTable, s.cheatSheet, ...(s.extraTables ?? [])]
  tables.forEach((t) => errs.push(...validateTable(t)))
  const steps: [string, LabStep][] = [
    ...s.labs.flatMap((l) => l.steps.map((x, i): [string, LabStep] => [`${l.id}#${i + 1}`, x])),
    ...s.chaosLabs.flatMap((c) => [...c.diagnosticTrail, ...c.exactFix].map((x, i): [string, LabStep] => [`${c.id}#${i + 1}`, x])),
  ]
  for (const [id, st] of steps) {
    const r = st.validation
    if ((r.kind === 'regex' || r.kind === 'exact' || r.kind === 'process-running' || r.kind === 'state-equals' || r.kind === 'sequence') && !r.pattern && !r.args?.length) errs.push(`step ${id}: rule "${r.kind}" needs a pattern`)
    if (r.kind === 'regex' && r.pattern) { try { new RegExp(r.pattern) } catch { errs.push(`step ${id}: invalid regex ${r.pattern}`) } }
  }
  if (s.chaosLabs.length < 2) errs.push('a stage needs at least 2 chaos labs')
  if (errs.length) throw new Error(`Stage ${s.number} content is invalid:\n${errs.join('\n')}`)
}
