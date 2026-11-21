// Compiles (language level 17 is not enforced here, keep to Java 17 features: the in-app compiler is Java 17) and runs every exercise's solution and starter, and checks them with the app's matcher.
// The solution must solve it; the untouched starter must compile, finish in time and NOT count as solved.
// Usage: node --experimental-strip-types scripts/verify-exercises.mjs [java|rust|sql] [exercise id...]   (Rust is compiled as edition 2015; SQL runs on a real PGlite through the app's own engine)
import fs from 'node:fs'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { isSolved } from '../src/lib/solved.ts'
import { loadExercises } from './exercises.mjs'

const run = promisify(execFile)
const args = process.argv.slice(2)
const lang = ['java', 'rust', 'sql'].includes(args[0]) ? args.shift() : 'java'
const only = args
const list = loadExercises(`content/exercises/${lang === 'sql' ? 'postgres' : lang}`).filter((e) => !only.length || only.includes(e.id))
const root = `/tmp/ve-${lang}`
fs.rmSync(root, { recursive: true, force: true })

let sqlDb = null
async function execSql(src) {
  if (!sqlDb) { const { PGlite } = await import('@electric-sql/pglite'); sqlDb = new PGlite(); await sqlDb.waitReady }
  const { resetDb, runScript } = await import('../src/lib/sql/engine.ts')
  await resetDb(sqlDb)
  const r = await runScript(sqlDb, src)
  return { stdout: r.stdout, status: r.failed ? 'Completed with errors' : 'Accepted', err: r.stderr }
}

async function exec(id, kind, src) {
  if (lang === 'sql') return execSql(src)
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
  const okStarter = lang === 'sql' ? st.status === 'Accepted' && !isSolved(e, e.starter, st) : st.status !== 'Compilation Error' && st.status !== 'Time Limit' && !isSolved(e, e.starter, st)
  if (!okSol || !okStarter) bad++
  console.log(`${okSol && okStarter ? 'OK  ' : 'FAIL'} ${e.id}  solution:${okSol ? 'solves' : 'DOES NOT SOLVE'}  starter:${st.status === 'Compilation Error' ? 'DOES NOT COMPILE' : st.status === 'Time Limit' ? 'HANGS' : okStarter ? `compiles, not solved (${st.status})` : st.status !== 'Accepted' && lang === 'sql' ? 'STARTER HAS ERRORS' : 'ALREADY SOLVED'}`)
  if (!okSol || st.status === 'Compilation Error' || (lang === 'sql' && st.status !== 'Accepted')) console.log('   got:', st.status === 'Compilation Error' || lang === 'sql' ? st.err : '', JSON.stringify(sol.stdout.slice(0, 300)), sol.err ?? '')
}
console.log(bad ? `${bad} problem(s)` : `all ${list.length} exercises verified`)
process.exit(bad ? 1 : 0)
