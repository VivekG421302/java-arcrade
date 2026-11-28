// The simulated bash. `exec` runs one typed line against the world and returns what the terminal should print.
import { CORE } from './corecmds'
import { NET, sftpLine } from './netcmds'
import { SVC, psqlLine, saveEdit } from './svccmds'
import { STAGE2 } from './stage2cmds'
import './systemd'
import { parse, type ListItem, type SimpleCmd } from './parse'
import { appendText } from './app'
import { bashCmd, runFile, testCmd } from './script'
import { can, glob, listDir, parent, realpath, resolvePath, tilde, writeFile } from './fs'
import { jdate } from './systemd'
import { closeSsh, HOME, HOSTNAME, isoMs, killProc, syncWorld, tick, type World } from './world'
import { stripAnsi, type CmdCtx, type CmdFn, type ExecResult, type Hold, type OutLine, type Shell } from './shellTypes'

export { saveEdit } from './svccmds'
export { sqlBridge } from './shellTypes'
export type { ExecResult, Hold, OutLine, Shell } from './shellTypes'

export const newShell = (id: number): Shell => ({ id, localCwd: '/home/learner/shop-app', localHistory: [], ssh: null, repl: null })

// Tools that exist later in the course: they fail like a missing program, with a note saying when they unlock.
const LOCKED: Record<string, number> = {
  ufw: 2, certbot: 2, journalctl: 2, nginx: 2, reboot: 2, shutdown: 2, rsync: 3, crontab: 3, logrotate: 3, pg_dump: 3, mysqldump: 3, docker: 4,
  bash: 3, sh: 3, 'docker-compose': 5, nc: 6, dig: 6, htop: 6, aws: 6, git: 7, gh: 7, kubectl: 8, helm: 8,
}
const APT_HINT: Record<string, string> = { mysql: 'mysql-client-core-8.0', docker: 'docker.io', nginx: 'nginx', git: 'git', rsync: 'rsync', ufw: 'ufw', vim: 'vim', unzip: 'unzip' }

const exitCmd: CmdFn = (c) => {
  if (c.sh.ssh) {
    closeSsh(c.w, c.sh.ssh.id)
    c.sh.ssh = null
    c.out('logout'); c.out('Connection to 203.0.113.10 closed.')
    c.tip('The shop worker lost the walkie-talkie. Anything you started without nohup or setsid was told to stop (SIGHUP).')
    if (c.sh.rescue) c.result.closeTab = true
  } else c.result.closeTab = true
  return 0
}

const COMMANDS: Record<string, CmdFn> = { ...CORE, ...NET, ...SVC, ...STAGE2, bash: bashCmd, sh: bashCmd, '[[': testCmd, '[': testCmd, test: testCmd, exit: exitCmd, logout: exitCmd }

export const promptOf = (w: World, sh: Shell): string => {
  const r = sh.repl
  if (r?.kind === 'psql') return r.buf ? `${r.db}-${r.user === 'postgres' ? '#' : '>'} ` : `${r.db}=${r.user === 'postgres' ? '#' : '>'} `
  if (r?.kind === 'sftp') return 'sftp> '
  if (r?.kind === 'password') return r.label
  if (sh.ssh) return `${sh.ssh.user}@${HOSTNAME}:${tilde(sh.ssh.cwd, HOME.remote)}$ `
  return `learner@laptop:${tilde(sh.localCwd, HOME.local)}$ `
}

const lines = (s: string) => s.split('\n')

interface Frame { w: World; sh: Shell; host: 'local' | 'remote'; user: string; env: Record<string, string>; pre: OutLine[]; post: OutLine[]; tips: OutLine[]; result: Partial<ExecResult>; mixed?: OutLine[] }

function build(f: Frame, argv: string[], o: Partial<Pick<CmdCtx, 'sudo' | 'immune' | 'bg' | 'redir' | 'pipeNext' | 'stdin' | 'stdout' | 'stderr' | 'user'>>): CmdCtx {
  const { w, sh, host } = f
  const user = o.user ?? f.user
  const fs = w.fs[host]
  const home = HOME[host]
  const c: CmdCtx = {
    w, sh, argv, host, user, home, fs, env: f.env, result: f.result,
    stdin: o.stdin ?? null, stdout: o.stdout ?? [], stderr: o.stderr ?? [],
    sudo: o.sudo ?? false, immune: o.immune ?? false, bg: o.bg ?? false,
    redir: o.redir ?? { stdout: false, stderr: false, errToOut: false }, pipeNext: o.pipeNext ?? null,
    get cwd() { return sh.ssh && host === 'remote' ? sh.ssh.cwd : sh.localCwd },
    setCwd: (p) => { if (host === 'remote' && sh.ssh) sh.ssh.cwd = p; else sh.localCwd = p },
    // links in the middle of a path (current/app.jar) are followed here; the last name is kept so `ls -l current` still shows the link
    abs: (p) => { const r = resolvePath(p, host === 'remote' && sh.ssh ? sh.ssh.cwd : sh.localCwd, home); return realpath(fs, r, false) ?? r },
    out: (s) => { for (const l of lines(s)) c.stdout.push(l) },
    err: (s) => { for (const l of lines(s)) c.stderr.push(l) },
    tip: (s) => { f.tips.push({ t: 'sys', s: `💡 ${s}` }) },
    note: (s, when = 'pre') => { (when === 'pre' ? f.pre : f.post).push({ t: 'out', s }) },
    emit: (l) => { (f.mixed ??= []).push(l) },
    runLine: async (text, env, o) => {
      const items = parse(text, { ...f.env, ...env })
      const r = await runList({ ...f, user: c.user }, items, { pipefail: o?.pipefail, last0: Number(env['?'] ?? 0) || 0 })
      tick(w, 2); syncWorld(w)   // the world moves on between script lines, like it does between typed lines
      return { out: r.out, exit: r.exit, ok: r.ok, ranLast: r.ranLast }
    },
    exec: (s2, line) => exec(w, s2, line),
    run: async (a, patch = {}) => invoke(build(f, a, { sudo: c.sudo, immune: c.immune, bg: c.bg, redir: c.redir, pipeNext: c.pipeNext, stdin: c.stdin, stdout: c.stdout, stderr: c.stderr, user: c.user, ...(patch as object) })),
  } as CmdCtx
  return c
}

async function invoke(c: CmdCtx): Promise<number> {
  const name = c.argv[0]
  if (name.includes('/')) return runFile(c, name, c.argv.slice(1), true)   // ./deploy.sh or /opt/myapp/deploy.sh
  const fn = COMMANDS[name]
  const needs = LOCKED[name]
  if (!fn || (needs && needs > c.w.state.stage && name !== 'systemctl')) {
    const stage = needs
    if (stage) { c.err(`Command '${name}' not found`); c.tip(`🔒 \`${name}\` unlocks in Stage ${stage}. In Stage 1 you do everything by hand on purpose, so you feel the pain it fixes.`) }
    else if (APT_HINT[name]) { c.err(`Command '${name}' not found, but can be installed with:`); c.err(''); c.err(`sudo apt install ${APT_HINT[name]}`) }
    else c.err(`${name}: command not found`)
    return 127
  }
  return fn(c)
}

/** Opens redirect targets before the command runs (so `> /etc/x` fails like bash does). Returns an error or the path. */
function openRedirect(f: Frame, op: string, rawTarget: string): { path?: string; err?: string; devnull?: boolean } {
  if (rawTarget === '/dev/null') return { devnull: true }
  const { w, host } = f
  const fs = w.fs[host]
  const cwd = f.sh.ssh && host === 'remote' ? f.sh.ssh.cwd : f.sh.localCwd
  const p0 = resolvePath(rawTarget, cwd, HOME[host])
  const p = realpath(fs, p0, true) ?? p0   // `> link` writes through the link, like bash
  const e = fs[p]
  if (e?.type === 'dir') return { err: `bash: ${rawTarget}: Is a directory` }
  if (e ? !can(e, f.user, 'w') : !fs[parent(p)] || !can(fs[parent(p)], f.user, 'w')) return { err: `bash: ${rawTarget}: ${fs[parent(p)] ? 'Permission denied' : 'No such file or directory'}` }
  if (!e || op === '>' || op === '2>') writeFile(fs, p, '', f.user, w.clock)
  return { path: p }
}

async function runList(f: Frame, items: ListItem[], extra?: { env?: Record<string, string>; pipefail?: boolean; last0?: number }): Promise<{ out: OutLine[]; ok: boolean; exit: number; ranLast: boolean }> {
  const { w, host } = f
  const fs = w.fs[host]
  const out: OutLine[] = []
  let last = extra?.last0 ?? 0, lastOk = true, ranLast = false
  const fill = (s: string) => (s.includes('\u0000Q') ? s.replace(/\u0000Q/g, String(last)) : s)
  const cwd = () => (f.sh.ssh && host === 'remote' ? f.sh.ssh.cwd : f.sh.localCwd)
  for (let k = 0; k < items.length; k++) {
    const it = items[k]
    if ((it.before === '&&' && last !== 0) || (it.before === '||' && last === 0)) continue
    const cmds = it.p.cmds
    if (!cmds.length) continue
    ranLast = k === items.length - 1
    let stdin: string | null = null
    let pipeBad = 0
    for (let i = 0; i < cmds.length; i++) {
      const sc: SimpleCmd = cmds[i]
      const argv: string[] = []
      for (const wd of sc.words) {
        if (wd.glob && sc.words[0].v !== '[[') argv.push(...glob(fs, fill(wd.v), cwd(), HOME[host]))
        else argv.push(fill(wd.v))
      }
      const redir = { stdout: false, stderr: false, errToOut: false }
      const targets: { op: string; path?: string; devnull?: boolean }[] = []
      let bad = false
      for (const r of sc.redirs) {
        if (r.op === '2>&1') { redir.errToOut = true; continue }
        if (r.op === '<') continue
        const o = openRedirect(f, r.op, r.target!.v)
        if (o.err) { out.push({ t: 'err', s: o.err }); bad = true; break }
        if (r.op === '>' || r.op === '>>') redir.stdout = true; else redir.stderr = true
        targets.push({ op: r.op, ...o })
      }
      if (bad) { last = 1; lastOk = false; break }
      const isLast = i === cmds.length - 1
      const next = isLast ? null : cmds[i + 1].words.map((x) => x.v)
      const c = build(f, argv, { stdin, redir, pipeNext: next, bg: it.p.bg })
      if (extra?.env) Object.assign(c.env, extra.env)
      f.result.ok = undefined
      f.mixed = undefined
      const code = await invoke(c)
      last = code
      if (code !== 0) pipeBad = code
      if (isLast && extra?.pipefail && pipeBad) last = pipeBad
      const mx = f.mixed as OutLine[] | undefined
      // a script's lines keep their order on screen; with a redirect they are split into stdout / stderr like any other command
      const ordered = !!mx && isLast && !redir.stdout && !redir.stderr && !redir.errToOut
      if (mx && !ordered) { c.stdout.push(...mx.filter((l) => l.t !== 'err').map((l) => l.s)); c.stderr.push(...mx.filter((l) => l.t === 'err').map((l) => l.s)) }
      lastOk = f.result.ok ?? code === 0
      // route captured output
      const so = c.stdout, se = c.stderr
      const toFile = (path: string | undefined, devnull: boolean | undefined, ls: string[]) => { if (devnull || !path || !ls.length) return; appendText(fs, path, ls.join('\n') + '\n', f.user, w.clock) }
      let showOut = !redir.stdout, showErr = !redir.stderr && !redir.errToOut
      for (const t of targets) {
        if (t.op === '>' || t.op === '>>') { toFile(t.path, t.devnull, redir.errToOut ? [...so, ...se] : so) }
        else toFile(t.path, t.devnull, se)
      }
      if (redir.errToOut && !redir.stdout) { showOut = true; showErr = false; so.push(...se) }
      if (showErr) se.forEach((s) => out.push({ t: 'err', s }))
      if (ordered) mx!.forEach((l) => out.push(l))
      if (isLast) { if (showOut) so.forEach((s) => out.push({ t: 'out', s })) }
      stdin = so.length ? so.join('\n') + '\n' : ''
    }
  }
  return { out, ok: lastOk, exit: last, ranLast }
}

const fail = (s: string): ExecResult => ({ out: [{ t: 'err', s }], ok: false, exit: 2, text: s })

/** Run one typed line in a terminal tab. */
export async function exec(w: World, sh: Shell, line: string): Promise<ExecResult> {
  if (sh.repl) return replInput(w, sh, line)
  const t = line.trim()
  if (!t) return { out: [], ok: true, exit: 0, text: '' }
  if (sh.ssh) w.remoteHistory.push(t); else sh.localHistory.push(t)
  const host = sh.ssh ? 'remote' : 'local'
  const user = sh.ssh ? sh.ssh.user : 'learner'
  const env = { HOME: HOME[host], USER: user, PWD: sh.ssh ? sh.ssh.cwd : sh.localCwd, HOSTNAME: host === 'remote' ? HOSTNAME : 'laptop', SHELL: '/bin/bash', '?': '\u0000Q' }   // $? is filled in per command by runList, so `a; echo $?` sees a's status
  let items: ListItem[]
  try { items = parse(t, env) } catch (e) { return fail(`bash: ${(e as Error).message}`) }
  const f: Frame = { w, sh, host, user, env, pre: [], post: [], tips: [], result: {} }
  const res = await runList(f, items, { last0: sh.last ?? 0 })
  sh.last = res.exit
  return finish(w, f, res)
}

function finish(w: World, f: Frame, r: { out: OutLine[]; ok: boolean; exit: number }): ExecResult {
  tick(w, 3 + (r.out.length % 5))
  syncWorld(w)
  const out = [...f.pre, ...r.out, ...f.post, ...f.tips]
  const { hold, edit, clear, closeTab, secret } = f.result
  return { out, ok: r.ok, exit: r.exit, text: stripAnsi(out.filter((l) => l.t !== 'sys').map((l) => l.s).join('\n')), hold, edit, clear, closeTab, secret }
}

async function replInput(w: World, sh: Shell, line: string): Promise<ExecResult> {
  const r = sh.repl!
  const done = (out: OutLine[], leave: boolean): ExecResult => {
    if (leave) sh.repl = null
    tick(w, 4); syncWorld(w)
    return { out, ok: !out.some((o) => o.t === 'err'), exit: out.some((o) => o.t === 'err') ? 1 : 0, text: stripAnsi(out.map((o) => o.s).join('\n')) }
  }
  if (r.kind === 'psql') { const x = await psqlLine(w, sh, line); return done(x.out, x.leave) }
  if (r.kind === 'sftp') { const x = sftpLine(w, sh, line); return done(x.out, x.leave) }
  // password prompt: replay the original psql with the typed password
  sh.repl = null
  const argv: string[] = JSON.parse(r.replay)
  const host = sh.ssh ? 'remote' : 'local'
  const f: Frame = { w, sh, host, user: sh.ssh?.user ?? 'learner', env: { HOME: HOME[host], '?': '0' }, pre: [], post: [], tips: [], result: {} }
  const res = await runList(f, [{ before: null, p: { bg: false, cmds: [{ words: argv.map((v) => ({ v, glob: false })), redirs: [] }] } }], { env: { PGPASSWORD: line } })
  return finish(w, f, res)
}

/** Ctrl+C on a held command (`tail -f`, foreground java). */
export function interrupt(w: World, hold: Hold): OutLine[] {
  const out: OutLine[] = [{ t: 'out', s: '^C' }]
  if (hold.kind === 'fg' && hold.pid) {
    const t = w.clock
    if (killProc(w, hold.pid, 'stopped')) {
      out.push({ t: 'out', s: `${isoMs(t, 120)}  INFO ${hold.pid} --- [ionShutdownHook] o.s.b.w.e.tomcat.GracefulShutdown        : Commencing graceful shutdown. Waiting for active requests to complete` })
      out.push({ t: 'out', s: `${isoMs(t, 190)}  INFO ${hold.pid} --- [tomcat-shutdown] o.s.b.w.e.tomcat.GracefulShutdown        : Graceful shutdown complete` })
    }
  }
  syncWorld(w)
  return out
}

/** One heartbeat for `tail -f app.log`: a customer request, also written to the real log file so `cat` agrees. */
export function followTick(w: World, hold: Hold): OutLine[] {
  const app = w.procs.find((p) => p.kind === 'app')
  if (hold.kind === 'follow' && hold.path?.startsWith('journal:')) {
    const unit = hold.path.slice(8)
    tick(w, 2)
    syncWorld(w)
    const j = w.x.sd.journal[unit] ?? []
    const before = (hold as Hold & { seen?: number }).seen ?? j.length
    const fresh: OutLine[] = j.slice(before).map((s) => ({ t: 'out' as const, s }))
    const a = w.procs.find((p) => p.kind === 'app' && p.unit === unit)
    if (a && !fresh.length) { const p = ['/api/orders', '/api/health'][w.clock % 2]; const s = `${jdate(w.clock)} shop-server java[${a.pid}]: ${isoMs(w.clock, 233)}  INFO ${a.pid} --- [nio-8080-exec-${1 + (w.clock % 4)}] com.shop.web.OrderController : GET ${p} -> 200 (${9 + (w.clock % 13)} ms)`; j.push(s); w.x.sd.journal[unit] = j; fresh.push({ t: 'out', s }) }
    ;(hold as Hold & { seen?: number }).seen = (w.x.sd.journal[unit] ?? []).length
    return fresh
  }
  if (hold.kind !== 'follow' || !hold.path || !app || !hold.path.endsWith('.log') && !hold.path.endsWith('.out')) return []
  tick(w, 2)
  const paths = ['/api/orders', '/api/health', '/api/orders']
  const p = paths[w.clock % 3]
  const s = `${isoMs(w.clock, 233)}  INFO ${app.pid} --- [nio-8080-exec-${1 + (w.clock % 4)}] com.shop.web.OrderController           : GET ${p} -> 200 (${9 + (w.clock % 13)} ms)`
  appendText(w.fs[hold.host], hold.path, s + '\n', 'ubuntu', w.clock)
  return [{ t: 'out', s }]
}

/** Closing the whole tab (or the PuTTY window) hangs up any ssh session inside it. */
export function closeShell(w: World, sh: Shell): number[] {
  const killed = sh.ssh ? closeSsh(w, sh.ssh.id) : []
  sh.ssh = null; sh.repl = null
  syncWorld(w)
  return killed
}

/** Tab completion: candidates for the last word of the line. */
export function complete(w: World, sh: Shell, line: string): string[] {
  const m = /(\S*)$/.exec(line)!
  const word = m[1]
  const first = !/\s/.test(line.trimStart())
  if (first) return Object.keys(COMMANDS).filter((k) => k.startsWith(word)).sort()
  const host = sh.ssh ? 'remote' : 'local'
  const cwd = sh.ssh ? sh.ssh.cwd : sh.localCwd
  const slash = word.lastIndexOf('/')
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : ''
  const dir = resolvePath(dirPart || '.', cwd, HOME[host])
  const fs = w.fs[host]
  if (fs[dir]?.type !== 'dir') return []
  const stem = word.slice(slash + 1)
  return listDir(fs, dir).filter((n) => n.startsWith(stem) && (stem.startsWith('.') || !n.startsWith('.'))).map((n) => dirPart + n + (fs[dir === '/' ? `/${n}` : `${dir}/${n}`].type === 'dir' ? '/' : ''))
}

