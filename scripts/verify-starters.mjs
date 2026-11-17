// For every problem with generated test calls: splice the reference solution into the starter, compile, run, and check the output
// with the same matcher the app uses (src/lib/solved.ts). Also runs the untouched starter, which must NOT count as solved.
// Usage: node scripts/verify-starters.mjs [java|rust] [problem numbers...]   (needs a JDK compiler module / rustc)
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isSolved } from '../src/lib/solved.ts'

const run = promisify(execFile)
const [lang = 'java', ...only] = process.argv.slice(2)
const content = JSON.parse(fs.readFileSync('src/content.json', 'utf8'))[lang]
const qs = content.questions.filter((q) => q.expect?.length && (!only.length || only.includes(String(q.n))))
const root = `/tmp/vs-${lang}`
fs.rmSync(root, { recursive: true, force: true })

/** Source with the reference solution in place of the starter's stub. */
function withSolution(q) {
  const s = q.starter
  if (lang === 'java') {
    const head = s.slice(0, s.indexOf('class Solution'))
    const main = s.slice(s.indexOf('public class Main'))
    return `${head}${q.code.split('\n').filter((l) => !l.startsWith('import ')).join('\n')}\n\n${main}`
  }
  // rust: keep the starter's `use`/given types, swap the stub struct + impl for the reference solution, keep fn main and the helpers
  const head = s.slice(0, s.indexOf('struct Solution'))
  return `${head}${q.code}\n\n${s.slice(s.indexOf('fn main()'))}`
}

async function exec(n, kind, src) {
  const dir = path.join(root, `${n}-${kind}`)
  fs.mkdirSync(dir, { recursive: true })
  try {
    if (lang === 'java') {
      fs.writeFileSync(path.join(dir, 'Main.java'), src)
      await run('java', ['-m', 'jdk.compiler/com.sun.tools.javac.Main', '-d', dir, path.join(dir, 'Main.java')], { timeout: 60000 })   // same as javac, works with a JRE that ships the compiler module
      const { stdout } = await run('java', ['-cp', dir, 'Main'], { timeout: 30000 })
      return { ok: true, stdout }
    }
    fs.writeFileSync(path.join(dir, 'main.rs'), src)
    await run('rustc', ['--edition', '2018', '-A', 'warnings', '-o', path.join(dir, 'main'), path.join(dir, 'main.rs')], { timeout: 120000 })
    const { stdout } = await run(path.join(dir, 'main'), [], { timeout: 30000 })
    return { ok: true, stdout }
  } catch (e) {
    return { ok: false, err: String(e.stderr || e.message).split('\n').slice(0, 8).join('\n'), stdout: e.stdout || '' }
  }
}

const fails = [], falsePos = [], compileFails = []
let next = 0
async function worker() {
  while (next < qs.length) {
    const q = qs[next++]
    const sol = await exec(q.n, 'sol', withSolution(q))
    if (!sol.ok) { compileFails.push(`#${q.n} ${q.title}\n${sol.err}`); continue }
    if (!isSolved(q, q.code, { stdout: sol.stdout, status: 'Accepted' })) fails.push(`#${q.n} ${q.title}\n  expect: ${JSON.stringify(q.expect)}\n  got:    ${JSON.stringify(sol.stdout)}`)
    const stub = await exec(q.n, 'stub', q.starter)
    if (stub.ok && isSolved(q, q.starter, { stdout: stub.stdout, status: 'Accepted' })) falsePos.push(`#${q.n} ${q.title}: the untouched starter counts as solved`)
    if (!stub.ok && lang === 'java' && /error:/.test(stub.err)) compileFails.push(`#${q.n} ${q.title} (starter itself does not compile)\n${stub.err}`)
  }
}
await Promise.all(Array.from({ length: 4 }, worker))
console.log(`${lang}: checked ${qs.length} problems`)
console.log(`compile failures: ${compileFails.length}`); compileFails.forEach((x) => console.log(' ', x))
console.log(`output not matched: ${fails.length}`); fails.forEach((x) => console.log(' ', x))
console.log(`false positives on the starter: ${falsePos.length}`); falsePos.forEach((x) => console.log(' ', x))
process.exit(compileFails.length || fails.length ? 1 : 0)
