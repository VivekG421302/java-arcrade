// Builds src/content.json = { java, rust } from the markdown/problem files.
import fs from 'node:fs'
import { loadProblems } from './problems.mjs'
import { loadExercises } from './exercises.mjs'
import { javaCalls, parseJavaSig, parseRustSig, rustCalls } from './calls.mjs'

// Turn inline LaTeX ($O(N \log N)$) into readable plain text.
const latex = (s) =>
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
// Leave code (fenced blocks and `inline code`) alone: `$1/$2` and shell `$VAR` are not LaTeX.
const clean = (s) => s.split(/(```[\s\S]*?```|`[^`\n]*`)/).map((part, i) => (i % 2 ? part : latex(part))).join('')
const strip = (s) => s.replace(/\n---\s*$/g, '').trim()
const rowsOf = (body) =>
  body
    .split('\n')
    .filter((l) => /^\| \*\*\d+\*\*/.test(l))
    .map((l) => l.split('|').slice(1, -1).map((c) => c.trim().replace(/^\*\*(.*)\*\*$/, '$1')))

/** One roadmap file -> phases, question list (Part 2), anti-patterns (Part 3), scenarios (Part 4). */
/**
 * Java roadmap order changed (the "Build It" module moved from 5th to 9th, after Spring Boot; "Advanced Concurrency" was added as 10th). A module's number is its position,
 * but saved progress (read marks g5-s1.., test results, Supabase phase ids) was stored under the old numbers, so each module keeps
 * its original number as a storage `key`: new position -> old number. Everything not listed keeps its number.
 */
const JAVA_KEYS = { 5: 6, 6: 7, 7: 8, 8: 9, 9: 5, 10: 12, 11: 10, 12: 11 }

function parseRoadmap(file, prefix, keys = {}) {
  const empty = { phases: [], base: [], antiPatterns: [], antiMatrix: [], scenarios: [], scenarioMatrix: [] }
  if (!fs.existsSync(file)) return empty
  const text = clean(fs.readFileSync(file, 'utf8').replace(/\r/g, ''))
  const parts = text.split(/^# PART (\d):.*$/m)
  const part = (n) => parts[parts.indexOf(String(n)) + 1] || ''

  const phases = part(1)
    .split(/^## (?:Phase|Module) (\d+): (.*)$/m)
    .slice(1)
    .reduce((acc, v, i, a) => {
      if (i % 3 === 0) {
        const id = Number(v)
        const sections = a[i + 2]
          .split(/^### (?:\d+\. )?(.*)$/m)
          .slice(1)
          .reduce((s, x, j, b) => {
            if (j % 2 === 0) s.push({ id: `${prefix}${keys[id] ?? id}-s${s.length + 1}`, title: x.trim(), md: strip(b[j + 1]) })
            return s
          }, [])
        acc.push({ id, ...(keys[id] ? { key: keys[id] } : {}), title: a[i + 1].trim(), sections })
      }
      return acc
    }, [])

  const base = []
  let cat = ''
  for (const line of part(2).split('\n')) {
    const c = line.match(/^### (.*?) \(\d+-\d+\)/)
    if (c) cat = c[1]
    const q = line.match(/^(\d+)\. \*\*(.+?)\*\* \(LC #(\d+)\) - (\w+) \| Target: (.*)$/)
    if (q) base.push({ n: +q[1], title: q[2], lc: +q[3], difficulty: q[4], target: q[5], category: cat })
  }

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
      return { n: +title[1], title: title[2].trim(), lang: bad[1], bad: bad[2].trimEnd(), good: good[2].trimEnd(), why: why ? why[1].trim() : '' }
    })
    .filter(Boolean)
  const antiMatrix = rowsOf(p3).map(([n, domain, pattern, severity, cause, fix]) => ({ n: +n, domain, pattern, severity, cause, fix }))

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
  const scenarioMatrix = rowsOf(p4).map(([n, symptom, cause, fix]) => ({ n: +n, symptom, cause, fix }))
  return { phases, base, antiPatterns, antiMatrix, scenarios, scenarioMatrix }
}

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

// ---------------- Java starters ----------------
const DEFAULT_RET = { int: '0', long: '0L', short: '0', byte: '0', double: '0.0', float: '0f', boolean: 'false', char: "'\\0'" }
function makeJavaStarter(q) {
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
  const sigs = lines
    .filter((l) => /^    public .*\)\s*\{\s*$/.test(l))
    .map((l) => l.trim().replace(/\s*\{$/, '').replace(/^public\s+/, ''))
  const stubs = sigs.map((sig) => {
    const parts = sig.slice(0, sig.indexOf('(')).trim().split(/\s+/)
    const type = parts.length > 1 ? parts.slice(0, -1).join(' ') : null // null = constructor
    const ret = type && type !== 'void' ? `        return ${DEFAULT_RET[type] ?? 'null'};\n` : ''
    return `    public ${sig} {\n        // TODO: write your solution\n${ret}    }`
  })
  const defs = q.defs ? q.defs.replace(/^public /, '') + '\n\n' : ''
  const tests = q.tests.slice(0, 3).map((t) => `        //   ${t.input}  =>  ${t.output}`).join('\n')
  const make = cls === 'Solution' ? '        Solution solution = new Solution();\n' : `        // ${cls} obj = new ${cls}(...);\n`
  // one println per test case when the inputs can be turned into typed calls (also recorded in q.expect so a run can be checked)
  const calls = cls === 'Solution' && sigs.length === 1 ? javaCalls(q, parseJavaSig(sigs[0])) : null
  if (calls) { q.expect = calls.expect; if (calls.loose) q.loose = true }
  const mainBody = calls
    ? `        // Test cases: every line prints a result; the expected value is on the right.\n${calls.body.join('\n')}\n`
    : `        // Sample tests:\n${tests}\n\n${make}        // System.out.println(...);\n`
  const helpers = calls?.helpers.length ? `\n\n${calls.helpers.join('\n\n')}` : ''
  return `import java.util.*;\n\n${defs}class ${cls} {\n${nested}${stubs.join('\n\n')}\n}\n\npublic class Main {\n    public static void main(String[] args) {\n${mainBody}    }${helpers}\n}\n`
}


const JAVA_DEFS = {
  ListNode: 'public class ListNode {\n    int val;\n    ListNode next;\n    ListNode(int val) { this.val = val; }\n}',
  TreeNode: 'public class TreeNode {\n    int val;\n    TreeNode left, right;\n    TreeNode(int val) { this.val = val; }\n}',
}

// ---------------- Rust starters ----------------
const RUST_DEFS = {
  ListNode: '#[derive(PartialEq, Eq, Clone, Debug)]\npub struct ListNode {\n    pub val: i32,\n    pub next: Option<Box<ListNode>>,\n}',
  TreeNode: '#[derive(PartialEq, Eq, Clone, Debug)]\npub struct TreeNode {\n    pub val: i32,\n    pub left: Option<Box<TreeNode>>,\n    pub right: Option<Box<TreeNode>>,\n}',
}
function makeRustStarter(q) {
  const lines = q.code.split('\n')
  const main = (lines.find((l) => /^(pub )?struct \w+/.test(l)) || 'struct Solution;').match(/struct (\w+)/)[1]
  const unit = new RegExp(`^(pub )?struct ${main};`).test(lines.join('\n'))
  const stubs = [], sigs = []
  let inImpl = false
  for (const l of lines) {
    if (/^impl\b/.test(l)) inImpl = new RegExp(`^impl ${main}\\b`).test(l)
    if (!inImpl || !/^    pub fn .*\{\s*$/.test(l)) continue
    const sig = l.replace(/\s*\{\s*$/, '')
    sigs.push(sig.replace(/^\s*pub fn /, ''))
    const ret = /->/.test(sig) ? '        todo!()\n' : ''
    stubs.push(`${sig} {\n        // TODO: write your solution\n${ret}    }`)
  }
  const given = [q.defs, q.given].filter(Boolean).join('\n\n')
  const tests = q.tests.slice(0, 3).map((t) => `    //   ${t.input}  =>  ${t.output}`).join('\n')
  const decl = unit ? `struct ${main};` : `struct ${main} {\n    // TODO: your fields\n}`
  const calls = main === 'Solution' && sigs.length === 1 ? rustCalls(q, parseRustSig(sigs[0])) : null
  if (calls) { q.expect = calls.expect; if (calls.loose) q.loose = true }
  const mainBody = calls
    ? `    // Test cases: every line prints a result; the expected value is on the right.\n${calls.body.join('\n')}\n`
    : `    // Sample tests:\n${tests}\n\n    // println!("{:?}", ...);\n`
  const helpers = calls?.helpers.length ? `\n${calls.helpers.join('\n\n')}\n` : ''
  return `use std::collections::*;\n\n${given ? given + '\n\n' : ''}${decl}\n\nimpl ${main} {\n${stubs.join('\n\n')}\n}\n\nfn main() {\n${mainBody}}\n${helpers}`
}

// ---------------- assemble one course ----------------
function attach(base, problems, { defsMap, starter, fallback, shortTarget }) {
  const byN = new Map(problems.map((p) => [p.n, p]))
  return base.map((b) => {
    const p = byN.get(b.n)
    const fb = fallback?.get(b.n)
    if (!p || !p.code) {
      if (problems.length) throw new Error(`Missing solution for question ${b.n} (${b.title})`)
      return null
    }
    const q = {
      ...b,
      target: shortTarget ? b.target.replace(/\s*\(`[^)]*`\)/g, '').trim() : b.target,
      statement: p.statement || fb?.statement,
      tests: p.tests.length ? p.tests : fb?.tests,
      approach: p.approach,
      code: p.code,
    }
    if (!q.statement || !q.tests?.length) throw new Error(`Missing statement/tests for question ${b.n}`)
    if (p.given) q.given = p.given
    const need = Object.keys(defsMap).find((k) => new RegExp(`\\b${k}\\b`).test(p.code) && !new RegExp(`(class|struct) ${k}\\b`).test(p.code))
    if (need) q.defs = defsMap[need]
    q.starter = starter(q)
    delete q.given
    return q
  }).filter(Boolean)
}

const javaRoad = parseRoadmap('content/roadmap.md', 'g', JAVA_KEYS)
const java = {
  phases: javaRoad.phases,
  questions: attach(javaRoad.base, loadProblems('content/problems'), { defsMap: JAVA_DEFS, starter: makeJavaStarter }),
  antiPatterns: javaRoad.antiPatterns, antiMatrix: javaRoad.antiMatrix, scenarios: javaRoad.scenarios, scenarioMatrix: javaRoad.scenarioMatrix,
  projects: loadProjects('content/projects/java.md'),
}

const rustRoad = parseRoadmap('content/rust/roadmap.md', 'm')
const rustProblems = fs.existsSync('content/rust/problems') ? loadProblems('content/rust/problems') : []
const javaByN = new Map(java.questions.map((q) => [q.n, q]))
const rust = {
  phases: rustRoad.phases,
  questions: attach(javaRoad.base, rustProblems, { defsMap: RUST_DEFS, starter: makeRustStarter, fallback: javaByN, shortTarget: true }),
  antiPatterns: rustRoad.antiPatterns, antiMatrix: rustRoad.antiMatrix, scenarios: rustRoad.scenarios, scenarioMatrix: rustRoad.scenarioMatrix,
  projects: loadProjects('content/rust/projects.md'),
}

// PostgreSQL: roadmap only for now (module tests live in src/lib/tests.ts); Parts 2-4 and projects fill in when their files exist.
const pgRoad = parseRoadmap('content/postgres/roadmap.md', 'p')
const postgres = {
  phases: pgRoad.phases, questions: [],
  antiPatterns: pgRoad.antiPatterns, antiMatrix: pgRoad.antiMatrix, scenarios: pgRoad.scenarios, scenarioMatrix: pgRoad.scenarioMatrix,
  projects: loadProjects('content/postgres/projects.md'),
}

fs.writeFileSync('src/content.json', JSON.stringify({ java, rust, postgres }))
// Hands-on exercises placed between roadmap sections (Java for now): src/exercises.json = { java: [...] }
const exercises = { java: loadExercises('content/exercises/java') }
fs.writeFileSync('src/exercises.json', JSON.stringify(exercises))
console.log('exercises: java=' + exercises.java.length)
const sum = (c) => `phases=${c.phases.length} sections=${c.phases.reduce((s, p) => s + p.sections.length, 0)} questions=${c.questions.length} antiPatterns=${c.antiPatterns.length}+${c.antiMatrix.length} scenarios=${c.scenarios.length}+${c.scenarioMatrix.length} projects=${c.projects.length}`
console.log('java: ' + sum(java))
console.log('rust: ' + sum(rust))
console.log('postgres: ' + sum(postgres))
