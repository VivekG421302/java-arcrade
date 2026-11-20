// Compiles (language level 17 is not enforced here, keep to Java 17 features: the in-app compiler is Java 17) and runs every exercise's solution and starter, and checks them with the app's matcher.
// The solution must solve it; the untouched starter must compile, finish in time and NOT count as solved.
// Usage: node scripts/verify-exercises.mjs [exercise id...]
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isSolved } from '../src/lib/solved.ts'
import { loadExercises } from './exercises.mjs'

const run = promisify(execFile)
const only = process.argv.slice(2)
const list = loadExercises('content/exercises/java').filter((e) => !only.length || only.includes(e.id))
const root = '/tmp/ve'
fs.rmSync(root, { recursive: true, force: true })

async function exec(id, kind, src) {
  const dir = path.join(root, `${id}-${kind}`)
  fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(path.join(dir, 'Main.java'), src)
  try { await run('java', ['-m', 'jdk.compiler/com.sun.tools.javac.Main', '-d', dir, path.join(dir, 'Main.java')], { timeout: 60000 }) }
  catch (e) { return { stdout: '', status: 'Compilation Error', err: String(e.stderr || e.message).slice(0, 400) } }
  try {
    const { stdout } = await run('java', ['-cp', dir, 'Main'], { timeout: 15000 })
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
  if (!okSol) console.log('   got:', JSON.stringify(sol.stdout.slice(0, 300)), sol.err ?? '')
}
console.log(bad ? `${bad} problem(s)` : `all ${list.length} exercises verified`)
process.exit(bad ? 1 : 0)
