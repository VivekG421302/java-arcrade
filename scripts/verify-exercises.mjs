// Compiles (language level 17 is not enforced here, keep to Java 17 features: the in-app compiler is Java 17) and runs every exercise's solution and starter, and checks them with the app's matcher.
// The solution must solve it; the untouched starter must compile, finish in time and NOT count as solved.
// Usage: node --experimental-strip-types scripts/verify-exercises.mjs [java|rust] [exercise id...]   (Rust is compiled as edition 2015, like a plain `rustc main.rs`)
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isSolved } from '../src/lib/solved.ts'
import { loadExercises } from './exercises.mjs'

const run = promisify(execFile)
const args = process.argv.slice(2)
const lang = ['java', 'rust'].includes(args[0]) ? args.shift() : 'java'
const only = args
const list = loadExercises(`content/exercises/${lang}`).filter((e) => !only.length || only.includes(e.id))
const root = `/tmp/ve-${lang}`
fs.rmSync(root, { recursive: true, force: true })

async function exec(id, kind, src) {
  const dir = path.join(root, `${id}-${kind}`)
  fs.mkdirSync(dir, { recursive: true })
  const file = path.join(dir, lang === 'java' ? 'Main.java' : 'main.rs')
  fs.writeFileSync(file, src)
  try {
    if (lang === 'java') await run('java', ['-m', 'jdk.compiler/com.sun.tools.javac.Main', '-d', dir, file], { timeout: 60000 })
    else await run('rustc', ['--edition', '2015', '-A', 'warnings', '-o', path.join(dir, 'main'), file], { timeout: 120000 })
  } catch (e) { return { stdout: '', status: 'Compilation Error', err: String(e.stderr || e.message).slice(0, 600) } }
  try {
    const { stdout } = lang === 'java' ? await run('java', ['-cp', dir, 'Main'], { timeout: 15000 }) : await run(path.join(dir, 'main'), [], { timeout: 15000 })
    return { stdout, status: 'Accepted' }
  } catch (e) { return { stdout: e.stdout ?? '', status: e.killed ? 'Time Limit' : 'Runtime Error', err: String(e.stderr || e.message).slice(0, 400) } }
}

let bad = 0
for (const e of list) {
  const sol = await exec(e.id, 'solution', e.solution)
  const st = await exec(e.id, 'starter', e.starter)
  const okSol = isSolved(e, e.solution, sol)
  const okStarter = st.status !== 'Compilation Error' && st.status !== 'Time Limit' && !isSolved(e, e.starter, st)
  if (!okSol || !okStarter) bad++
  console.log(`${okSol && okStarter ? 'OK  ' : 'FAIL'} ${e.id}  solution:${okSol ? 'solves' : 'DOES NOT SOLVE'}  starter:${st.status === 'Compilation Error' ? 'DOES NOT COMPILE' : st.status === 'Time Limit' ? 'HANGS' : okStarter ? `compiles, not solved (${st.status})` : 'ALREADY SOLVED'}`)
  if (!okSol || st.status === 'Compilation Error') console.log('   got:', st.status === 'Compilation Error' ? st.err : '', JSON.stringify(sol.stdout.slice(0, 300)), sol.err ?? '')
}
console.log(bad ? `${bad} problem(s)` : `all ${list.length} exercises verified`)
process.exit(bad ? 1 : 0)
