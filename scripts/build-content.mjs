// Parses content/roadmap.md -> src/content.json
import fs from 'node:fs'

const src = process.argv[2] || 'content/roadmap.md'
const md = fs.readFileSync(src, 'utf8').replace(/\r/g, '')

// Turn the file's inline LaTeX ($O(N \log N)$) into readable plain text.
const clean = (s) =>
  s.replace(/\$([^$\n]+)\$/g, (_, m) =>
    m
      .replace(/\\text\{([^}]*)\}/g, '$1')
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, '($1/$2)')
      .replace(/\\sqrt\{([^}]*)\}/g, '√($1)')
      .replace(/\\cdot/g, '·')
      .replace(/\\times/g, '×')
      .replace(/\\oplus/g, '⊕')
      .replace(/\\alpha/g, 'α')
      .replace(/\\(log|max|min)/g, '$1')
      .replace(/\\[,;! ]/g, ' ')
      .replace(/[\\{}]/g, '')
  )

const text = clean(md)
const parts = text.split(/^# PART (\d):.*$/m) // [pre, '1', body, '2', body, ...]
const part = (n) => parts[parts.indexOf(String(n)) + 1] || ''
const strip = (s) => s.replace(/\n---\s*$/g, '').trim()

// ---- Part 1: phases -> sections
const phases = part(1)
  .split(/^## Phase (\d+): (.*)$/m)
  .slice(1)
  .reduce((acc, v, i, a) => {
    if (i % 3 === 0) {
      const id = Number(v)
      const body = a[i + 2]
      const sections = body
        .split(/^### (?:\d+\. )?(.*)$/m)
        .slice(1)
        .reduce((s, x, j, b) => {
          if (j % 2 === 0) s.push({ id: `p${id}-s${s.length + 1}`, title: x.trim(), md: strip(b[j + 1]) })
          return s
        }, [])
      acc.push({ id, title: a[i + 1].trim(), sections })
    }
    return acc
  }, [])

// ---- Part 2: LeetCode questions
const questions = []
let cat = ''
for (const line of part(2).split('\n')) {
  const c = line.match(/^### (.*?) \(\d+-\d+\)/)
  if (c) cat = c[1]
  const q = line.match(/^(\d+)\. \*\*(.+?)\*\* \(LC #(\d+)\) - (\w+) \| Target: (.*)$/)
  if (q) questions.push({ n: +q[1], title: q[2], lc: +q[3], difficulty: q[4], target: q[5], category: cat })
}

// ---- table rows helper
const rows = (body) =>
  body
    .split('\n')
    .filter((l) => /^\| \*\*\d+\*\*/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim().replace(/^\*\*(.*)\*\*$/, '$1')))

// ---- Part 3: anti-patterns
const p3 = part(3)
const antiPatterns = p3
  .split(/^### (?=\d+\. )/m)
  .slice(1)
  .map((blk) => {
    const title = blk.match(/^(\d+)\. (.*)$/m)
    const bad = blk.match(/\*\*Problematic Code:\*\*\s*```(\w+)\n([\s\S]*?)```/)
    const good = blk.match(/\*\*Remediated Code:\*\*\s*```(\w+)\n([\s\S]*?)```/)
    const why = blk.match(/\*\*Code Review Explanation\*\*:\s*([\s\S]*?)\n\*\*Remediated Code:\*\*/)
    if (!bad || !good) return null
    return {
      n: +title[1],
      title: title[2].trim(),
      lang: bad[1],
      bad: bad[2].trimEnd(),
      good: good[2].trimEnd(),
      why: why ? why[1].trim() : '',
    }
  })
  .filter(Boolean)
const antiMatrix = rows(p3).map(([n, domain, pattern, severity, cause, fix]) => ({
  n: +n, domain, pattern, severity, cause, fix,
}))

// ---- Part 4: scenarios
const p4 = part(4)
const scenarios = p4
  .split(/^### Scenario (?=\d+: )/m)
  .slice(1)
  .map((blk) => {
    const h = blk.match(/^(\d+): (.*)$/m)
    const q = blk.match(/\*\*Question\*\*:\s*([\s\S]*?)\n\*\*Detailed Remediation & Triage\*\*:/)
    const a = blk.split(/\*\*Detailed Remediation & Triage\*\*:/)[1]
    if (!q || !a) return null
    return { n: +h[1], title: h[2].trim(), question: q[1].trim(), answer: strip(a.split(/^### /m)[0]) }
  })
  .filter(Boolean)
const scenarioMatrix = rows(p4).map(([n, symptom, cause, fix]) => ({ n: +n, symptom, cause, fix }))

const out = { phases, questions, antiPatterns, antiMatrix, scenarios, scenarioMatrix }
fs.writeFileSync('src/content.json', JSON.stringify(out))
console.log(
  `phases=${phases.length} sections=${phases.reduce((s, p) => s + p.sections.length, 0)} ` +
    `questions=${questions.length} antiPatterns=${antiPatterns.length}+${antiMatrix.length} ` +
    `scenarios=${scenarios.length}+${scenarioMatrix.length}`
)
