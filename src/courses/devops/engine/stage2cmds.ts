// Stage 2 toolbox: the building manager (systemd), the logbook (journalctl), the receptionist (nginx), the guard (ufw), the ID printer (certbot).
import { flagsOf } from './corecmds'
import { certbotRun, nginxProc, nginxReload, nginxStart, nginxStop, nginxTestLines, nginxVersionLine, SITES_ENABLED } from './nginx'
import { daemonReload, disableUnit, enableUnit, jdate, jlog, loadUnit, reboot, startUnit, stopUnit, unitOf, unitPath } from './systemd'
import { ANSI, type CmdCtx, type CmdFn } from './shellTypes'
import { killProc, startPostgresProcs, ufwBlocks, hhmm, type World } from './world'
import { resolveLink } from './fs'

const POLKIT = (c: CmdCtx, verb: string, unit: string) => {
  c.err(verb === 'daemon-reload' ? 'Failed to reload daemon: Interactive authentication required.' : `Failed to ${verb} ${unit}.service: Interactive authentication required.`)
  if (verb !== 'daemon-reload') c.err(`See system logs and 'systemctl status ${unit}.service' for details.`)
  c.tip('Changing a service changes the whole machine, so Linux wants `sudo` in front.')
  return 1
}

const since = (w: World, t: number) => {
  const age = Math.max(0, w.clock - t)
  return `Tue 2026-11-24 ${hhmm(t)}:${String(new Date(t * 1000).getUTCSeconds()).padStart(2, '0')} UTC; ${age >= 60 ? `${Math.floor(age / 60)}min ` : ''}${age % 60}s ago`
}

function statusCustom(c: CmdCtx, n: string): number {
  const w = c.w, u = unitOf(w, n)
  const L = loadUnit(w, n)
  const desc = L?.spec?.description ?? n
  const mark = u.active === 'active' ? `${ANSI.green}●${ANSI.off}` : u.active === 'inactive' ? '○' : u.active === 'failed' ? `${ANSI.red}×${ANSI.off}` : `${ANSI.green}●${ANSI.off}`
  c.out(`${mark} ${n}.service - ${desc}`)
  c.out(`     Loaded: loaded (${unitPath(n)}; ${u.enabled ? 'enabled' : 'disabled'}; vendor preset: enabled)`)
  if (u.active === 'active') {
    c.out(`     Active: ${ANSI.green}active (running)${ANSI.off} since ${since(w, u.since)}`)
    c.out(`   Main PID: ${u.pid} (java)`); c.out('      Tasks: 34 (limit: 1058)'); c.out('     Memory: 392.1M'); c.out(`        CPU: ${8 + Math.floor((w.clock - u.since) / 9)}.214s`)
    c.out(`     CGroup: /system.slice/${n}.service`); c.out(`             └─${u.pid} ${L?.spec?.execStart ?? ''}`)
  } else if (u.active === 'activating') {
    c.out(`     Active: ${ANSI.green}activating (auto-restart)${ANSI.off} (Result: ${u.result}) since ${since(w, u.since)}`)
    if (u.result !== 'resources') c.out(`    Process: ${2300 + u.restarts} ExecStart=${L?.spec?.execStart ?? ''} (code=exited, status=1/FAILURE)`)
    c.out(u.result === 'resources' ? '   Main PID: (none)' : `   Main PID: ${2300 + u.restarts} (code=exited, status=1/FAILURE)`); c.out('        CPU: 1.9s')
  } else if (u.active === 'failed') {
    c.out(`     Active: ${ANSI.red}failed${ANSI.off} (Result: ${u.result}) since ${since(w, u.since)}`)
  } else c.out('     Active: inactive (dead)')
  const j = w.x.sd.journal[n] ?? []
  if (j.length) { c.out(''); j.slice(-5).forEach((l) => c.out(l.length > 150 ? l.slice(0, 149) + '…' : l)) }
  return u.active === 'active' ? 0 : 3
}

const systemctl: CmdFn = (c) => {
  const w = c.w
  const raw = c.argv.slice(1)
  const flags = raw.filter((a) => a.startsWith('-'))
  const [verb, unitRaw] = raw.filter((a) => !a.startsWith('-'))
  if (!verb) { c.out('  UNIT                 LOAD   ACTIVE SUB     DESCRIPTION'); return 0 }
  const unit = (unitRaw ?? '').replace(/\.service$/, '')
  const stage2 = w.state.stage >= 2
  const root = c.user === 'root'
  if (verb === 'daemon-reload') {
    if (c.host === 'local' || !stage2) { c.err(`Unknown command verb ${verb}.`); if (c.host === 'remote') c.tip('Writing your own service files is the big Stage 2 skill. In Stage 1 the app is started by hand.'); return 1 }
    if (!root) return POLKIT(c, verb, '')
    daemonReload(w); return 0
  }
  if (!unit) { c.err('Too few arguments.'); return 1 }
  const isPg = unit === 'postgresql' && w.x.pg.installed
  const isNginx = unit === 'nginx' && w.x.nginx.installed
  const custom = stage2 && c.host === 'remote' && !!w.fs.remote[unitPath(unit)]
  if (c.host === 'local' || !(isPg || isNginx || custom)) {
    c.err(verb === 'status' ? `Unit ${unit}.service could not be found.` : `Failed to ${verb} ${unit}.service: Unit ${unit}.service not found.`)
    if (c.host === 'remote' && (unit === 'springboot' || unit === 'shop') && !stage2) c.tip('Turning your app into a managed service is the big Stage 2 upgrade. For now the app is started by hand.')
    else if (c.host === 'remote' && unit === 'springboot') c.tip('There is no unit file yet. Create /etc/systemd/system/springboot.service first (sudo nano), then daemon-reload.')
    else if (c.host === 'local') c.tip('systemctl on your laptop manages your laptop. The shop services live on the server: ssh in first.')
    return verb === 'status' ? 4 : 5
  }
  const now = flags.includes('--now')

  // ----- read-only verbs (no sudo) -----
  if (verb === 'status') {
    if (isPg) {
      const up = w.x.pg.running
      c.out(`${up ? ANSI.green + '●' : '○'}${ANSI.off} postgresql.service - PostgreSQL RDBMS`)
      c.out(`     Loaded: loaded (/lib/systemd/system/postgresql.service; ${w.x.sd.units.postgresql?.enabled === false ? 'disabled' : 'enabled'}; vendor preset: enabled)`)
      c.out(up ? `     Active: ${ANSI.green}active (running)${ANSI.off} since Tue 2026-11-24 ${hhmm(w.clock - 190)}:12 UTC; 3min ago` : '     Active: inactive (dead)')
      if (up) { c.out('   Main PID: 1630 (postgres)'); c.out('      Tasks: 6 (limit: 1058)'); c.out('     Memory: 21.4M') }
      return up ? 0 : 3
    }
    if (isNginx) {
      const up = w.x.nginx.running && !!nginxProc(w)
      c.out(`${up ? ANSI.green + '●' : '○'}${ANSI.off} nginx.service - A high performance web server and a reverse proxy server`)
      c.out(`     Loaded: loaded (/lib/systemd/system/nginx.service; ${w.x.sd.units.nginx?.enabled === false ? 'disabled' : 'enabled'}; vendor preset: enabled)`)
      c.out(up ? `     Active: ${ANSI.green}active (running)${ANSI.off} since Tue 2026-11-24 ${hhmm(w.clock - 120)}:41 UTC; 2min ago` : '     Active: inactive (dead)')
      if (up) { c.out('       Docs: man:nginx(8)'); c.out(`   Main PID: ${nginxProc(w)!.pid} (nginx)`); c.out('      Tasks: 2 (limit: 1058)'); c.out('     Memory: 5.1M') }
      return up ? 0 : 3
    }
    return statusCustom(c, unit)
  }
  if (verb === 'is-active') { const a = isPg ? (w.x.pg.running ? 'active' : 'inactive') : isNginx ? (w.x.nginx.running ? 'active' : 'inactive') : unitOf(w, unit).active; c.out(a); return a === 'active' ? 0 : 3 }
  if (verb === 'is-enabled') { const e = isPg || isNginx ? w.x.sd.units[unit]?.enabled !== false : unitOf(w, unit).enabled; c.out(e ? 'enabled' : 'disabled'); return e ? 0 : 1 }

  // ----- verbs that change the machine -----
  if (!['start', 'stop', 'restart', 'reload', 'enable', 'disable', 'reset-failed'].includes(verb)) { c.err(`Unknown command verb ${verb}.`); return 1 }
  if (!root) return POLKIT(c, verb, unit)

  if (isPg) {
    if (verb === 'start' || verb === 'restart') { startPostgresProcs(w); jlog(w, 'postgresql', 'Started PostgreSQL Cluster 14-main.'); return 0 }
    if (verb === 'stop') { killProc(w, 1630); w.x.pg.running = false; return 0 }
    if (verb === 'enable' || verb === 'disable') { w.x.sd.units.postgresql ??= { enabled: true, active: 'active', result: 'success', pid: null, restarts: 0, since: w.clock, nextRestartAt: null }; w.x.sd.units.postgresql.enabled = verb === 'enable'; c.out(`Synchronizing state of postgresql.service with SysV service script with /lib/systemd/systemd-sysv-install.`); c.out(`Executing: /lib/systemd/systemd-sysv-install ${verb} postgresql`); return 0 }
    return 0
  }
  if (isNginx) {
    const jobFail = (err: string) => { jlog(w, 'nginx', err.replace(/^nginx: /, ''), 'nginx[2530]'); c.err('Job for nginx.service failed because the control process exited with error code.'); c.err('See "systemctl status nginx.service" and "journalctl -xeu nginx.service" for details.'); c.tip('Run `sudo nginx -t`: it prints the exact line of the configuration nginx dislikes.'); return 1 }
    if (verb === 'start') { if (w.x.nginx.running) return 0; const e = nginxStart(w); return e ? jobFail(e) : 0 }
    if (verb === 'stop') { nginxStop(w); return 0 }
    if (verb === 'restart') { nginxStop(w); const e = nginxStart(w); return e ? (c.tip('`restart` stopped nginx first, and the new configuration is broken, so the front desk is now closed. `reload` would have kept the old working configuration.'), jobFail(e)) : 0 }
    if (verb === 'reload') { if (!w.x.nginx.running) { c.err('Failed to reload nginx.service: Unit nginx.service is not active.'); return 1 } const e = nginxReload(w); return e ? jobFail(e) : 0 }
    if (verb === 'enable' || verb === 'disable') { w.x.sd.units.nginx.enabled = verb === 'enable'; c.out('Synchronizing state of nginx.service with SysV service script with /lib/systemd/systemd-sysv-install.'); c.out(`Executing: /lib/systemd/systemd-sysv-install ${verb} nginx`); return 0 }
    return 0
  }
  // a unit the learner wrote
  if (verb === 'enable') { const m = enableUnit(w, unit); if (m) c.out(m) }
  if (verb === 'disable') { const m = disableUnit(w, unit); if (m) c.out(m) }
  if (verb === 'reset-failed') { const u = unitOf(w, unit); if (u.active === 'failed') u.active = 'inactive'; return 0 }
  if (verb === 'reload') { c.err(`Failed to reload ${unit}.service: Job type reload is not applicable for unit ${unit}.service.`); return 1 }
  if (verb === 'stop') stopUnit(w, unit)
  if (verb === 'start' || verb === 'restart' || (verb === 'enable' && now)) {
    if (verb === 'restart') stopUnit(w, unit)
    const r = startUnit(w, unit)
    if (r.warn) c.err(r.warn)
    if (!r.ok) { c.err(r.err!); return 1 }
  }
  return 0
}

// ---------- journalctl ----------

const journalctl: CmdFn = (c) => {
  if (c.host === 'local') { c.err("Command 'journalctl' not found"); return 127 }
  const a = c.argv.slice(1)
  const unit = (() => { const i = a.findIndex((x) => x === '-u' || x === '--unit'); return i >= 0 ? (a[i + 1] ?? '').replace(/\.service$/, '') : (a.find((x) => x.startsWith('--unit='))?.slice(7) ?? null) })()
  const ni = a.findIndex((x) => x === '-n' || x === '--lines')
  const n = ni >= 0 ? Number(a[ni + 1]) : (a.find((x) => /^-n\d+$/.test(x)) ? Number(a.find((x) => /^-n\d+$/.test(x))!.slice(2)) : null)
  const follow = a.includes('-f') || a.includes('--follow')
  const j = c.w.x.sd.journal
  const all = unit ? (j[unit] ?? []) : Object.values(j).flat().sort()
  if (!all.length) { c.out('-- No entries --'); return 0 }
  const shown = n !== null && Number.isFinite(n) ? all.slice(-n) : follow ? all.slice(-10) : all
  shown.forEach((l) => c.out(l))
  if (follow) c.result.hold = { kind: 'follow', host: 'remote', label: `journalctl -u ${unit ?? 'all'} -f`, path: `journal:${unit ?? 'springboot'}` }
  return 0
}

// ---------- nginx ----------

const nginx: CmdFn = (c) => {
  const w = c.w
  if (c.host === 'local' || !w.x.nginx.installed) { c.err("Command 'nginx' not found, but can be installed with:"); c.err(''); c.err('sudo apt install nginx'); if (c.host === 'local') c.tip('The receptionist works at the server, not on your laptop.'); return 127 }
  const a = c.argv.slice(1)
  if (a.includes('-v')) { c.err(nginxVersionLine()); return 0 }
  if (a.includes('-s')) {
    if (c.user !== 'root') { c.err('nginx: [alert] could not open error log file: open() "/var/log/nginx/error.log" failed (13: Permission denied)'); c.err('nginx: [emerg] open() "/run/nginx.pid" failed (13: Permission denied)'); return 1 }
    if (a[a.indexOf('-s') + 1] === 'reload') { const e = nginxReload(w); if (e) { c.err(e); return 1 } return 0 }
    c.err(`nginx: invalid option: "${a[a.indexOf('-s') + 1]}"`); return 1
  }
  if (a.includes('-t') || a.includes('-T')) {
    const t = nginxTestLines(w, c.user === 'root')
    t.lines.forEach((l) => c.err(l))
    if (t.ok && a.includes('-T')) {
      c.out('# configuration file /etc/nginx/nginx.conf:')
      ;(w.fs.remote['/etc/nginx/nginx.conf']?.content ?? '').split('\n').forEach((l) => c.out(l))
      for (const p of Object.keys(w.fs.remote).filter((q) => q.startsWith(SITES_ENABLED + '/')).sort()) {
        c.out(`# configuration file ${p}:`)
        ;(resolveLink(w.fs.remote, p)?.content ?? '').split('\n').forEach((l) => c.out(l))
      }
    }
    return t.ok ? 0 : 1
  }
  c.err('nginx: usage: nginx -t | -T | -v | -s reload'); return 1
}

// ---------- ufw ----------

const NAMED: Record<string, number[]> = { ssh: [22], openssh: [22], http: [80], https: [443], 'nginx full': [80, 443], 'nginx http': [80], 'nginx https': [443] }

const ufw: CmdFn = (c) => {
  const w = c.w
  if (c.host === 'local') { c.err("Command 'ufw' not found"); return 127 }
  if (c.user !== 'root') { c.err('ERROR: You need to be root to run this script'); c.tip('The firewall guards the whole machine: use `sudo`.'); return 1 }
  const a = c.argv.slice(1).filter((x) => !x.startsWith('--'))
  const [verb, ...rest] = a
  const u = w.x.ufw
  const table = (numbered: boolean) => {
    c.out('Status: active'); c.out('')
    const pad = numbered ? '     ' : ''
    c.out(`${pad}To                         Action      From`); c.out(`${pad}--                         ------      ----`)
    const rows: string[] = []
    u.rules.forEach((p) => rows.push(`${`${p}/tcp`.padEnd(27)}${numbered ? 'ALLOW IN   ' : 'ALLOW       '}Anywhere`))
    u.rules.forEach((p) => rows.push(`${`${p}/tcp (v6)`.padEnd(27)}${numbered ? 'ALLOW IN   ' : 'ALLOW       '}Anywhere (v6)`))
    rows.forEach((r, i) => c.out(numbered ? `[${String(i + 1).padStart(2, ' ')}] ${r}` : r))
  }
  switch (verb) {
    case 'status': if (!u.enabled) { c.out('Status: inactive'); return 0 } table(rest[0] === 'numbered'); return 0
    case 'enable':
      c.out('Command may disrupt existing ssh connections. Proceed with operation (y|n)? y'); c.out('Firewall is active and enabled on system startup'); u.enabled = true
      if (!u.rules.includes(22)) c.tip('The guard is now on duty and port 22 is NOT on the guest list. Your current connection survives, but any new one will be turned away. Add the rule with `sudo ufw allow 22/tcp`.')
      return 0
    case 'disable': u.enabled = false; c.out('Firewall stopped and disabled on system startup'); return 0
    case 'reload': c.out(u.enabled ? 'Firewall reloaded' : 'Firewall not enabled (skipping reload)'); return 0
    case 'allow': case 'delete': case 'deny': {
      const del = verb === 'delete'
      const spec = (del ? rest.slice(1) : rest).join(' ').replace(/^['"]|['"]$/g, '')
      const ports = NAMED[spec.toLowerCase()] ?? (/^[\d,]+(\/tcp)?$/.test(spec) ? spec.replace(/\/tcp$/, '').split(',').map(Number) : null)
      if (!ports) { c.err('ERROR: Could not find a profile matching \'' + spec + '\''); return 1 }
      if (verb === 'deny') { ports.forEach((p) => { u.rules = u.rules.filter((x) => x !== p) }); c.out('Rule added'); c.out('Rule added (v6)'); return 0 }
      const fresh = ports.filter((p) => (del ? u.rules.includes(p) : !u.rules.includes(p)))
      if (del) { u.rules = u.rules.filter((p) => !ports.includes(p)); c.out(fresh.length ? 'Rule deleted' : 'Could not delete non-existent rule'); return 0 }
      if (!fresh.length) { c.out('Skipping adding existing rule'); c.out('Skipping adding existing rule (v6)'); return 0 }
      u.rules = [...u.rules, ...fresh].sort((x, y) => x - y)
      c.out('Rule added'); c.out('Rule added (v6)')
      return 0
    }
    default: c.err('ERROR: Invalid syntax. Usage: ufw allow|deny|status|enable|disable|reload'); return 1
  }
}

// ---------- certbot ----------

const certbot: CmdFn = (c) => {
  const w = c.w
  if (c.host === 'local' || !w.x.apt.pkgs.includes('certbot')) { c.err("Command 'certbot' not found, but can be installed with:"); c.err(''); c.err('sudo apt install certbot'); if (c.host === 'local') c.tip('Certificates are issued for the server: ssh in first.'); return 127 }
  if (c.user !== 'root') { c.err('Error: Please run as root (e.g. with sudo), or use the --config-dir/--work-dir/--logs-dir flags.'); c.tip('Certbot edits nginx and writes certificates under /etc: put `sudo` in front.'); return 1 }
  const a = c.argv.slice(1)
  if (!a.includes('--nginx')) { c.err('Certbot needs to know how to talk to nginx: run `sudo certbot --nginx -d shop.example.com`.'); return 1 }
  const di = a.indexOf('-d')
  if (di < 0 || !a[di + 1]) { c.err('Error: please give the domain with -d, for example: certbot --nginx -d shop.example.com'); return 1 }
  const r = certbotRun(w, a[di + 1], a.includes('--redirect'), ufwBlocks(w, 80))
  r.lines.forEach((l) => (r.ok ? c.out(l) : c.err(l)))
  c.result.ok = r.ok
  return r.ok ? 0 : 1
}

// ---------- reboot ----------

const rebootCmd: CmdFn = (c) => {
  if (c.host === 'local') { c.err('Failed to connect to bus: No such file or directory'); return 1 }
  if (c.user !== 'root') { c.err('Failed to set wall message, ignoring: Interactive authentication required.'); c.err('Failed to reboot system via logind: Interactive authentication required.'); c.err('Failed to open initctl fifo: Permission denied'); c.err('Failed to talk to init daemon.'); c.tip('Rebooting affects everybody on the machine: use `sudo reboot`.'); return 1 }
  reboot(c.w)
  return 0
}
const shutdown: CmdFn = (c) => (c.argv.includes('-r') ? rebootCmd(c) : (c.err('This simulator only supports `shutdown -r now` (reboot).'), 1))

export const STAGE2: Record<string, CmdFn> = { systemctl, journalctl, nginx, ufw, certbot, reboot: rebootCmd, shutdown }
export { jdate, flagsOf }
