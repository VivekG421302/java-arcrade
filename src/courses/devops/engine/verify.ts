// Headless walkthrough of Stage 1 (run via scripts/verify-devops.mjs). Types every lab and chaos command from the curriculum data
// into the real Simulator and asserts the Tracker advances, so content and engine can never silently drift apart.
import { PLAYGROUND_STAGE1, STAGE_1 } from '../data/stage1'
import { deriveBadges } from './badges'
import { Simulator } from './session'
import { keyChoices, sftpConnect, sftpRename, sftpTransfer } from './sftpGui'
import { sqlBridge } from './shellTypes'
import { Tracker } from './tracker'

const store = new Map<string, string>()
;(globalThis as unknown as { localStorage: Storage }).localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => void store.set(k, v), removeItem: (k) => void store.delete(k), clear: () => store.clear(), key: () => null, length: 0 }

let failures = 0, checks = 0
const ok = (cond: boolean, msg: string, ctx?: () => string) => { checks++; if (!cond) { failures++; console.error(`✗ ${msg}${ctx ? '\n' + ctx() : ''}`) } }

const sim = new Simulator(PLAYGROUND_STAGE1)
const tr = new Tracker(STAGE_1, sim)
const tabText = (id: number, n = 14) => sim.tab(id)!.lines.slice(-n).map((l) => (l.t === 'cmd' ? `${l.prompt}${l.s}` : l.s)).join('\n')
const where = () => { const c = tr.current(); return c ? `   at ${c.ref.id} step ${c.index + 1}/${c.total}: ${c.step.instruction}\n   last output:\n${tabText(sim.current.shell.id)}` : '   (no active step)' }

async function typeIn(id: number, line: string, expectAdvance = true) {
  const before = tr.current(); const idx = before?.index
  await sim.run(id, line)
  if (sim.tab(id)?.hold) sim.interrupt(id)
  if (expectAdvance && before) {
    const after = tr.current()
    const advanced = !after || after.ref.id !== before.ref.id || after.index > idx!
    ok(advanced, `"${line}" should complete ${before.ref.id} step ${idx! + 1}`, where)
  }
}

const T1 = sim.current.shell.id

// ---------- Lab 1.1
await typeIn(T1, 'mvn clean package')
await typeIn(T1, 'ls -lh target/*.jar')
ok(tr.labDone('lab-1-1'), 'lab 1.1 done')
ok(/40M/.test(tabText(T1)) , 'ls -lh shows 40M')

// ---------- Lab 1.2 (GUI + CLI)
const key = keyChoices(sim.world)[0]
sim.mutate('[filezilla] connect without key', (w) => { ok(!sftpConnect(w, { host: '203.0.113.10', user: 'ubuntu', port: 22, key: '' }).ok, 'FileZilla without key must fail') })
ok(tr.current()?.index === 0, 'failed connect must not advance')
sim.mutate('[filezilla] connect', (w) => { ok(sftpConnect(w, { host: 'sftp://203.0.113.10', user: 'ubuntu', port: 22, key }).ok, 'FileZilla with key connects') })
ok(tr.current()?.index === 1, 'connect advances lab 1.2 to step 2', where)
sim.mutate('[filezilla] upload', (w) => { sftpTransfer(w, 'up', '/home/learner/shop-app/target/shop-app-1.0.0.jar', '/opt/myapp') })
sim.mutate('[filezilla] rename', (w) => { sftpRename(w, 'remote', '/opt/myapp/shop-app-1.0.0.jar', 'app.jar') })
ok(tr.current()?.index === 3, 'upload+rename reach the scp step', where)
await typeIn(T1, 'scp target/shop-app-1.0.0.jar ubuntu@203.0.113.10:/opt/myapp/app.jar', false)
ok(/Permission denied \(publickey\)/.test(tabText(T1)), 'scp without -i is refused')
await typeIn(T1, 'scp -i ~/.ssh/deploy.pem target/shop-app-1.0.0.jar ubuntu@203.0.113.10:/opt/myapp/app.jar')
await typeIn(T1, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10 "ls -lh /opt/myapp/app.jar"')
ok(tr.labDone('lab-1-2'), 'lab 1.2 done', where)

// ---------- Lab 1.3
await typeIn(T1, 'ssh ubuntu@203.0.113.10', false)
ok(sim.tab(T1)!.shell.ssh === null, 'ssh without key must not log in')
for (const s of STAGE_1.labs[2].steps) await typeIn(T1, s.command!)
ok(tr.labDone('lab-1-3'), 'lab 1.3 done', where)
ok(sim.world.state.packages.postgresql && sim.world.state.packages.java17, 'java and postgresql installed')

// ---------- Lab 1.4 (psql REPL + password prompt)
for (const s of STAGE_1.labs[3].steps.slice(0, 5)) await typeIn(T1, s.command!)
ok(sim.tab(T1)!.shell.repl === null, 'left psql')
await typeIn(T1, 'psql -h localhost -U shopuser -d shopdb -c "SELECT 1;"', false)
ok(sim.tab(T1)!.secret, 'psql asks for a password')
await typeIn(T1, 'wrong-password', false)
ok(/password authentication failed/.test(tabText(T1)), 'wrong password is rejected')
await typeIn(T1, 'psql -h localhost -U shopuser -d shopdb -c "SELECT 1;"', false)
await typeIn(T1, 'ShopPass123!')
ok(tr.labDone('lab-1-4'), 'lab 1.4 done', where)

// ---------- Lab 1.5 (naive run, then a laptop tab)
await typeIn(T1, 'cd /opt/myapp && java -jar app.jar &')
ok(/Tomcat started on port 8080 \(http\) with context path '\/'/.test(tabText(T1, 30)), 'Tomcat started line')
ok(/\[1\] 2142/.test(tabText(T1, 30)), 'job notice [1] 2142')
await typeIn(T1, 'curl http://localhost:8080/api/health')
await typeIn(T1, 'ss -tlnp | grep 8080')
const T2 = sim.addTab()!
await typeIn(T2, 'curl http://203.0.113.10:8080/api/orders')
ok(tr.labDone('lab-1-5'), 'lab 1.5 done', where)
let b = deriveBadges(sim.world)
ok(b.app === 'RUNNING' && b.db === 'RUNNING', 'badges RUNNING when deployed')

// ---------- Lab 1.6
await typeIn(T1, "pkill -f 'java -jar app.jar'")
b = deriveBadges(sim.world)
ok(b.app === 'CRASHED', 'app badge CRASHED after pkill')
await typeIn(T1, 'nohup java -jar app.jar > app.log 2>&1 &')
ok(/\[1\] 2317/.test(tabText(T1, 6)), 'job notice [1] 2317')
await typeIn(T1, 'tail -f app.log', true)
await typeIn(T1, 'ps aux | grep java')
ok(tr.labDone('lab-1-6'), 'lab 1.6 done', where)
ok(sim.world.fs.remote['/opt/myapp/app.log'].content!.includes('nohup: ignoring input'), 'app.log starts with the nohup line')
await typeIn(T1, 'ss -tlnp')            // gate check: both ports
ok(tr.p.gate['gate-ss-both-ports'] === true, 'gate: ss shows 8080 and 5432')

// the survival property of lab 1.6: exit + reconnect keeps the nohup app alive
await typeIn(T1, 'exit', false)
ok(sim.world.state.processes.appPid !== null, 'nohup app survives exit')
await typeIn(T1, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', false)

// ---------- chaos labs
for (const inc of STAGE_1.chaosLabs) {
  tr.inject(inc.id)
  const t = sim.current.shell.id
  const steps = [...inc.diagnosticTrail, ...inc.exactFix]
  if (inc.id === 'chaos-1-1') { b = deriveBadges(sim.world); ok(b.app === 'CRASHED', 'chaos 1.1 shows CRASHED', () => JSON.stringify(b)); ok(sim.world.remoteHistory.some((h) => h.includes('java -jar app.jar &')), 'history has naive start') }
  if (inc.id === 'chaos-1-2') ok(sim.world.state.listeners['8080'] === 2142, 'zombie owns 8080 as pid 2142')
  if (inc.id === 'chaos-1-3') { b = deriveBadges(sim.world); ok(b.db === 'DB_CONN_REFUSED' && b.app === 'DB_CONN_REFUSED', 'chaos 1.3 shows DB_CONN_REFUSED', () => JSON.stringify(b)) }
  if (inc.id === 'chaos-1-4') ok(sim.world.fs.local['/home/learner/.ssh/deploy.pem'].mode === '644', 'pem is 644')
  // make sure we are on the right machine for each scenario
  const needRemote = inc.id !== 'chaos-1-4' && inc.id !== 'chaos-1-1'
  if (needRemote && !sim.tab(t)!.shell.ssh) await sim.run(t, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
  if (inc.id === 'chaos-1-4' && sim.tab(t)!.shell.ssh) { const lt = sim.addTab()!; sim.selectTab(sim.tabs.length - 1); void lt }
  const tab = sim.current.shell.id
  for (let i = 0; i < steps.length; i++) {
    let line = steps[i].command!
    if (inc.id === 'chaos-1-3' && line.startsWith('sudo nano')) {
      await sim.run(tab, line)
      const e = sim.tab(tab)!.edit
      ok(!!e && e.sudo, 'sudo nano opens the editor')
      const content = sim.world.fs.remote[e!.path].content!.replace("listen_addresses = ''", "listen_addresses = 'localhost'")
      sim.saveEditor(tab, content)
      ok(tr.current()?.index === i + 1, 'editing postgresql.conf advances', where)
      ok(sim.world.state.listeners['5432'] === null, 'editing alone does NOT reopen door 5432 (needs restart)')
      continue
    }
    if (inc.id === 'chaos-1-1' && i === 0) { await typeIn(tab, steps[0].command!); continue }
    if (inc.id === 'chaos-1-1' && line === 'exit') { await typeIn(tab, 'exit', false); await typeIn(tab, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10'); continue }
    await typeIn(tab, line, false)
    const cur = tr.current()
    ok(!cur || cur.ref.id !== inc.id || cur.index > i, `${inc.id} step ${i + 1} (${line}) should advance`, where)
  }
  ok(tr.chaosDone(inc.id), `${inc.id} done`, where)
}
b = deriveBadges(sim.world)
ok(b.laptop === 'RUNNING', 'laptop badge')

// the hangup lesson end-to-end: a naive app does NOT survive exit
{
  const t = sim.addTab()!
  await sim.run(t, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
  await sim.run(t, 'pkill -f "java -jar app.jar"')
  await sim.run(t, 'cd /opt/myapp && java -jar app.jar &')
  ok(sim.world.state.processes.appManagedBy === 'none', 'naive app is not nohup')
  await sim.run(t, 'exit')
  ok(sim.world.state.processes.appPid === null, 'naive app dies on exit (SIGHUP)')
  await sim.run(t, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
  await sim.run(t, 'cd /opt/myapp && java -jar app.jar &')
  await sim.run(t, 'cd /opt/myapp && java -jar app.jar')
  ok(/Port 8080 was already in use/.test(tabText(t, 40)) && /BindException/.test(tabText(t, 40)), 'second start hits BindException')
}

// ---------- shell behaviours
{
  const t = sim.current.shell.id
  const out = async (l: string) => { await sim.run(t, l); return tabText(t, 8) }
  ok(/command not found|not found/.test(await out('foo')), 'unknown command')
  ok(/unlocks in Stage 4/.test(await out('docker ps')), 'docker is locked until stage 4')
  ok(/Permission denied/.test(await out('echo hi > /etc/hostname')), 'redirect into /etc needs permission')
  ok(/Interactive authentication required/.test(await out('systemctl restart postgresql')), 'systemctl without sudo')
  ok(/lock file/.test(await out('apt install -y curl')), 'apt without sudo')
}

// ---------- psql through the shared SQL bridge (fake PGlite output with the marker the real engine would print)
sqlBridge.run = async (sql) => ({ stdout: sql.includes('@@START@@') ? 'CREATE TABLE\nINSERT 0 3\n     m\n-----------\n @@START@@\n(1 row)\n\n id | customer\n----+----------\n  1 | Asha\n(1 row)\n\n' : '', stderr: '' })
{
  const t = sim.current.shell.id
  await sim.run(t, 'sudo -u postgres psql -d shopdb -c "SELECT * FROM orders;"')
  const text = tabText(t, 6)
  ok(text.includes('Asha') && !text.includes('@@START@@') && !text.includes('INSERT 0 3'), 'bridge strips the seed', () => text)
}

// ---------- quiz + stage completion
ok(!tr.isComplete(), 'stage is not complete before the quiz')
const wrong = tr.submitQuiz([0, 0, 0, 0, 0])
ok(!wrong.passed, 'wrong quiz answers fail')
const right = tr.submitQuiz(STAGE_1.unlockGate.quiz.questions.map((q) => q.answerIndex))
ok(right.passed, 'right answers pass')
ok(tr.isComplete() && tr.p.stageComplete, 'stage complete after everything', () => JSON.stringify(tr.gateItems().filter((i) => !i.done)))

console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `All ${checks} checks passed ✓`)
if (failures) throw new Error(`${failures} verification check(s) failed`)
