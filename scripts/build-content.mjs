// Parses content/roadmap.md -> src/content.json
import fs from 'node:fs'
import { loadProblems } from './problems.mjs'

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

// ---- IDE starter file per question: stubbed class + a Main with the sample tests as comments
const DEFAULT_RET = { int: '0', long: '0L', short: '0', byte: '0', double: '0.0', float: '0f', boolean: 'false', char: "'\\0'" }
function makeStarter(q) {
  const lines = q.code.split('\n')
  const cls = (lines.find((l) => /^class \w+/.test(l)) || '').match(/^class (\w+)/)?.[1] || 'Solution'
  // nested helper class (e.g. Node) that the public signatures depend on
  const ns = lines.findIndex((l) => /^    static class Node\b/.test(l))
  let nested = ''
  if (ns >= 0) {
    let end = ns
    while (!/^    \}/.test(lines[end])) end++
    nested = lines.slice(ns, end + 1).join('\n') + '\n\n'
  }
  const stubs = lines
    .filter((l) => /^    public .*\)\s*\{\s*$/.test(l))
    .map((l) => {
      const sig = l.trim().replace(/\s*\{$/, '').replace(/^public\s+/, '')
      const parts = sig.slice(0, sig.indexOf('(')).trim().split(/\s+/)
      const type = parts.length > 1 ? parts.slice(0, -1).join(' ') : null // null = constructor
      const ret = type && type !== 'void' ? `        return ${DEFAULT_RET[type] ?? 'null'};\n` : ''
      return `    public ${sig} {\n        // TODO: write your solution\n${ret}    }`
    })
  const defs = q.defs ? q.defs.replace(/^public /, '') + '\n\n' : ''
  const tests = q.tests.slice(0, 3).map((t) => `        //   ${t.input}  =>  ${t.output}`).join('\n')
  const make = cls === 'Solution' ? '        Solution solution = new Solution();\n' : `        // ${cls} obj = new ${cls}(...);\n`
  return `import java.util.*;\n\n${defs}class ${cls} {\n${nested}${stubs.join('\n\n')}\n}\n\npublic class Main {\n    public static void main(String[] args) {\n        // Sample tests:\n${tests}\n\n${make}        // System.out.println(...);\n    }\n}\n`
}

// ---- merge problem statements, test cases and Java solutions into the questions
const DEFS = {
  ListNode: 'public class ListNode {\n    int val;\n    ListNode next;\n    ListNode(int val) { this.val = val; }\n}',
  TreeNode: 'public class TreeNode {\n    int val;\n    TreeNode left, right;\n    TreeNode(int val) { this.val = val; }\n}',
}
const problems = new Map(loadProblems().map((p) => [p.n, p]))
for (const q of questions) {
  const p = problems.get(q.n)
  if (!p || !p.statement || !p.code || !p.tests.length) throw new Error(`Missing problem content for question ${q.n} (${q.title})`)
  q.statement = p.statement
  q.tests = p.tests
  q.approach = p.approach
  q.code = p.code
  const need = Object.keys(DEFS).find((k) => new RegExp(`\\b${k}\\b`).test(p.code) && !new RegExp(`class ${k}\\b`).test(p.code))
  if (need) q.defs = DEFS[need]
  q.starter = makeStarter(q)
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

// ---- projects (content/projects/java.md)
const loadProjects = (file) =>
  fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8').replace(/\r/g, '').split(/^## /m).slice(1).map((blk, i) => {
        const [title, ...rest] = blk.split('\n')
        const body = rest.join('\n')
        const meta = (k) => (body.match(new RegExp(`^${k}: (.*)$`, 'm')) || [])[1]?.trim() ?? ''
        const sec = (name) => (body.split(new RegExp(`^### ${name}\\s*$`, 'm'))[1] || '').split(/^### /m)[0].trim()
        return { n: i + 1, title: title.trim(), level: meta('Level'), stack: meta('Stack').split(',').map((x) => x.trim()).filter(Boolean),
          what: sec('What it should do'), flow: sec('How the tech flows'), solves: sec('Problems it solves') }
      })
    : []
const projects = loadProjects('content/projects/java.md')

const out = { phases, questions, antiPatterns, antiMatrix, scenarios, scenarioMatrix, projects }
fs.writeFileSync('src/content.json', JSON.stringify(out))
console.log(
  `phases=${phases.length} sections=${phases.reduce((s, p) => s + p.sections.length, 0)} ` +
    `questions=${questions.length} antiPatterns=${antiPatterns.length}+${antiMatrix.length} ` +
    `scenarios=${scenarios.length}+${scenarioMatrix.length} projects=${projects.length}`
)
