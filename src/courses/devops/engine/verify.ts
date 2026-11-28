// Headless walkthrough of Stage 1 (run via scripts/verify-devops.mjs). Types every lab and chaos command from the curriculum data
// into the real Simulator and asserts the Tracker advances, so content and engine can never silently drift apart.
import { PLAYGROUND_STAGE1, STAGE_1 } from '../data/stage1'
import { PLAYGROUND_STAGE2, STAGE_2 } from '../data/stage2'
import { enterStage2, ENV_FILE, SITE_FILE, UNIT_FILE } from './stage2world'
import { deriveBadges } from './badges'
import { Simulator } from './session'
import { keyChoices, sftpConnect, sftpRename, sftpTransfer } from './sftpGui'
import { sqlBridge, stripAnsi } from './shellTypes'
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


// =====================================================================================================================
// STAGE 2
// =====================================================================================================================
const sim2 = new Simulator(PLAYGROUND_STAGE2, { stage: 2, key: 'devops:v1:sim:stage-2', init: enterStage2 })
const tr2 = new Tracker(STAGE_2, sim2)
const text2 = (id: number, n = 14) => stripAnsi(sim2.tab(id)!.lines.slice(-n).map((l) => (l.t === 'cmd' ? `${l.prompt}${l.s}` : l.s)).join('\n'))
const where2 = () => { const c = tr2.current(); return c ? `   at ${c.ref.id} step ${c.index + 1}/${c.total}: ${c.step.instruction}\n   last output:\n${text2(sim2.current.shell.id, 18)}` : '   (no active step)' }
async function go(id: number, line: string, expectAdvance = true) {
  const before = tr2.current(); const idx = before?.index
  await sim2.run(id, line)
  if (sim2.tab(id)?.hold) sim2.interrupt(id)
  if (expectAdvance && before) { const after = tr2.current(); ok(!after || after.ref.id !== before.ref.id || after.index > idx!, `[s2] "${line}" should complete ${before.ref.id} step ${idx! + 1}`, where2) }
}
async function editFile(id: number, cmd: string, content: string, expectAdvance = true) {
  const before = tr2.current(); const idx = before?.index
  await sim2.run(id, cmd)
  const e = sim2.tab(id)!.edit
  ok(!!e, `[s2] ${cmd} opens the editor`)
  const r = sim2.saveEditor(id, content)
  ok(r.ok, `[s2] saving ${e?.path} works`, () => r.msg)
  sim2.closeEditor(id)
  if (expectAdvance && before) { const after = tr2.current(); ok(!after || after.ref.id !== before.ref.id || after.index > idx!, `[s2] editing via "${cmd}" should complete ${before.ref.id} step ${idx! + 1}`, where2) }
}

ok(tr.p.stageComplete, 'stage 1 complete (prerequisite for stage 2)')
ok(sim2.world.state.stage === 2 && !sim2.world.state.processes.appPid, 'stage 2 world starts with nothing running')
const S1 = sim2.current.shell.id

// ---------- Lab 2.1
await go(S1, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
await sim2.run(S1, 'sudo nano /etc/springboot.env'); { const r = sim2.saveEditor(S1, 'DB_URL=x\n'); ok(r.ok, 'editor saves'); sim2.closeEditor(S1) }
ok(tr2.current()?.index === 1, 'a 1-line env file does not satisfy the 3-key step', where2)
await editFile(S1, 'sudo nano /etc/springboot.env', ENV_FILE, false)
ok(tr2.current()?.index === 2, 'env file with 3 keys advances', where2)
await go(S1, 'sudo chmod 600 /etc/springboot.env')
await sim2.run(S1, 'systemctl status springboot'); ok(/could not be found/.test(text2(S1)), 'no unit before the file exists')
await editFile(S1, 'sudo nano /etc/systemd/system/springboot.service', UNIT_FILE)
await go(S1, 'sudo systemctl daemon-reload')
await go(S1, 'sudo systemctl enable --now springboot')
ok(/Created symlink/.test(text2(S1, 8)), 'enable prints Created symlink')
await go(S1, 'systemctl status springboot')
let b2 = deriveBadges(sim2.world)
ok(b2.systemd === 'RUNNING' && b2.app === 'RUNNING', 'systemd and app badges RUNNING', () => JSON.stringify(b2))
ok(sim2.world.state.processes.appManagedBy === 'systemd' && sim2.world.state.systemd.springbootService === 'enabled-running', 'state: managed by systemd')
await sim2.run(S1, 'ps aux | grep java'); ok(/\/usr\/bin\/java -jar \/opt\/myapp\/app\.jar/.test(text2(S1, 6)), 'ps shows the systemd ExecStart')
// reboot
await go(S1, 'sudo reboot')
ok(sim2.tab(S1)!.shell.ssh === null, 'reboot hangs up the SSH session')
ok(/closed by remote host/.test(text2(S1, 6)), 'reboot prints the closed-by-remote-host line')
ok(sim2.world.state.processes.appPid !== null && sim2.world.state.processes.appManagedBy === 'systemd', 'the enabled service came back by itself after reboot')
await go(S1, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', false)
ok(sim2.tab(S1)!.shell.ssh === null && /Connection refused/.test(text2(S1, 6)), 'ssh is refused while the server is still booting')
await go(S1, 'sleep 20', false)
await go(S1, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
await go(S1, 'curl localhost:8080/api/health')
await go(S1, 'journalctl -u springboot -f')
ok(tr2.labDone('lab-2-1'), 'lab 2.1 done', where2)
ok((sim2.world.x.sd.journal.springboot ?? []).some((l) => /Started Shop Spring Boot App/.test(l)), 'journal has the start line')

// ---------- systemd behaviours: SIGTERM is a clean stop, SIGKILL is a crash that gets restarted
{
  const pid = () => sim2.world.state.processes.appPid
  const p1 = pid()!
  await sim2.run(S1, `sudo kill -9 ${p1}`)
  ok(pid() === null && sim2.world.x.sd.units.springboot.active === 'activating', 'kill -9 crashes the service, systemd schedules a restart', () => JSON.stringify(sim2.world.x.sd.units.springboot))
  await sim2.run(S1, 'sleep 6')
  ok(pid() !== null && pid() !== p1, 'systemd restarted the killed service')
  await sim2.run(S1, `sudo kill ${pid()}`)
  ok(pid() === null && sim2.world.x.sd.units.springboot.active === 'inactive', 'SIGTERM (143) is a clean stop: no restart loop')
  await sim2.run(S1, 'sudo systemctl start springboot')
  ok(pid() !== null, 'start brings it back')
  await sim2.run(S1, 'systemctl restart springboot'); ok(/Interactive authentication required/.test(text2(S1, 4)), 'systemctl restart needs sudo')
  await sim2.run(S1, 'journalctl -u nosuch'); ok(/No entries/.test(text2(S1, 2)), 'journalctl for an unknown unit says no entries')
}

// ---------- Lab 2.2
await go(S1, 'sudo apt install -y nginx')
await go(S1, 'curl http://203.0.113.10')
ok(sim2.world.state.listeners['80'] !== null, 'nginx listens on 80')
await editFile(S1, 'sudo nano /etc/nginx/sites-available/shop', SITE_FILE)
{
  // the lesson behind `rm sites-enabled/default`: a visitor typing the bare IP matches no server_name, so the default site answers
  sim2.world.fs.remote['/etc/nginx/sites-enabled/shop'] = { type: 'file', mode: '777', owner: 'root', size: 0, mtime: sim2.world.clock, link: '/etc/nginx/sites-available/shop' }
  await sim2.run(S1, 'sudo systemctl reload nginx')
  await sim2.run(S1, 'curl http://203.0.113.10/api/health'); ok(/404 Not Found/.test(text2(S1, 8)), 'with the default site enabled it wins for a bare-IP visitor (404, not the app)', () => text2(S1, 8))
  delete sim2.world.fs.remote['/etc/nginx/sites-enabled/shop']
  await sim2.run(S1, 'sudo systemctl reload nginx')
}
await go(S1, 'sudo rm /etc/nginx/sites-enabled/default')
await go(S1, 'sudo ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/')
await sim2.run(S1, 'ls -l /etc/nginx/sites-enabled'); ok(/shop -> \/etc\/nginx\/sites-available\/shop/.test(text2(S1, 4)), 'ls -l shows the symlink')
await sim2.run(S1, 'nginx -t'); ok(/Permission denied/.test(text2(S1, 6)), 'nginx -t without sudo is refused')
// a broken file is caught with a line number, and reload keeps the old config
{
  const good = sim2.world.fs.remote['/etc/nginx/sites-available/shop'].content!
  sim2.world.fs.remote['/etc/nginx/sites-available/shop'].content = good.replace('proxy_pass http://127.0.0.1:8080;', 'proxy_pass http://127.0.0.1:8080')
  await sim2.run(S1, 'sudo nginx -t'); ok(/\[emerg\].* in \/etc\/nginx\/sites-enabled\/shop:\d+/.test(text2(S1, 6)), 'nginx -t reports the broken line', () => text2(S1, 6))
  await sim2.run(S1, 'sudo systemctl reload nginx'); ok(/Job for nginx\.service failed/.test(text2(S1, 6)), 'reload of a broken config fails')
  ok(sim2.world.state.listeners['80'] !== null, 'the old working config keeps serving after a failed reload')
  sim2.world.fs.remote['/etc/nginx/sites-available/shop'].content = good
}
await go(S1, 'sudo nginx -t')
await go(S1, 'sudo systemctl reload nginx')
const W2 = sim2.addTab()!
await go(W2, 'curl http://203.0.113.10/api/health')
await go(S1, 'sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d shop.example.com')
ok(sim2.world.state.listeners['443'] !== null, 'nginx now listens on 443')
await go(W2, 'curl -I https://shop.example.com')
ok(tr2.labDone('lab-2-2'), 'lab 2.2 done', where2)
await sim2.run(W2, 'curl -I https://203.0.113.10/api/health'); ok(/certificate subject name/.test(text2(W2, 4)), 'a certificate for a domain does not match the bare IP')
await sim2.run(W2, 'curl -I http://localhost'); ok(/refused/.test(text2(W2, 4)), 'localhost on the laptop is the laptop')

// ---------- Lab 2.3
await go(S1, 'sudo ufw allow 22,80,443/tcp')
await go(S1, 'sudo ufw enable')
await go(S1, 'sudo ufw status numbered')
ok(/\[ 1\] 22\/tcp/.test(text2(S1, 12)), 'ufw status numbered shows rule 1')
await go(W2, 'curl http://203.0.113.10:8080/api/health')
ok(tr2.labDone('lab-2-3'), 'lab 2.3 done', where2)
await go(W2, 'curl https://shop.example.com/api/health', false)
ok(tr2.p.gate['gate-front-desk'] === true, 'gate: front desk answers through nginx', () => text2(W2, 6))
ok(tr2.p.gate['gate-door-8080'] === true, 'gate: port 8080 times out from outside')
b2 = deriveBadges(sim2.world)
ok(b2.nginx === 'RUNNING' && b2.systemd === 'RUNNING' && b2.db === 'RUNNING', 'all-green topology after the labs', () => JSON.stringify(b2))
await sim2.run(W2, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10'); ok(sim2.tab(W2)!.shell.ssh !== null, 'ssh (door 22) still works with the firewall on')
await sim2.run(W2, 'exit')

// ---------- chaos 2.1: wrong upstream -> 502
tr2.inject('chaos-2-1')
b2 = deriveBadges(sim2.world)
ok(b2.nginx === '502_BAD_GATEWAY' && b2.app === 'RUNNING', 'chaos 2.1 shows 502 on nginx while the app is fine', () => JSON.stringify(b2))
{
  const inc = STAGE_2.chaosLabs[0]; const steps = [...inc.diagnosticTrail, ...inc.exactFix]
  for (let i = 0; i < steps.length; i++) {
    if (inc.id === 'chaos-2-1' && i === 3) { const f = sim2.world.fs.remote['/etc/nginx/sites-available/shop'].content!; await editFile(S1, 'sudo nano /etc/nginx/sites-available/shop', f.replace(':8088', ':8080')); ok(sim2.world.state.listeners['80'] !== null, 'still serving'); continue }
    await go(S1, steps[i].command!, false)
    const cur = tr2.current(); ok(!cur || cur.ref.id !== inc.id || cur.index > i, `[s2] chaos-2-1 step ${i + 1} (${steps[i].command}) should advance`, where2)
  }
  ok(tr2.chaosDone('chaos-2-1'), 'chaos 2.1 done', where2)
}

// ---------- chaos 2.2: firewall lockout, rescue console
tr2.inject('chaos-2-2')
ok(sim2.tabs.every((t) => !t.shell.ssh), 'lockout drops every ssh session')
{
  const L = sim2.current.shell.id
  await go(L, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
  const b = deriveBadges(sim2.world); ok(b.app === 'RUNNING' && sim2.world.state.processes.appManagedBy === 'systemd', 'the service survived the lockout (systemd, not a login session)')
  const R = sim2.openRescue()!
  ok(sim2.tab(R)!.shell.rescue === true && !!sim2.tab(R)!.shell.ssh, 'rescue console is a remote shell that needs no network')
  await go(R, 'sudo ufw status')
  await go(R, 'sudo ufw allow 22/tcp'); await go(R, 'sudo ufw reload')
  await sim2.run(R, 'exit'); ok(!sim2.tab(R), 'exit closes the rescue console')
  const L2 = sim2.current.shell.id
  await go(L2, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
  ok(tr2.chaosDone('chaos-2-2'), 'chaos 2.2 done', where2)
  await sim2.run(L2, 'exit')
}

// ---------- chaos 2.3: restart loop from a missing EnvironmentFile
tr2.inject('chaos-2-3')
b2 = deriveBadges(sim2.world)
ok(b2.systemd === 'CrashLoopBackOff' && b2.app === 'CrashLoopBackOff', 'chaos 2.3 shows CrashLoopBackOff', () => JSON.stringify(b2))
ok(sim2.world.state.systemd.springbootService === 'restart-loop', 'state: restart-loop')
{
  const t = sim2.current.shell.id
  if (!sim2.tab(t)!.shell.ssh) await sim2.run(t, 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10')
  const inc = STAGE_2.chaosLabs[2]; const steps = [...inc.diagnosticTrail, ...inc.exactFix]
  for (let i = 0; i < steps.length; i++) {
    if (steps[i].command?.startsWith('sudo nano')) { await editFile(t, steps[i].command!, ENV_FILE); continue }
    await go(t, steps[i].command!, false)
    const cur = tr2.current(); ok(!cur || cur.ref.id !== inc.id || cur.index > i, `[s2] chaos-2-3 step ${i + 1} (${steps[i].command}) should advance`, where2)
  }
  ok(tr2.chaosDone('chaos-2-3'), 'chaos 2.3 done', where2)
  b2 = deriveBadges(sim2.world); ok(b2.systemd === 'RUNNING', 'service healthy again')
}
{
  // a flapping unit really loops: journal shows restart counters
  tr2.inject('chaos-2-3')
  await sim2.run(sim2.current.shell.id, 'journalctl -u springboot -n 40 --no-pager')
  ok(/restart counter is at \d+/.test(text2(sim2.current.shell.id, 40)), 'journal shows restart counters')
}

// ---------- chaos 2.2 order lesson, quiz, gate
ok(!tr2.isComplete(), 'stage 2 incomplete before the quiz')
ok(!tr2.submitQuiz([0, 0, 0, 0, 0]).passed, 'stage 2 wrong answers fail')
ok(tr2.submitQuiz(STAGE_2.unlockGate.quiz.questions.map((q) => q.answerIndex)).passed, 'stage 2 right answers pass')
ok(tr2.isComplete() && tr2.p.stageComplete, 'stage 2 complete', () => JSON.stringify(tr2.gateItems().filter((i) => !i.done)))

// =====================================================================================================================
// STAGE 3 ENGINE PRIMITIVES (Phase 3a): symlinks in paths, readlink / ln -sfn / mv -T, and the script runner. No Stage 3 content yet.
// =====================================================================================================================
{
  const s3 = new Simulator(PLAYGROUND_STAGE2, { stage: 2, key: 'devops:v1:sim:stage-3-engine', init: enterStage2 })
  s3.world.state.stage = 3
  const R = s3.openRescue()!
  const put = (path: string, content: string, mode = '755') => { s3.world.fs.remote[path] = { type: 'file', mode, owner: 'ubuntu', size: content.length, content, mtime: s3.world.clock } }
  const out = async (line: string) => {
    await s3.run(R, line)
    const ls = s3.tab(R)!.lines
    const i = [...ls].reverse().findIndex((l) => l.t === 'cmd')
    return stripAnsi(ls.slice(ls.length - i).map((l) => l.s).join('\n'))
  }
  put('/opt/myapp/deploy.sh', [
    '#!/usr/bin/env bash', 'set -euo pipefail', 'APP=/opt/myapp', 'VERSION=${1:?usage: deploy.sh <version>}',
    'mkdir -p "$APP/releases/$VERSION"', 'cp "$APP/app.jar" "$APP/releases/$VERSION/app.jar"', 'ln -sfn "$APP/releases/$VERSION" "$APP/current"',
    'if [[ "$(readlink "$APP/current")" == *"$VERSION"* ]]; then echo "DEPLOY OK: $VERSION"; else echo BAD; fi', 'false', 'echo NOT-REACHED', '',
  ].join('\n'))
  put('/opt/myapp/plain.sh', 'echo hi\n', '644')
  put('/opt/myapp/fn.sh', ['set -e', 'f() { echo "in f $1"; return 3; }', 'f x || echo "f gave $?"', 'for n in a b; do echo "n=$n"; done', 'T=$((2 + 3 * 4))', 'echo "t=$T"', 'grep -q zzz /etc/hostname || exit 7', 'echo NOT-REACHED', ''].join('\n'))
  put('/opt/myapp/unset.sh', 'set -u\necho "v=$NOPE"\necho NOT-REACHED\n')

  let o = await out('cd /opt/myapp && ./deploy.sh')
  ok(/deploy\.sh: line 4: 1: usage: deploy\.sh <version>/.test(o), 'script: ${1:?msg} prints the usage error with a line number', () => o)
  o = await out('./deploy.sh v2'); ok(/DEPLOY OK: v2/.test(o) && !/NOT-REACHED/.test(o), 'script: runs, and set -e stops at the failing command', () => o)
  o = await out('echo "rc=$?"'); ok(/rc=1/.test(o), '$? carries the previous line status', () => o)
  o = await out('./deploy.sh v2 >/dev/null; echo "rc=$?"'); ok(/rc=1/.test(o), '$? sees a status inside the same line', () => o)
  o = await out('./plain.sh'); ok(/Permission denied/.test(o) && /chmod \+x/.test(o), './script without the x bit: Permission denied plus a chmod hint', () => o)
  o = await out('bash plain.sh'); ok(/^hi$/m.test(o), 'bash script.sh does not need the x bit', () => o)
  o = await out('bash fn.sh; echo "rc=$?"'); ok(/in f x/.test(o) && /f gave 3/.test(o) && /n=a/.test(o) && /n=b/.test(o) && /t=14/.test(o) && /rc=7/.test(o) && !/NOT-REACHED/.test(o), 'script: functions, return codes, for, arithmetic, `|| exit`', () => o)
  o = await out('bash unset.sh'); ok(/NOPE: unbound variable/.test(o) && !/NOT-REACHED/.test(o), 'script: set -u stops on an unset variable', () => o)
  o = await out('sudo ./deploy.sh v3 > /tmp/out.log 2>&1; head -1 /tmp/out.log; ls -ld /opt/myapp/releases/v3')
  ok(/DEPLOY OK: v3/.test(o) && /root/.test(o), 'script: sudo ./script runs as root and honours redirects', () => o)
  o = await out('readlink /opt/myapp/current'); ok(o.trim() === '/opt/myapp/releases/v3', 'readlink prints the link text', () => o)
  o = await out('ls /opt/myapp/current/'); ok(/app\.jar/.test(o), 'a link to a folder is followed in the middle of a path and by `ls link/`', () => o)
  o = await out('cat /opt/myapp/current/app.jar | head -c 0; ls -l /opt/myapp/current'); ok(/current -> \/opt\/myapp\/releases\/v3/.test(o), 'ls -l shows the link itself', () => o)
  o = await out('cd releases && ln -s v2 cur && ls -l cur/ && readlink -f cur && cd ..'); ok(/app\.jar/.test(o) && /\/opt\/myapp\/releases\/v2/.test(o), 'relative symlinks resolve from the link folder', () => o)
  o = await out('rm -rf /opt/myapp/releases/v3; ls -l /opt/myapp/current; ls /opt/myapp/current'); ok(/current -> \/opt\/myapp\/releases\/v3/.test(o) && /cannot access/.test(o), 'a dangling link: ls -l shows it, ls link fails', () => o)
  o = await out('mkdir /tmp/a /tmp/b; ln -s /tmp/a /tmp/ptr; mv /tmp/b /tmp/ptr; ls /tmp/a'); ok(/^b$/m.test(o), 'mv onto a link to a folder moves INTO the folder (the classic trap)', () => o)
  o = await out('mkdir /tmp/c; ln -s /tmp/c /tmp/cur; ln -sfn /tmp/a /tmp/tmpl; mv -T /tmp/tmpl /tmp/cur; readlink /tmp/cur'); ok(o.trim() === '/tmp/a', 'mv -T replaces the link itself in one step', () => o)
  o = await out('touch /tmp/f; ln -s /tmp/c /tmp/f'); ok(/File exists/.test(o), 'ln -s without -f refuses to overwrite a file', () => o)
  o = await out('ln -s /tmp/c /tmp/ptr; ls /tmp/a'); ok(/\bb\s+c\b/.test(o), 'ln -s onto a link to a folder (no -n) creates the link inside the folder', () => o)
  o = await out('ln -sfn /tmp/b /tmp/cur; readlink /tmp/cur; ls /tmp/c'); ok(/^\/tmp\/b$/m.test(o), 'ln -sfn replaces the link (and does not create a link inside the old target)', () => o)
  o = await out('[[ -L /tmp/ptr ]] && echo is-link; [ -d /tmp/ptr ] && echo is-dir; test -f /tmp/ptr || echo not-file'); ok(/is-link/.test(o) && /is-dir/.test(o) && /not-file/.test(o), 'test builtin: -L -d -f', () => o)
}

console.log(failures ? `\n${failures} of ${checks} checks FAILED` : `All ${checks} checks passed ✓`)
if (failures) throw new Error(`${failures} verification check(s) failed`)
