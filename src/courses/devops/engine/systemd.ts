// A small but causal systemd: unit files are parsed, EnvironmentFile is read, the app is started through the same startApp as Stage 1,
// and Restart=on-failure really loops (one attempt per RestartSec of simulated time). Everything it does lands in the journal.
import { startApp } from './app'
import { mkdirp, writeFile } from './fs'
import { nginxStart } from './nginx'
import { hooks, killProc, startPostgresProcs, tick, hhmm, pad, type UnitState, type World } from './world'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const jdate = (t: number) => { const d = new Date(t * 1000); return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())}` }
export const unitPath = (n: string) => `/etc/systemd/system/${n}.service`
export const WANTS = (n: string) => `/etc/systemd/system/multi-user.target.wants/${n}.service`

export interface UnitSpec {
  description: string; user: string; workdir: string; envFile: string | null; envOptional: boolean
  execStart: string; restart: 'no' | 'on-failure' | 'always'; restartSec: number; successExit: number[]
}

/** Parses the `[Unit]/[Service]/[Install]` text. Returns null when there is no ExecStart (systemd refuses such a unit). */
export function parseUnit(text: string): UnitSpec | null {
  const kv: Record<string, string> = {}
  for (const raw of text.split('\n')) {
    const l = raw.trim()
    if (!l || l.startsWith('#') || l.startsWith(';') || l.startsWith('[')) continue
    const i = l.indexOf('=')
    if (i > 0) kv[l.slice(0, i).trim()] = l.slice(i + 1).trim()
  }
  if (!kv.ExecStart) return null
  const env = kv.EnvironmentFile ?? ''
  const rs = parseFloat(kv.RestartSec ?? '0.1')
  return {
    description: kv.Description ?? 'unit', user: kv.User ?? 'root', workdir: kv.WorkingDirectory ?? '/',
    envFile: env ? env.replace(/^-/, '') : null, envOptional: env.startsWith('-'),
    execStart: kv.ExecStart, restart: (['no', 'on-failure', 'always'].includes(kv.Restart) ? kv.Restart : 'no') as UnitSpec['restart'],
    restartSec: Number.isFinite(rs) ? Math.max(1, Math.round(rs)) : 1, successExit: (kv.SuccessExitStatus ?? '').split(/\s+/).filter(Boolean).map(Number).filter(Number.isFinite),
  }
}

export function parseEnv(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const l of text.split('\n')) { const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(l); if (m) out[m[1]] = m[2].replace(/^"(.*)"$/, '$1') }
  return out
}

export const unitOf = (w: World, n: string): UnitState => (w.x.sd.units[n] ??= { enabled: false, active: 'inactive', result: 'success', pid: null, restarts: 0, since: w.clock, nextRestartAt: null })

export function jlog(w: World, unit: string, msg: string, who = 'systemd[1]') {
  ;(w.x.sd.journal[unit] ??= []).push(`${jdate(w.clock)} shop-server ${who}: ${msg}`)
}

/** The spec as systemd has it loaded: read from disk on first use, refreshed only by `daemon-reload`. */
export function loadUnit(w: World, n: string): { spec: UnitSpec | null; stale: boolean } | null {
  const f = w.fs.remote[unitPath(n)]
  if (!f) return null
  const loaded = (w.x.sd.loaded[n] ??= f.content ?? '')
  return { spec: parseUnit(loaded), stale: loaded !== (f.content ?? '') }
}

function fail(w: World, n: string, spec: UnitSpec, result: string, msgs: string[]) {
  const u = unitOf(w, n)
  msgs.forEach((m) => jlog(w, n, `${n}.service: ${m}`))
  u.result = result; u.pid = null; u.since = w.clock
  if (spec.restart === 'no') { u.active = 'failed'; u.nextRestartAt = null }
  else { u.active = 'activating'; u.nextRestartAt = w.clock + spec.restartSec }
}

function attempt(w: World, n: string, spec: UnitSpec) {
  const u = unitOf(w, n)
  jlog(w, n, `Started ${spec.description}.`)
  let env: Record<string, string> = {}
  if (spec.envFile) {
    const f = w.fs.remote[spec.envFile]
    if (!f) {
      if (!spec.envOptional) { fail(w, n, spec, 'resources', ['Failed to load environment files: No such file or directory', "Failed to run 'start' task: No such file or directory", "Failed with result 'resources'."]); return }
    } else env = parseEnv(f.content ?? '')
  }
  const r = startApp(w, { host: 'remote', cwd: spec.workdir, bound: null, immune: true, user: spec.user, env, unit: n, cmd: spec.execStart })
  const logLines = r.lines.filter((l) => /\b(INFO|WARN|ERROR)\b|Caused by|Exception|FAILED|Description:|Port \d+|Action:|Identify/.test(l))
  logLines.forEach((l) => jlog(w, n, l, `java[${r.proc?.pid ?? 2200}]`))
  if (r.ok) { u.active = 'active'; u.result = 'success'; u.pid = r.proc!.pid; u.since = w.clock; u.nextRestartAt = null; return }
  fail(w, n, spec, 'exit-code', ['Main process exited, code=exited, status=1/FAILURE', "Failed with result 'exit-code'."])
}

export function startUnit(w: World, n: string): { ok: boolean; err?: string; warn?: string } {
  const L = loadUnit(w, n)
  if (!L) return { ok: false, err: `Failed to start ${n}.service: Unit ${n}.service not found.` }
  if (!L.spec) { jlog(w, n, `${n}.service: Service lacks both ExecStart= and ExecStop= setting. Refusing.`); return { ok: false, err: `Failed to start ${n}.service: Unit ${n}.service has a bad unit file setting.\nSee system logs and 'systemctl status ${n}.service' for details.` } }
  const u = unitOf(w, n)
  if (u.active === 'active') return { ok: true }
  u.restarts = 0
  attempt(w, n, L.spec)
  return { ok: true, warn: L.stale ? `Warning: The unit file, source configuration file or drop-ins of ${n}.service changed on disk. Run 'systemctl daemon-reload' to reload units.` : undefined }
}

export function stopUnit(w: World, n: string) {
  const u = unitOf(w, n)
  const desc = loadUnit(w, n)?.spec?.description ?? n
  if (u.pid) { jlog(w, n, `Stopping ${desc}...`); killProc(w, u.pid, 'stopped'); jlog(w, n, `Stopped ${desc}.`) }
  u.active = 'inactive'; u.pid = null; u.nextRestartAt = null; u.since = w.clock
}

export function enableUnit(w: World, n: string): string | null {
  const u = unitOf(w, n)
  if (u.enabled) return null
  mkdirp(w.fs.remote, '/etc/systemd/system/multi-user.target.wants', 'root', w.clock)
  w.fs.remote[WANTS(n)] = { type: 'file', mode: '777', owner: 'root', size: 0, mtime: w.clock, link: unitPath(n) }
  u.enabled = true
  return `Created symlink ${WANTS(n)} → ${unitPath(n)}.`
}

export function disableUnit(w: World, n: string): string | null {
  const u = unitOf(w, n)
  if (!u.enabled) return null
  delete w.fs.remote[WANTS(n)]
  u.enabled = false
  return `Removed ${WANTS(n)}.`
}

export function daemonReload(w: World) {
  for (const n of Object.keys(w.x.sd.loaded)) { const f = w.fs.remote[unitPath(n)]; if (f) w.x.sd.loaded[n] = f.content ?? '' ; else delete w.x.sd.loaded[n] }
}

/** Scheduler, run from syncWorld after every command: restarts failed units on time and notices a dead main process. */
function advance(w: World) {
  for (const [n, u] of Object.entries(w.x.sd.units)) {
    const L = w.x.sd.loaded[n] !== undefined ? { spec: parseUnit(w.x.sd.loaded[n]) } : null
    const spec = L?.spec
    if (!spec || !w.fs.remote[unitPath(n)]) continue
    if (u.active === 'active' && u.pid && !w.procs.some((p) => p.pid === u.pid)) {
      const why = w.x.app.lastExit
      if (why === 'sigterm' && spec.successExit.includes(143)) {
        jlog(w, n, `${n}.service: Succeeded.`); u.active = 'inactive'; u.result = 'success'; u.pid = null; u.since = w.clock
      } else {
        fail(w, n, spec, 'signal', ['Main process exited, code=killed, status=9/KILL', "Failed with result 'signal'."])
      }
    }
    for (let guard = 0; u.active === 'activating' && u.nextRestartAt !== null && w.clock >= u.nextRestartAt && guard < 3; guard++) {
      u.restarts++
      jlog(w, n, `${n}.service: Scheduled restart job, restart counter is at ${u.restarts}.`)
      jlog(w, n, `Stopped ${spec.description}.`)
      attempt(w, n, spec)
    }
  }
}

// ---------- reboot ----------

export function reboot(w: World) {
  const keep = (k: string) => k === 'init' || k === 'sshd'
  w.procs = w.procs.filter((p) => keep(p.kind))
  w.ssh = []
  w.x.pg.running = false
  w.x.nginx.running = false
  w.x.reboot.count++
  w.x.reboot.hangup = true
  tick(w, 45)
  w.boot = w.clock - 20
  w.x.reboot.downUntil = w.clock + 18
  // enabled services come back on their own, in dependency order: this is the "backup generator"
  if (w.x.pg.installed && w.x.sd.units.postgresql?.enabled !== false) startPostgresProcs(w)
  if (w.x.nginx.installed && w.x.sd.units.nginx?.enabled !== false) nginxStart(w)
  for (const [n, u] of Object.entries(w.x.sd.units)) {
    if (n === 'postgresql' || n === 'nginx') continue
    u.active = 'inactive'; u.pid = null; u.nextRestartAt = null
    if (u.enabled) { jlog(w, n, '-- Boot --', 'kernel'); startUnit(w, n) }
  }
}

// ---------- derived facts for validation rules ----------

function derive(w: World) {
  const d = w.x.d, r = w.fs.remote
  const env = r['/etc/springboot.env']
  d.envKeys = env ? Object.keys(parseEnv(env.content ?? '')).length : 0
  d.envMode = env?.mode ?? ''
  const uf = r[unitPath('springboot')]
  d.unitFile = !uf ? 'missing' : (() => { const s = parseUnit(uf.content ?? ''); return s && /java\s+-jar/.test(s.execStart) ? 'ok' : 'invalid' })()
  const site = r['/etc/nginx/sites-available/shop']
  const t = site?.content ?? ''
  const pp = /proxy_pass\s+http:\/\/127\.0\.0\.1:(\d+)/.exec(t)
  d.siteFile = !site ? 'missing' : pp && pp[1] !== '8080' ? 'wrong-upstream' : pp && /listen\s+80/.test(t) && /server_name\s+\S+/.test(t) && /\}\s*$/.test(t.trim()) ? 'ok' : 'invalid'
  d.siteEnabled = !!r['/etc/nginx/sites-enabled/shop']
  d.defaultSiteEnabled = !!r['/etc/nginx/sites-enabled/default']
  d.ufwAllows22 = w.x.ufw.rules.includes(22)
}

hooks.advance = advance
hooks.derive = derive

export { hhmm, writeFile }
