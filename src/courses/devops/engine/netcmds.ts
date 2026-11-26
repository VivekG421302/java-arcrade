// Network-facing commands. ssh/scp/sftp share one key check, so a world-readable .pem fails the same way everywhere (Chaos 1.4).
import { base, can, join, listDir, mkdirp, parent, writeFile, type Fs } from './fs'
import { httpRequest } from './app'
import { HOME, LOCAL_PROJECT, openSsh, pgAccepting, PUBLIC_IP, longDate, serverDown, ufwBlocks, type World } from './world'
import { DOMAIN, listensOn } from './nginx'
import { flagsOf } from './corecmds'
import type { CmdCtx, CmdFn, OutLine, Shell } from './shellTypes'

const KEY_MARKER = 'SHOP-SERVER-KEY'

/** Mirrors OpenSSH: unreadable key, too-open permissions, wrong key, wrong user -> the same final "Permission denied (publickey)". */
function authenticate(c: CmdCtx, key: string | null, user: string, host: string): string[] | null {
  const denied = `${user}@${host}: Permission denied (publickey).`
  if (!key) return [denied]
  const p = c.abs(key), e = c.fs[p]
  if (!e) return [`Warning: Identity file ${key} not accessible: No such file or directory.`, denied]
  const mode = e.mode.padStart(3, '0')
  if (mode[1] !== '0' || mode[2] !== '0') {
    const bar = '@'.repeat(59)
    return [
      bar, '@         WARNING: UNPROTECTED PRIVATE KEY FILE!          @', bar,
      `Permissions 0${mode} for '${key}' are too open.`,
      'It is required that your private key files are NOT accessible by others.',
      'This private key will be ignored.',
      `Load key "${key}": bad permissions`, denied,
    ]
  }
  if (!(e.content ?? '').includes(KEY_MARKER)) return [`Load key "${key}": invalid format`, denied]
  if (user !== 'ubuntu') return [denied]
  return null
}

const parseTarget = (t: string) => { const m = /^(?:([\w.-]+)@)?([\w.-]+)$/.exec(t); return m ? { user: m[1] ?? 'learner', host: m[2] } : null }

function reach(c: CmdCtx, host: string, prog: string): boolean {
  if (host === PUBLIC_IP || host === DOMAIN) {
    if (serverDown(c.w)) { c.err(`${prog}: connect to host ${host} port 22: Connection refused`); c.tip('The server is still rebooting (real ones take 30 to 60 seconds). Wait a moment, try `sleep 10`, then connect again.'); return false }
    if (ufwBlocks(c.w, 22)) { c.err(`${prog}: connect to host ${host} port 22: Connection timed out`); c.tip('Nothing answers on port 22 at all. When you cannot reach the server by network, the hosting company\'s rescue console is your way back in.'); return false }
    return true
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(host)) c.err(`${prog}: connect to host ${host} port 22: Connection timed out`)
  else c.err(`${prog}: Could not resolve hostname ${host}: Name or service not known`)
  return false
}

const BANNER = (w: World) => [
  'Welcome to Ubuntu 22.04.4 LTS (GNU/Linux 5.15.0-1060-aws x86_64)',
  '',
  ' * Documentation:  https://help.ubuntu.com',
  ' * Management:     https://landscape.canonical.com',
  ' * Support:        https://ubuntu.com/pro',
  '',
  `  System information as of ${longDate(w.clock)}`,
  '',
  '  System load:  0.08              Processes:             104',
  `  Usage of /:   ${w.state.disks.rootUsedPct}.2% of 19.20GB   Users logged in:       ${w.ssh.length}`,
  '  Memory usage: 41%               IPv4 address for eth0: 203.0.113.10',
  '',
  'Last login: Tue Nov 24 08:41:27 2026 from 198.51.100.7',
]

const ssh: CmdFn = async (c) => {
  const { values, operands } = flagsOf(c.argv.slice(1), ['i', 'p', 'o', 'l'])
  const tgt = operands[0] ? parseTarget(operands[0]) : null
  if (!tgt) { c.err('usage: ssh [-i identity_file] [-p port] [user@]hostname [command]'); return 255 }
  if (c.host === 'remote') { c.err(`${tgt.user}@${tgt.host}: Permission denied (publickey).`); return 255 }
  if (!reach(c, tgt.host, 'ssh')) return 255
  const fail = authenticate(c, values.i ?? null, tgt.user, tgt.host)
  if (fail) { fail.forEach((l) => c.err(l)); return 255 }
  const kh = `${HOME.local}/.ssh/known_hosts`
  if (!c.w.fs.local[kh]) {
    mkdirp(c.w.fs.local, `${HOME.local}/.ssh`, 'learner', c.w.clock)
    writeFile(c.w.fs.local, kh, `${PUBLIC_IP} ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIH...\n`, 'learner', c.w.clock, '644')
    c.err(`Warning: Permanently added '${PUBLIC_IP}' (ED25519) to the list of known hosts.`)
  }
  const cmd = operands.slice(1).join(' ')
  if (cmd) {
    // one-shot: run the command through a throw-away remote shell, no banner, no lingering session
    const tmp: Shell = { id: -1, localCwd: c.cwd, localHistory: [], ssh: { id: -1, user: 'ubuntu', cwd: HOME.remote }, repl: null }
    const r = await c.exec(tmp, cmd)
    r.out.forEach((l) => (l.t === 'err' ? c.err(l.s) : c.out(l.s)))
    c.result.ok = r.ok
    return r.exit
  }
  const slot = openSsh(c.w)
  c.sh.ssh = { id: slot.id, user: 'ubuntu', cwd: HOME.remote }
  BANNER(c.w).forEach((l) => c.out(l))
  return 0
}

const size = (n: number) => (n >= 1048576 ? `${Math.round(n / 1048576)}MB` : n >= 1024 ? `${Math.round(n / 1024)}KB` : `${n}B`)
const progress = (name: string, n: number) => `${name.padEnd(46).slice(0, 46)}100% ${size(n).padStart(5)}  12.4MB/s   00:03`

const splitRemote = (s: string) => { const m = /^(?:([\w.-]+)@)?([\w.-]+):(.*)$/.exec(s); return m && !s.startsWith('/') && !s.startsWith('.') ? { user: m[1] ?? 'learner', host: m[2], path: m[3] || '.' } : null }

/** Copy one file between the two machines. Returns an error string or null. */
export function transfer(w: World, dir: 'up' | 'down', from: string, to: string, localUser: string, remoteUser: string): { err: string | null; dest: string; bytes: number } {
  const src: Fs = dir === 'up' ? w.fs.local : w.fs.remote
  const dst: Fs = dir === 'up' ? w.fs.remote : w.fs.local
  const e = src[from]
  if (!e) return { err: `${from}: No such file or directory`, dest: to, bytes: 0 }
  if (e.type === 'dir') return { err: `${from}: not a regular file`, dest: to, bytes: 0 }
  if (!can(e, dir === 'up' ? localUser : remoteUser, 'r')) return { err: `${from}: Permission denied`, dest: to, bytes: 0 }
  const dest = dst[to]?.type === 'dir' ? join(to, base(from)) : to
  const par = dst[parent(dest)]
  const who = dir === 'up' ? remoteUser : localUser
  if (!par) return { err: `${to}: No such file or directory`, dest, bytes: 0 }
  if (!can(par, who, 'w') || (dst[dest] && !can(dst[dest], who, 'w'))) return { err: `${dest}: Permission denied`, dest, bytes: 0 }
  dst[dest] = { ...e, owner: who, mtime: w.clock }
  w.x.sftp.transfers++
  return { err: null, dest, bytes: e.size }
}

const scp: CmdFn = (c) => {
  const { values, operands } = flagsOf(c.argv.slice(1), ['i', 'P', 'o'])
  if (operands.length < 2) { c.err('usage: scp [-i identity_file] [-P port] source ... target'); return 1 }
  if (c.host === 'remote') { c.err('scp: run this from your laptop: the delivery van starts at your laptop.'); return 1 }
  const [a, b] = [operands[0], operands[1]]
  const ra = splitRemote(a), rb = splitRemote(b)
  const r = ra ?? rb
  if (!r || (ra && rb)) { c.err('scp: please give exactly one remote side, like ubuntu@203.0.113.10:/opt/myapp/'); return 1 }
  if (!reach(c, r.host, 'ssh')) { c.err('scp: Connection closed'); return 1 }
  const fail = authenticate(c, values.i ?? null, r.user, r.host)
  if (fail) { fail.forEach((l) => c.err(l)); c.err('scp: Connection closed'); return 255 }
  const up = !!rb
  const from = up ? c.abs(a) : r.path.startsWith('/') ? r.path : join(HOME.remote, r.path)
  const to = up ? (r.path.startsWith('/') ? r.path : join(HOME.remote, r.path)) : c.abs(b)
  const res = transfer(c.w, up ? 'up' : 'down', from, to, 'learner', 'ubuntu')
  if (res.err) { c.err(`scp: ${up ? (rb ? res.err : res.err) : res.err}`); return 1 }
  c.out(progress(base(from), res.bytes))
  return 0
}

// ---------- sftp command-line client ----------

const sftp: CmdFn = (c) => {
  const { values, operands } = flagsOf(c.argv.slice(1), ['i', 'P', 'o'])
  const tgt = operands[0] ? parseTarget(operands[0]) : null
  if (!tgt) { c.err('usage: sftp [-i identity_file] [user@]host'); return 1 }
  if (c.host === 'remote') { c.err(`${tgt.user}@${tgt.host}: Permission denied (publickey).`); return 255 }
  if (!reach(c, tgt.host, 'ssh')) { c.err('Connection closed'); return 255 }
  const fail = authenticate(c, values.i ?? null, tgt.user, tgt.host)
  if (fail) { fail.forEach((l) => c.err(l)); c.err('Connection closed'); return 255 }
  c.sh.repl = { kind: 'sftp', lcwd: c.cwd, rcwd: HOME.remote }
  c.out(`Connected to ${tgt.host}.`)
  return 0
}

export function sftpLine(w: World, sh: Shell, line: string): { out: OutLine[]; leave: boolean } {
  const r = sh.repl
  if (!r || r.kind !== 'sftp') return { out: [], leave: true }
  const out: OutLine[] = []
  const o = (s: string) => out.push({ t: 'out', s }), e = (s: string) => out.push({ t: 'err', s })
  const [cmd, ...a] = line.trim().split(/\s+/)
  const rabs = (p: string) => (p.startsWith('/') ? p : join(r.rcwd, p))
  const labs = (p: string) => (p.startsWith('/') ? p : join(r.lcwd, p))
  switch (cmd) {
    case '': break
    case 'exit': case 'bye': case 'quit': return { out, leave: true }
    case 'pwd': o(`Remote working directory: ${r.rcwd}`); break
    case 'lpwd': o(`Local working directory: ${r.lcwd}`); break
    case 'cd': { const p = rabs(a[0] ?? HOME.remote); if (w.fs.remote[p]?.type === 'dir') r.rcwd = p; else e(`Couldn't stat remote file: No such file or directory`); break }
    case 'lcd': { const p = labs(a[0] ?? HOME.local); if (w.fs.local[p]?.type === 'dir') r.lcwd = p; else e(`local chdir to ${a[0]} failed: No such file or directory`); break }
    case 'ls': case 'lls': {
      const fs = cmd === 'ls' ? w.fs.remote : w.fs.local
      const d = cmd === 'ls' ? rabs(a[0] ?? '.') : labs(a[0] ?? '.')
      const dir = d.endsWith('/.') ? d.slice(0, -2) || '/' : d
      if (fs[dir]?.type !== 'dir') e(`Can't ls: "${dir}" not found`)
      else listDir(fs, dir).filter((n) => !n.startsWith('.')).forEach((n) => o(n))
      break
    }
    case 'put': case 'get': {
      if (!a[0]) { e(`usage: ${cmd} [-afpR] remote-path [local-path]`); break }
      const up = cmd === 'put'
      const from = up ? labs(a[0]) : rabs(a[0])
      const to = a[1] ? (up ? rabs(a[1]) : labs(a[1])) : up ? join(r.rcwd, base(from)) : join(r.lcwd, base(from))
      const res = transfer(w, up ? 'up' : 'down', from, to, 'learner', 'ubuntu')
      if (res.err) e(up ? `remote open("${to}"): ${res.err.includes('Permission') ? 'Permission denied' : res.err}` : `local open("${to}"): ${res.err}`)
      else { o(`${up ? 'Uploading' : 'Fetching'} ${from} to ${res.dest}`); o(progress(base(from), res.bytes)) }
      break
    }
    case 'help': case '?': o('Available commands: cd, lcd, ls, lls, pwd, lpwd, get, put, bye (exit)'); break
    default: e(`Invalid command.`)
  }
  return { out, leave: false }
}

// ---------- HTTP ----------

const REASON: Record<number, string> = { 200: 'OK', 301: 'Moved Permanently', 400: 'Bad Request', 404: 'Not Found', 500: 'Internal Server Error', 502: 'Bad Gateway', 503: 'Service Unavailable' }

const curl: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1).filter((a) => !a.startsWith('--')), ['o', 'X', 'H', 'm'])
  let url = operands[0]
  if (!url) { c.err("curl: try 'curl --help' or 'curl --manual' for more information"); return 2 }
  for (let hop = 0; hop < 6; hop++) {
    const r = httpRequest(c.w, c.host, url)
    if (r.kind === 'fail') { c.err(r.msg); return r.code }
    if (flags.has('i') || flags.has('I')) {
      c.out(r.proto === 'HTTP/2' ? `HTTP/2 ${r.status}` : `HTTP/1.1 ${r.status} ${REASON[r.status] ?? ''}`.trimEnd())
      r.headers.forEach((h) => c.out(h)); c.out('')
    }
    if (flags.has('L') && r.location) { url = r.location; continue }
    if (!flags.has('I')) c.out(r.body)
    return 0
  }
  c.err('curl: (47) Maximum (50) redirects followed')
  return 47
}

const wget: CmdFn = (c) => {
  const url = c.argv.slice(1).find((a) => !a.startsWith('-'))
  if (!url) { c.err('wget: missing URL'); return 1 }
  const r = httpRequest(c.w, c.host, url)
  if (r.kind === 'fail') { c.err(`Connecting to ${url}... failed: ${r.code === 7 ? 'Connection refused' : 'Name or service not known'}.`); return 4 }
  const name = base(url) || 'index.html'
  writeFile(c.fs, join(c.cwd, name), r.body + '\n', c.user, c.w.clock)
  c.out(`HTTP request sent, awaiting response... ${r.status}`); c.out(`Saving to: '${name}'`); c.out(`'${name}' saved [${r.body.length}]`)
  return r.status === 200 ? 0 : 8
}

// ---------- listeners & addresses ----------

const ss: CmdFn = (c) => {
  const { flags } = flagsOf(c.argv.slice(1))
  const showProc = flags.has('p')
  const pad = (a: string, b: string, cc: string, d: string, e: string, p: string) => `${a.padEnd(7)}${b.padEnd(7)}${cc.padEnd(7)}${d.padStart(24)} ${e.padStart(14)}${showProc && p ? '   ' + p : ''}`
  c.out(pad('State', 'Recv-Q', 'Send-Q', 'Local Address:Port', 'Peer Address:Port', showProc ? 'Process' : ''))
  const mine = (owner: string) => c.user === 'root' || c.user === owner
  const proc = (name: string, pid: number, owner: string, fd: number) => (mine(owner) ? `users:(("${name}",pid=${pid},fd=${fd}))` : '')
  if (c.host === 'local') { c.out(pad('LISTEN', '0', '4096', '127.0.0.53%lo:53', '0.0.0.0:*', '')); return 0 }
  const w = c.w
  c.out(pad('LISTEN', '0', '4096', '127.0.0.53%lo:53', '0.0.0.0:*', proc('systemd-resolve', 521, 'root', 14)))
  c.out(pad('LISTEN', '0', '128', '0.0.0.0:22', '0.0.0.0:*', proc('sshd', w.sshdPid, 'root', 3)))
  const ng = w.procs.find((p) => p.unit === 'nginx' && p.cmd.startsWith('nginx: master'))
  for (const port of [80, 443]) if (ng && listensOn(w, port)) c.out(pad('LISTEN', '0', '511', `0.0.0.0:${port}`, '0.0.0.0:*', proc('nginx', ng.pid + 1, 'root', 6)))
  const pg = w.procs.find((p) => p.kind === 'postgres')
  if (pgAccepting(w) && pg) {
    c.out(pad('LISTEN', '0', '244', '127.0.0.1:5432', '0.0.0.0:*', proc('postgres', pg.pid, 'postgres', 5)))
  }
  const app = w.procs.find((p) => p.kind === 'app')
  if (app) c.out(pad('LISTEN', '0', '100', '*:8080', '*:*', proc('java', app.pid, 'ubuntu', 9)))
  c.out(pad('LISTEN', '0', '128', '[::]:22', '[::]:*', proc('sshd', w.sshdPid, 'root', 4)))
  if (pgAccepting(w) && pg) c.out(pad('LISTEN', '0', '244', '[::1]:5432', '[::]:*', proc('postgres', pg.pid, 'postgres', 4)))
  return 0
}

const ip: CmdFn = (c) => {
  const addr = c.host === 'remote' ? `${PUBLIC_IP}/24 metric 100 brd 203.0.113.255` : '192.168.1.24/24 brd 192.168.1.255'
  const mac = c.host === 'remote' ? '02:42:ac:11:00:02' : 'a4:5e:60:c1:2b:9f'
  ;[
    '1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default qlen 1000',
    '    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00',
    '    inet 127.0.0.1/8 scope host lo',
    '       valid_lft forever preferred_lft forever',
    '2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default qlen 1000',
    `    link/ether ${mac} brd ff:ff:ff:ff:ff:ff`,
    `    inet ${addr} scope global dynamic eth0`,
    '       valid_lft 3011sec preferred_lft 3011sec',
  ].forEach((l) => c.out(l))
  return 0
}

export const NET: Record<string, CmdFn> = { ssh, scp, sftp, curl, wget, ss, ip }
export { LOCAL_PROJECT }
