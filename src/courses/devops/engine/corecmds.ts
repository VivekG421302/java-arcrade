// Core Linux commands for the simulated terminal. Each handler prints what the real command prints, including real error text.
import { base, can, humanSize, join, listDir, mkdirp, modeString, parent, removeTree, copyTree, moveTree, writeFile, type FsEntry } from './fs'
import { glob } from './fs'
import { appProc, hhmm, killProc, lsDate, longDate, pad, PUBLIC_IP, HOSTNAME, tick, type Proc } from './world'
import type { CmdCtx, CmdFn } from './shellTypes'

/** Split argv into single-letter flags and operands (`-lh` -> l, h). Long options are returned in `long`. */
export function flagsOf(args: string[], withValue: string[] = []) {
  const flags = new Set<string>(), operands: string[] = [], long: string[] = [], values: Record<string, string> = {}
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '--') { operands.push(...args.slice(i + 1)); break }
    if (a.startsWith('--')) long.push(a)
    else if (a.length > 1 && a[0] === '-' && !/^-\d+$/.test(a)) {
      for (let j = 1; j < a.length; j++) {
        const ch = a[j]
        flags.add(ch)
        if (withValue.includes(ch)) { values[ch] = a.slice(j + 1) || args[++i] || ''; break }
      }
    } else operands.push(a)
  }
  return { flags, operands, long, values }
}

const lines = (s: string) => (s === '' ? [] : s.replace(/\n$/, '').split('\n'))

// ---------- navigation & listing ----------

const pwd: CmdFn = (c) => { c.out(c.cwd); return 0 }

const cd: CmdFn = (c) => {
  const target = c.argv[1] ?? '~'
  const p = c.abs(target === '-' ? c.home : target)
  const e = c.fs[p]
  if (!e) { c.err(`bash: cd: ${target}: No such file or directory`); return 1 }
  if (e.type !== 'dir') { c.err(`bash: cd: ${target}: Not a directory`); return 1 }
  if (!can(e, c.user, 'x')) { c.err(`bash: cd: ${target}: Permission denied`); return 1 }
  c.setCwd(p)
  return 0
}

const ls: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  const long = flags.has('l'), all = flags.has('a'), almost = flags.has('A'), human = flags.has('h'), dirOnly = flags.has('d')
  const paths = operands.length ? operands : ['.']
  let code = 0
  const files: [string, FsEntry][] = []
  const dirs: [string, string][] = []
  for (const p of paths) {
    const ap = c.abs(p), e = c.fs[ap]
    if (!e) {
      c.err(`ls: cannot access '${p}': No such file or directory`); code = 2
      if (/\.jar/.test(p)) c.tip('Did the build fail above? Run `mvn clean package` on your laptop first, then look again.')
      continue
    }
    if (e.type === 'dir' && !dirOnly) dirs.push([p, ap]); else files.push([p, e])
  }
  const render = (entries: [string, FsEntry][]) => {
    if (!long) { wrapNames(entries.map(([n]) => n)).forEach((l) => c.out(l)); return }
    const rows = entries.map(([n, e]) => {
      const subdirs = e.type === 'dir' ? Object.keys(c.fs).filter((k) => parent(k) === (n === '.' || n === '..' ? c.abs(n) : c.abs(n)) && c.fs[k].type === 'dir' && k !== '/').length : 0
      return [modeString(e), String(e.type === 'dir' ? 2 + subdirs : 1), e.owner, e.owner, human ? humanSize(e.size) : String(e.size), lsDate(e.mtime), n]
    })
    const wid = [1, 2, 3, 4].map((i) => Math.max(...rows.map((r) => r[i].length)))
    for (const r of rows) c.out(`${r[0]} ${r[1].padStart(wid[0])} ${r[2].padEnd(wid[1])} ${r[3].padEnd(wid[2])} ${r[4].padStart(wid[3])} ${r[5]} ${r[6]}`)
  }
  if (files.length) render(files)
  dirs.forEach(([p, ap], i) => {
    if (files.length || dirs.length > 1) { if (i || files.length) c.out(''); c.out(`${p}:`) }
    const dirEntry = c.fs[ap]
    if (!can(dirEntry, c.user, 'r')) { c.err(`ls: cannot open directory '${p}': Permission denied`); code = 2; return }
    let names = listDir(c.fs, ap)
    if (!all && !almost) names = names.filter((n) => !n.startsWith('.'))
    const entries: [string, FsEntry][] = names.map((n) => [n, c.fs[join(ap, n)]])
    if (all) entries.unshift(['.', dirEntry], ['..', c.fs[parent(ap)] ?? dirEntry])
    if (long) c.out(`total ${entries.reduce((s, [, e]) => s + Math.max(4, Math.ceil(e.size / 4096) * 4), 0)}`)
    render(entries)
  })
  return code
}

function wrapNames(names: string[]): string[] {
  const out: string[] = []
  let cur = ''
  for (const n of names) {
    const next = cur ? `${cur}  ${n}` : n
    if (cur && next.length > 78) { out.push(cur); cur = n } else cur = next
  }
  if (cur) out.push(cur)
  return out
}

// ---------- reading & writing files ----------

const cat: CmdFn = (c) => {
  const files = c.argv.slice(1)
  if (!files.length) { lines(c.stdin ?? '').forEach((l) => c.out(l)); return 0 }
  let code = 0
  for (const f of files) {
    const e = c.fs[c.abs(f)]
    if (!e) { c.err(`cat: ${f}: No such file or directory`); code = 1 }
    else if (e.type === 'dir') { c.err(`cat: ${f}: Is a directory`); code = 1 }
    else if (!can(e, c.user, 'r')) { c.err(`cat: ${f}: Permission denied`); code = 1 }
    else lines(e.content ?? `[binary data, ${e.size} bytes]\n`).forEach((l) => c.out(l))
  }
  return code
}

const echo: CmdFn = (c) => {
  let args = c.argv.slice(1)
  let noNl = false, esc = false
  while (args[0] && /^-[neE]+$/.test(args[0])) { if (args[0].includes('n')) noNl = true; if (args[0].includes('e')) esc = true; args = args.slice(1) }
  let text = args.join(' ')
  if (esc) text = text.replace(/\\n/g, '\n').replace(/\\t/g, '\t')
  void noNl
  text.split('\n').forEach((l) => c.out(l))
  return 0
}

const mkdir: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  let code = 0
  for (const d of operands) {
    const p = c.abs(d)
    if (c.fs[p]) { if (!flags.has('p')) { c.err(`mkdir: cannot create directory '${d}': File exists`); code = 1 } continue }
    const par = c.fs[parent(p)]
    if (!par && !flags.has('p')) { c.err(`mkdir: cannot create directory '${d}': No such file or directory`); code = 1; continue }
    const anc = (() => { let q = parent(p); while (q !== '/' && !c.fs[q]) q = parent(q); return c.fs[q] })()
    if (!anc || !can(anc, c.user, 'w')) { c.err(`mkdir: cannot create directory '${d}': Permission denied`); code = 1; continue }
    mkdirp(c.fs, p, c.user, c.w.clock)
  }
  return code
}

const touch: CmdFn = (c) => {
  let code = 0
  for (const f of c.argv.slice(1)) {
    const p = c.abs(f), e = c.fs[p]
    if (e) { e.mtime = c.w.clock; continue }
    const par = c.fs[parent(p)]
    if (!par) { c.err(`touch: cannot touch '${f}': No such file or directory`); code = 1; continue }
    if (!can(par, c.user, 'w')) { c.err(`touch: cannot touch '${f}': Permission denied`); code = 1; continue }
    writeFile(c.fs, p, '', c.user, c.w.clock)
  }
  return code
}

const rm: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  const rec = flags.has('r') || flags.has('R'), force = flags.has('f')
  let code = 0
  for (const f of operands) {
    const p = c.abs(f), e = c.fs[p]
    if (!e) { if (!force) { c.err(`rm: cannot remove '${f}': No such file or directory`); code = 1 } continue }
    if (e.type === 'dir' && !rec) { c.err(`rm: cannot remove '${f}': Is a directory`); code = 1; continue }
    if (!can(c.fs[parent(p)], c.user, 'w')) { c.err(`rm: cannot remove '${f}': Permission denied`); code = 1; continue }
    removeTree(c.fs, p)
  }
  return code
}

function destOf(c: CmdCtx, src: string, dst: string) {
  const dp = c.abs(dst), de = c.fs[dp]
  return de?.type === 'dir' ? join(dp, base(c.abs(src))) : dp
}

const cp: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  if (operands.length < 2) { c.err(`cp: missing destination file operand after '${operands[0] ?? ''}'`); return 1 }
  const [src, dst] = [operands[0], operands[operands.length - 1]]
  const sp = c.abs(src), se = c.fs[sp]
  if (!se) { c.err(`cp: cannot stat '${src}': No such file or directory`); return 1 }
  if (se.type === 'dir' && !(flags.has('r') || flags.has('R') || flags.has('a'))) { c.err(`cp: -r not specified; omitting directory '${src}'`); return 1 }
  if (!can(se, c.user, 'r')) { c.err(`cp: cannot open '${src}' for reading: Permission denied`); return 1 }
  const to = destOf(c, src, dst)
  if (!c.fs[parent(to)]) { c.err(`cp: cannot create regular file '${dst}': No such file or directory`); return 1 }
  if (!can(c.fs[parent(to)], c.user, 'w')) { c.err(`cp: cannot create regular file '${dst}': Permission denied`); return 1 }
  copyTree(c.fs, sp, to, c.user, c.w.clock)
  return 0
}

const mv: CmdFn = (c) => {
  const ops = c.argv.slice(1).filter((a) => !a.startsWith('-'))
  if (ops.length < 2) { c.err(`mv: missing destination file operand after '${ops[0] ?? ''}'`); return 1 }
  const [src, dst] = [ops[0], ops[ops.length - 1]]
  const sp = c.abs(src)
  if (!c.fs[sp]) { c.err(`mv: cannot stat '${src}': No such file or directory`); return 1 }
  const to = destOf(c, src, dst)
  if (!c.fs[parent(to)]) { c.err(`mv: cannot move '${src}' to '${dst}': No such file or directory`); return 1 }
  if (!can(c.fs[parent(to)], c.user, 'w') || !can(c.fs[parent(sp)], c.user, 'w')) { c.err(`mv: cannot move '${src}' to '${dst}': Permission denied`); return 1 }
  moveTree(c.fs, sp, to)
  return 0
}

function applyMode(cur: string, spec: string, isDir: boolean): string | null {
  if (/^[0-7]{3,4}$/.test(spec)) return spec.slice(-3)
  let bits = cur.padStart(3, '0').split('').map(Number)
  for (const clause of spec.split(',')) {
    const m = /^([ugoa]*)([-+=])([rwxX]*)$/.exec(clause)
    if (!m) return null
    const who = m[1] || 'a'
    const v = [...m[3]].reduce((n, ch) => n | (ch === 'r' ? 4 : ch === 'w' ? 2 : ch === 'x' || (ch === 'X' && isDir) ? 1 : 0), 0)
    const idx = (ch: string) => (ch === 'u' ? [0] : ch === 'g' ? [1] : ch === 'o' ? [2] : [0, 1, 2])
    const targets = [...new Set([...who].flatMap(idx))]
    bits = bits.map((b, i) => (!targets.includes(i) ? b : m[2] === '+' ? b | v : m[2] === '-' ? b & ~v : v))
  }
  return bits.join('')
}

const chmod: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1).filter((a) => !/^-[rwxugoa+=,-][rwxugoa+=,-]*$/.test(a) || /^-R$/.test(a) || /^-v$/.test(a)))
  const spec = c.argv.slice(1).find((a) => /^(\d{3,4}|[ugoa]*[-+=][rwxX]*(,[ugoa]*[-+=][rwxX]*)*)$/.test(a))
  if (!spec) { c.err(`chmod: missing operand${operands.length ? ` after '${operands[0]}'` : ''}`); return 1 }
  const files = operands.filter((o) => o !== spec)
  if (!files.length) { c.err(`chmod: missing operand after '${spec}'`); return 1 }
  let code = 0
  for (const f of files) {
    const p = c.abs(f), e = c.fs[p]
    if (!e) { c.err(`chmod: cannot access '${f}': No such file or directory`); code = 1; continue }
    if (c.user !== 'root' && c.user !== e.owner) { c.err(`chmod: changing permissions of '${f}': Operation not permitted`); code = 1; continue }
    const next = applyMode(e.mode, spec, e.type === 'dir')
    if (!next) { c.err(`chmod: invalid mode: '${spec}'`); return 1 }
    const apply = (q: string) => { c.fs[q].mode = next }
    apply(p)
    if (flags.has('R')) for (const q of Object.keys(c.fs)) if (q.startsWith(p + '/')) apply(q)
  }
  return code
}

const chown: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  const [who, ...files] = operands
  if (!who || !files.length) { c.err(`chown: missing operand${who ? ` after '${who}'` : ''}`); return 1 }
  const owner = who.split(':')[0]
  let code = 0
  for (const f of files) {
    const p = c.abs(f), e = c.fs[p]
    if (!e) { c.err(`chown: cannot access '${f}': No such file or directory`); code = 1; continue }
    if (c.user !== 'root') { c.err(`chown: changing ownership of '${f}': Operation not permitted`); code = 1; continue }
    e.owner = owner
    if (flags.has('R')) for (const q of Object.keys(c.fs)) if (q.startsWith(p + '/')) c.fs[q].owner = owner
  }
  return code
}

// ---------- text tools ----------

/** grep patterns are BRE by default (\| \( \) \+ \? are operators, bare | ( ) + ? are literal); -E switches to JS regex syntax. */
function toRegex(pat: string, ext: boolean, fixed: boolean, ignore: boolean, word: boolean): RegExp {
  let src: string
  if (fixed) src = pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  else if (ext) src = pat
  else {
    src = ''
    for (let i = 0; i < pat.length; i++) {
      const ch = pat[i]
      if (ch === '\\' && '|()+?{}'.includes(pat[i + 1] ?? '')) { src += pat[++i]; continue }
      if ('|()+?{}'.includes(ch)) { src += '\\' + ch; continue }
      src += ch
    }
  }
  return new RegExp(word ? `\\b(?:${src})\\b` : src, ignore ? 'i' : '')
}

const grep: CmdFn = (c) => {
  const { flags, operands, values } = flagsOf(c.argv.slice(1).filter((a) => !a.startsWith('--color')), ['e'])
  const pat = values.e ?? operands.shift()
  if (pat === undefined) { c.err('Usage: grep [OPTION]... PATTERNS [FILE]...'); return 2 }
  let re: RegExp
  try { re = toRegex(pat, flags.has('E'), flags.has('F'), flags.has('i'), flags.has('w')) } catch { c.err(`grep: Invalid regular expression`); return 2 }
  const sources: [string | null, string[]][] = []
  if (!operands.length) sources.push([null, lines(c.stdin ?? '')])
  let code = 1
  for (const f of operands) {
    const e = c.fs[c.abs(f)]
    if (!e) { c.err(`grep: ${f}: No such file or directory`); code = 2; continue }
    if (e.type === 'dir') { c.err(`grep: ${f}: Is a directory`); continue }
    if (!can(e, c.user, 'r')) { c.err(`grep: ${f}: Permission denied`); code = 2; continue }
    sources.push([f, lines(e.content ?? '')])
  }
  let count = 0
  for (const [name, ls] of sources) {
    ls.forEach((l, i) => {
      if (re.test(l) === flags.has('v')) return
      count++; if (code === 1) code = 0
      if (flags.has('c')) return
      const prefix = (name && sources.length > 1 ? `${name}:` : '') + (flags.has('n') ? `${i + 1}:` : '')
      c.out(prefix + l)
    })
  }
  if (flags.has('c')) c.out(String(count))
  return code
}

const headTail = (which: 'head' | 'tail'): CmdFn => (c) => {
  const args = c.argv.slice(1)
  let n = 10
  const follow = args.includes('-f') || args.includes('-F')
  const files: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '-n') n = Number(args[++i]); else if (/^-n\d+$/.test(a)) n = Number(a.slice(2)); else if (/^-\d+$/.test(a)) n = Number(a.slice(1))
    else if (a === '-f' || a === '-F') continue; else if (!a.startsWith('-')) files.push(a)
  }
  const pick = (ls: string[]) => (which === 'head' ? ls.slice(0, n) : ls.slice(Math.max(0, ls.length - n)))
  if (!files.length) { pick(lines(c.stdin ?? '')).forEach((l) => c.out(l)); return 0 }
  let code = 0
  for (const f of files) {
    const e = c.fs[c.abs(f)]
    if (!e) { c.err(`${which}: cannot open '${f}' for reading: No such file or directory`); code = 1; continue }
    if (!can(e, c.user, 'r')) { c.err(`${which}: cannot open '${f}' for reading: Permission denied`); code = 1; continue }
    if (files.length > 1) c.out(`==> ${f} <==`)
    pick(lines(e.content ?? '')).forEach((l) => c.out(l))
  }
  if (which === 'tail' && follow && code === 0) c.result.hold = { kind: 'follow', label: `tail -f ${files[0]}`, host: c.host, path: c.abs(files[0]) }
  return code
}

const wc: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  const text = operands.length ? (c.fs[c.abs(operands[0])]?.content ?? '') : (c.stdin ?? '')
  const n = text === '' ? 0 : text.replace(/\n$/, '').split('\n').length
  c.out(flags.has('l') ? `${n}${operands.length ? ' ' + operands[0] : ''}` : `${n} ${text.split(/\s+/).filter(Boolean).length} ${text.length}${operands.length ? ' ' + operands[0] : ''}`)
  return 0
}

const find: CmdFn = (c) => {
  const a = c.argv.slice(1)
  const start = a[0] && !a[0].startsWith('-') ? a[0] : '.'
  const nameIdx = a.indexOf('-name'), typeIdx = a.indexOf('-type')
  const pat = nameIdx >= 0 ? a[nameIdx + 1] : null
  const type = typeIdx >= 0 ? a[typeIdx + 1] : null
  const re = pat ? new RegExp('^' + pat.replace(/[.+^${}()|\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$') : null
  const root = c.abs(start)
  if (!c.fs[root]) { c.err(`find: '${start}': No such file or directory`); return 1 }
  const show = (p: string) => (start.startsWith('/') ? p : p === root ? start : `${start.replace(/\/$/, '')}${p.slice(root.length)}`)
  for (const p of Object.keys(c.fs).sort()) {
    if (p !== root && !p.startsWith(root === '/' ? '/' : root + '/')) continue
    const e = c.fs[p]
    if (type === 'f' && e.type !== 'file') continue
    if (type === 'd' && e.type !== 'dir') continue
    if (re && !re.test(base(p))) continue
    c.out(show(p))
  }
  return 0
}

const sed: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1).filter((a) => a !== '-i' || true))
  const inPlace = flags.has('i')
  const script = operands.find((o) => /^s(.).*\1.*\1[gI]*$/.test(o))
  const files = operands.filter((o) => o !== script)
  if (!script) { c.err("sed: -e expression #1, char 0: no previous regular expression"); return 1 }
  const d = script[1]
  const [, pat, rep, fl] = new RegExp(`^s${d === '|' ? '\\|' : d}((?:[^${d}\\\\]|\\\\.)*)${d === '|' ? '\\|' : d}((?:[^${d}\\\\]|\\\\.)*)${d === '|' ? '\\|' : d}([gI]*)$`).exec(script) ?? []
  if (pat === undefined) { c.err(`sed: -e expression #1, char ${script.length}: unterminated \`s' command`); return 1 }
  const re = new RegExp(pat, (fl.includes('g') ? 'g' : '') + (fl.includes('I') ? 'i' : ''))
  const sub = (t: string) => t.replace(re, rep.replace(/&/g, '$&'))
  if (!files.length) { lines(c.stdin ?? '').forEach((l) => c.out(sub(l))); return 0 }
  let code = 0
  for (const f of files) {
    const p = c.abs(f), e = c.fs[p]
    if (!e) { c.err(`sed: can't read ${f}: No such file or directory`); code = 2; continue }
    const next = (e.content ?? '').split('\n').map(sub).join('\n')
    if (inPlace) {
      if (!can(c.fs[parent(p)], c.user, 'w')) { c.err(`sed: couldn't open temporary file ${parent(p)}/sedXXXXXX: Permission denied`); code = 4; continue }
      writeFile(c.fs, p, next, c.user, c.w.clock)
    } else lines(next).forEach((l) => c.out(l))
  }
  return code
}

const tee: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  const text = c.stdin ?? ''
  let code = 0
  for (const f of operands) {
    const p = c.abs(f), e = c.fs[p]
    const par = c.fs[parent(p)]
    if (e ? !can(e, c.user, 'w') : !par || !can(par, c.user, 'w')) { c.err(`tee: ${f}: Permission denied`); code = 1; continue }
    writeFile(c.fs, p, (flags.has('a') ? (e?.content ?? '') : '') + text, c.user, c.w.clock)
  }
  lines(text).forEach((l) => c.out(l))
  return code
}

// ---------- processes ----------

const startCol = (w: { clock: number }, t: number) => {
  const d = (x: number) => new Date(x * 1000).toISOString().slice(0, 10)
  if (d(t) === d(w.clock)) return hhmm(t)
  const dt = new Date(t * 1000)
  return `${['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][dt.getUTCMonth()]}${pad(dt.getUTCDate())}`
}

const ps: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1).filter((a) => !a.startsWith('--')))
  const aux = flags.has('u') || operands.includes('aux') || operands.includes('auxww') || flags.has('a') && flags.has('x') || operands.includes('ax')
  const ef = flags.has('e') && flags.has('f')
  const w = c.w
  if (c.host === 'local') {
    c.out('    PID TTY          TIME CMD'); c.out('   2204 pts/0    00:00:00 bash'); c.out('   2391 pts/0    00:00:00 ps'); return 0
  }
  const rows: Proc[] = [...w.procs]
  for (const s of w.ssh) {
    const sp = 1880 + s.id * 14
    rows.push({ pid: sp, user: 'root', cmd: `sshd: ubuntu [priv]`, tty: '?', stat: 'Ss', rssKb: 10740, started: s.since, kind: 'sshd', bound: null, immune: true, listens: [] })
    rows.push({ pid: sp + 1, user: 'ubuntu', cmd: `sshd: ubuntu@${s.tty}`, tty: '?', stat: 'S', rssKb: 7568, started: s.since, kind: 'sshd', bound: null, immune: true, listens: [] })
    rows.push({ pid: sp + 2, user: 'ubuntu', cmd: '-bash', tty: s.tty, stat: 'Ss', rssKb: 5372, started: s.since, kind: 'bash', bound: null, immune: true, listens: [] })
  }
  const tty = c.sh.ssh ? (w.ssh.find((s) => s.id === c.sh.ssh!.id)?.tty ?? 'pts/0') : 'pts/0'
  const myPid = w.nextPid
  rows.push({ pid: myPid, user: c.user, cmd: c.argv.join(' '), tty, stat: 'R+', rssKb: 3920, started: w.clock, kind: 'other', bound: null, immune: true, listens: [] })
  if (c.pipeNext?.[0] === 'grep') {
    const pat = c.pipeNext.slice(1).find((a) => !a.startsWith('-')) ?? ''
    rows.push({ pid: myPid + 1, user: c.user, cmd: `grep --color=auto ${pat}`, tty, stat: 'S+', rssKb: 2448, started: w.clock, kind: 'other', bound: null, immune: true, listens: [] })
  }
  rows.sort((a, b) => a.pid - b.pid)
  const time = (p: Proc) => { const s = Math.max(0, Math.floor((w.clock - p.started) / 60)); return p.kind === 'app' ? `0:${pad(Math.min(59, 8 + s))}` : '0:00' }
  if (ef) {
    c.out('UID          PID    PPID  C STIME TTY          TIME CMD')
    for (const p of rows) c.out(`${p.user.padEnd(8)} ${String(p.pid).padStart(6)} ${String(p.kind === 'init' ? 0 : p.kind === 'app' ? 1880 + (p.bound ?? 1) * 14 + 2 : 1).padStart(7)}  0 ${startCol(w, p.started).padEnd(5)} ${p.tty.padEnd(8)} 00:00:00 ${p.cmd}`)
  } else if (aux) {
    c.out('USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND')
    for (const p of rows) c.out(`${p.user.padEnd(8)} ${String(p.pid).padStart(7)} ${(p.kind === 'app' ? '3.1' : '0.0').padStart(4)} ${(p.rssKb / 4096).toFixed(1).padStart(4)} ${String(p.rssKb * 6).padStart(6)} ${String(p.rssKb).padStart(5)} ${p.tty.padEnd(8)} ${p.stat.padEnd(4)} ${startCol(w, p.started).padEnd(5)} ${time(p).padStart(6)} ${p.cmd}`)
  } else {
    c.out('    PID TTY          TIME CMD')
    for (const p of rows.filter((r) => r.tty === tty)) c.out(`${String(p.pid).padStart(7)} ${p.tty.padEnd(8)} 00:00:00 ${p.cmd.split(' ')[0].replace(/^-/, '')}`)
  }
  return 0
}

const SIGS: Record<string, number> = { HUP: 1, INT: 2, KILL: 9, TERM: 15, SIGHUP: 1, SIGINT: 2, SIGKILL: 9, SIGTERM: 15 }

function signalFrom(s: string): number | null {
  const n = s.replace(/^-/, '')
  if (/^\d+$/.test(n)) return Number(n)
  return SIGS[n.toUpperCase()] ?? null
}

function deliver(c: CmdCtx, p: Proc, label: string): number {
  if (p.user !== c.user && c.user !== 'root') { c.err(`bash: kill: (${p.pid}) - Operation not permitted`); return 1 }
  if (p.pid === 1 || p.kind === 'sshd') { c.err(`bash: kill: (${p.pid}) - Operation not permitted`); return 1 }
  killProc(c.w, p.pid, 'killed')
  void label
  return 0
}

const kill: CmdFn = (c) => {
  const args = c.argv.slice(1)
  let sig = 15
  const pids: string[] = []
  for (let i = 0; i < args.length; i++) {
    const a = args[i]
    if (a === '-s' || a === '-n') { sig = signalFrom(args[++i] ?? '') ?? 15 }
    else if (a.startsWith('-') && signalFrom(a) !== null) sig = signalFrom(a)!
    else pids.push(a)
  }
  void sig
  if (!pids.length) { c.err('kill: usage: kill [-s sigspec | -n signum | -sigspec] pid | jobspec ... or kill -l [sigspec]'); return 2 }
  let code = 0
  for (const s of pids) {
    const pid = Number(s)
    if (!Number.isInteger(pid)) { c.err(`bash: kill: ${s}: arguments must be process or job IDs`); code = 1; continue }
    const p = c.w.procs.find((q) => q.pid === pid)
    if (!p) { c.err(`bash: kill: (${pid}) - No such process`); code = 1; continue }
    code = deliver(c, p, s) || code
  }
  return code
}

const matchProcs = (c: CmdCtx, pat: string, full: boolean) => {
  const re = (() => { try { return new RegExp(pat) } catch { return new RegExp(pat.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) } })()
  return c.w.procs.filter((p) => (full ? re.test(p.cmd) : re.test(p.cmd.split(' ')[0].split('/').pop() ?? '')) && p.kind !== 'init' && p.kind !== 'sshd')
}

const pkill: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1).filter((a) => signalFrom(a) === null || !/^-\d+$|^-(KILL|TERM|HUP|INT)$/i.test(a) ? true : false))
  const pat = operands[0]
  if (!pat) { c.err('pkill: no matching criteria specified'); return 2 }
  const hits = matchProcs(c, pat, flags.has('f'))
  if (!hits.length) return 1
  let code = 0
  for (const p of hits) code = deliver(c, p, pat) || code
  return code
}

const pgrep: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1))
  const hits = operands[0] ? matchProcs(c, operands[0], flags.has('f')) : []
  hits.forEach((p) => c.out(flags.has('a') || flags.has('l') ? `${p.pid} ${p.cmd}` : String(p.pid)))
  return hits.length ? 0 : 1
}

// ---------- system info ----------

const whoami: CmdFn = (c) => { c.out(c.user); return 0 }
const hostnameCmd: CmdFn = (c) => { c.out(c.argv[1] === '-I' ? (c.host === 'remote' ? '10.0.1.27 ' : '192.168.1.24 ') : c.host === 'remote' ? HOSTNAME : 'laptop'); return 0 }
const id: CmdFn = (c) => { c.out(c.user === 'root' ? 'uid=0(root) gid=0(root) groups=0(root)' : `uid=1000(${c.user}) gid=1000(${c.user}) groups=1000(${c.user}),4(adm),27(sudo)`); return 0 }
const uname: CmdFn = (c) => { c.out(c.argv.includes('-a') ? (c.host === 'remote' ? `Linux ${HOSTNAME} 5.15.0-1060-aws #66-Ubuntu SMP Fri Mar 22 15:58:49 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux` : 'Linux laptop 6.5.0-44-generic #44-Ubuntu SMP x86_64 GNU/Linux') : 'Linux'); return 0 }
const date: CmdFn = (c) => { c.out(longDate(c.w.clock)); return 0 }
const uptime: CmdFn = (c) => { const s = c.w.state.server.uptimeSeconds; c.out(` ${hhmm(c.w.clock)}:00 up ${Math.floor(s / 86400)} days, ${Math.floor((s % 86400) / 3600)}:${pad(Math.floor((s % 3600) / 60))},  ${c.w.ssh.length} user${c.w.ssh.length === 1 ? '' : 's'},  load average: 0.08, 0.03, 0.01`); return 0 }
const df: CmdFn = (c) => {
  const pct = c.w.state.disks.rootUsedPct
  c.out('Filesystem      Size  Used Avail Use% Mounted on')
  c.out(`/dev/root        19G  ${(19 * pct / 100).toFixed(1)}G   ${(19 - 19 * pct / 100).toFixed(1)}G  ${pct}% /`)
  c.out('tmpfs           482M     0  482M   0% /dev/shm')
  return 0
}
const free: CmdFn = (c) => { c.out('               total        used        free      shared  buff/cache   available'); c.out('Mem:           964Mi       412Mi       158Mi       0.0Ki       393Mi       401Mi'); c.out('Swap:             0B          0B          0B'); return 0 }
const env: CmdFn = (c) => { Object.entries({ USER: c.user, HOME: c.home, SHELL: '/bin/bash', PWD: c.cwd, LANG: 'C.UTF-8' }).forEach(([k, v]) => c.out(`${k}=${v}`)); return 0 }

const history: CmdFn = (c) => {
  const list = c.sh.ssh ? c.w.remoteHistory : c.sh.localHistory
  list.forEach((l, i) => c.out(`${String(i + 1).padStart(5)}  ${l}`))
  return 0
}

const jobs: CmdFn = (c) => {
  const mine = c.w.procs.filter((p) => p.kind === 'app' && c.sh.ssh && p.bound === c.sh.ssh.id)
  mine.forEach((p, i) => c.out(`[${i + 1}]${i === mine.length - 1 ? '+' : '-'}  Running                 ${p.cmd} &`))
  return 0
}

const which: CmdFn = (c) => { c.out(`/usr/bin/${c.argv[1]}`); return 0 }
const noop: CmdFn = (c) => { if (c.argv[0] === 'sleep') tick(c.w, Number(c.argv[1]) || 1); return c.argv[0] === 'false' ? 1 : 0 }
const clear: CmdFn = (c) => { c.result.clear = true; return 0 }

export const CORE: Record<string, CmdFn> = {
  pwd, cd, ls, cat, echo, mkdir, touch, rm, cp, mv, chmod, chown, grep, egrep: (c) => grep({ ...c, argv: ['grep', '-E', ...c.argv.slice(1)] }), head: headTail('head'), tail: headTail('tail'), wc, find, sed, tee,
  ps, kill, pkill, killall: pkill, pgrep, whoami, hostname: hostnameCmd, id, uname, date, uptime, df, free, env, printenv: env, history, jobs, which,
  sleep: noop, true: noop, false: noop, clear,
}

export { appProc }
