// A bash-subset script runner (Stage 3): `bash deploy.sh`, `./deploy.sh`, `bash -c '...'`, plus the `[[ ]]` / `[ ]` / `test` builtin.
// It reads the script into statements, builds a tiny AST (if/elif/else, for, functions, `cmd || { ...; }`) and runs every simple line
// through the same executor the interactive shell uses (`c.runLine`), so each line behaves exactly as if the learner had typed it.
import { tokenize } from './parse'
import { can, resolveLink, realpath, parent } from './fs'
import type { CmdCtx, CmdFn, OutLine } from './shellTypes'

// ---------- the test builtin: [[ ... ]], [ ... ], test ... ----------

const globRe = (g: string) => new RegExp('^' + g.replace(/[.+^${}()|\\[\]]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$')

export const testCmd: CmdFn = (c) => {
  const name = c.argv[0]
  let a = c.argv.slice(1)
  const close = name === '[[' ? ']]' : name === '[' ? ']' : null
  if (close) {
    if (a[a.length - 1] !== close) { c.err(`bash: ${name}: missing \`${close}'`); return 2 }
    a = a.slice(0, -1)
  }
  let neg = false
  while (a[0] === '!') { neg = !neg; a = a.slice(1) }
  const res = (b: boolean) => ((b !== neg) ? 0 : 1)
  const file = (p: string) => resolveLink(c.fs, c.abs(p))
  if (a.length === 0) return res(false)
  if (a.length === 1) return res(a[0] !== '')
  if (a.length === 2) {
    const [op, v] = a
    switch (op) {
      case '-z': return res(v === '')
      case '-n': return res(v !== '')
      case '-e': return res(!!file(v))
      case '-f': return res(file(v)?.type === 'file')
      case '-d': return res(file(v)?.type === 'dir')
      case '-L': case '-h': return res(!!c.fs[c.abs(v)]?.link)
      case '-s': return res((file(v)?.size ?? 0) > 0)
      case '-r': { const e = file(v); return res(!!e && can(e, c.user, 'r')) }
      case '-w': { const e = file(v); return res(!!e && can(e, c.user, 'w')) }
      case '-x': { const e = file(v); return res(!!e && e.type === 'file' && (c.user === 'root' ? /[1357]/.test(e.mode) : can(e, c.user, 'x'))) }
      default: c.err(`bash: ${name}: ${op}: unary operator expected`); return 2
    }
  }
  if (a.length === 3) {
    const [l, op, r] = a
    const n1 = Number(l), n2 = Number(r)
    switch (op) {
      case '=': case '==': return res(name === '[[' ? globRe(r).test(l) : l === r)
      case '!=': return res(name === '[[' ? !globRe(r).test(l) : l !== r)
      case '=~': { try { return res(new RegExp(r).test(l)) } catch { return 2 } }
      case '-eq': return res(n1 === n2)
      case '-ne': return res(n1 !== n2)
      case '-lt': return res(n1 < n2)
      case '-le': return res(n1 <= n2)
      case '-gt': return res(n1 > n2)
      case '-ge': return res(n1 >= n2)
      default: c.err(`bash: ${name}: ${op}: binary operator expected`); return 2
    }
  }
  c.err(`bash: ${name}: too many arguments`)
  return 2
}

// ---------- parsing a script into statements ----------

interface Stmt { t: string; ln: number }
type Node =
  | { k: 'cmd'; t: string; ln: number }
  | { k: 'if'; arms: { c: string; body: Node[]; ln: number }[]; els: Node[] | null }
  | { k: 'for'; v: string; list: string; body: Node[]; ln: number }
  | { k: 'brace'; head: string; op: '&&' | '||'; body: Node[]; ln: number }
  | { k: 'func'; name: string; body: Node[] }

class Abort { constructor(public code: number) {} }          // `exit`, `set -e`, an unbound variable, a syntax error
class Return { constructor(public code: number) {} }
class ScriptError extends Error { constructor(m: string, public code = 1) { super(m) } }

/** Split on `;` that is outside quotes, `$( )` and `${ }` (so `if x; then y; fi` becomes separate statements). */
function splitSemi(line: string): string[] {
  const out: string[] = []
  let cur = '', q = '', depth = 0
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (q) { cur += ch; if (ch === '\\' && q === '"') { cur += line[++i] ?? '' } else if (ch === q) q = ''; continue }
    if (ch === '\\') { cur += ch + (line[++i] ?? ''); continue }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; continue }
    if (ch === '#' && (i === 0 || /\s/.test(line[i - 1])) && depth === 0) break
    if ((ch === '$' && (line[i + 1] === '(' || line[i + 1] === '{'))) { depth++; cur += ch + line[++i]; continue }
    if (depth && (ch === ')' || ch === '}')) { depth--; cur += ch; continue }
    if (ch === ';' && depth === 0 && line[i + 1] !== ';') { out.push(cur); cur = ''; continue }
    cur += ch
  }
  out.push(cur)
  return out.map((s) => s.trim()).filter(Boolean)
}

function toStatements(src: string): Stmt[] {
  const raw = src.replace(/\r/g, '').split('\n')
  const out: Stmt[] = []
  for (let i = 0; i < raw.length; i++) {
    let line = raw[i]
    const ln = i + 1
    while (/\\\s*$/.test(line) && i + 1 < raw.length) line = line.replace(/\\\s*$/, ' ') + raw[++i].trim()
    if (/^\s*#/.test(line)) continue
    for (const s of splitSemi(line)) out.push({ t: s, ln })
  }
  return out
}

const firstWord = (s: string) => /^\S+/.exec(s)?.[0] ?? ''

function buildAst(stmts: Stmt[]): Node[] {
  let p = 0
  const rest = (s: Stmt, kw: string) => s.t.slice(kw.length).trim()
  const eat = (kw: string) => {   // consume a leading keyword; any remainder on the same line stays as the next statement
    const s = stmts[p]
    if (s && firstWord(s.t) === kw) { const r = rest(s, kw); if (r) stmts[p] = { t: r, ln: s.ln }; else p++; return true }
    return false
  }
  const seq = (stop: string[], who: string): Node[] => {
    const nodes: Node[] = []
    for (;;) {
      const s = stmts[p]
      if (!s) { if (stop.length) throw new ScriptError(`syntax error: unexpected end of file (missing \`${stop[stop.length - 1]}' for ${who})`, 2); return nodes }
      const w = firstWord(s.t)
      if (stop.includes(w)) return nodes
      if (['fi', 'done', 'then', 'do', 'else', 'elif', '}'].includes(w)) throw new ScriptError(`syntax error near unexpected token \`${w}'`, 2)
      if (w === 'if') {
        const arms: { c: string; body: Node[]; ln: number }[] = []
        let els: Node[] | null = null
        let cond = rest(s, 'if'); const ln = s.ln; p++
        for (;;) {
          if (!eat('then')) throw new ScriptError(`syntax error: \`then' expected after the if condition on line ${ln}`, 2)
          arms.push({ c: cond, body: seq(['elif', 'else', 'fi'], 'if'), ln })
          const nx = stmts[p], nw = firstWord(nx.t)
          if (nw === 'elif') { cond = rest(nx, 'elif'); p++; continue }
          if (nw === 'else') { eat('else'); els = seq(['fi'], 'if') }
          break
        }
        p++   // fi
        nodes.push({ k: 'if', arms, els })
        continue
      }
      if (w === 'for') {
        const m = /^for\s+(\w+)\s+in\s*(.*)$/.exec(s.t)
        if (!m) throw new ScriptError(`syntax error near \`${s.t}'`, 2)
        p++
        if (!eat('do')) throw new ScriptError(`syntax error: \`do' expected on line ${s.ln}`, 2)
        nodes.push({ k: 'for', v: m[1], list: m[2], body: seq(['done'], 'for'), ln: s.ln }); p++
        continue
      }
      const fm = /^(?:function\s+)?([A-Za-z_][\w-]*)\s*(?:\(\s*\))?\s*\{(?:\s+(.*))?$/.exec(s.t)
      if (fm && (/^\S+\s*\(\s*\)/.test(s.t) || w === 'function')) {
        if (fm[2]) stmts[p] = { t: fm[2], ln: s.ln }; else p++   // `f() { echo hi; }` keeps its first command on the same line
        nodes.push({ k: 'func', name: fm[1], body: seq(['}'], 'function') }); p++
        continue
      }
      const bm = /^(.*?)\s*(&&|\|\|)\s*\{(?:\s+(.*))?$/.exec(s.t)
      if (bm) { if (bm[3]) stmts[p] = { t: bm[3], ln: s.ln }; else p++; nodes.push({ k: 'brace', head: bm[1], op: bm[2] as '&&' | '||', body: seq(['}'], '{'), ln: s.ln }); p++; continue }
      nodes.push({ k: 'cmd', t: s.t, ln: s.ln }); p++
    }
  }
  return seq([], 'script')
}

// ---------- running ----------

interface Run {
  c: CmdCtx
  name: string                          // $0
  vars: Record<string, string>
  args: string[]                        // $1 $2 ...
  funcs: Record<string, Node[]>
  e: boolean; u: boolean; x: boolean; pipefail: boolean
  last: number
  subExit: number                       // exit status of the last $(...) on the current line (set -e looks at it for plain assignments)
  inCond: number                        // > 0 while evaluating an `if` condition or the left side of && / ||: set -e is suspended there
  sub: number
  depth: number
}

const emit = (r: Run, lines: OutLine[]) => lines.forEach((l) => r.c.emit(l))
const errLine = (r: Run, ln: number, msg: string) => r.c.emit({ t: 'err', s: `${r.name}: line ${ln}: ${msg}` })

function lookup(r: Run, n: string): string | undefined {
  if (n === '?') return String(r.last)
  if (n === '0') return r.name
  if (/^\d+$/.test(n)) return r.args[Number(n) - 1]
  return r.vars[n] ?? r.c.env[n]
}

function arith(expr: string, r: Run, ln: number): string {
  const sub = expr.replace(/[A-Za-z_]\w*/g, (n) => String(Number(lookup(r, n) ?? 0) || 0))
  if (!/^[\d\s+\-*/%()]*$/.test(sub)) throw new ScriptError(`${r.name}: line ${ln}: ${expr}: syntax error in expression`, 1)
  try { return String(Math.trunc(Function(`"use strict";return (${sub || 0})`)() as number)) } catch { throw new ScriptError(`${r.name}: line ${ln}: ${expr}: syntax error in expression`, 1) }
}

/** Matching `)` for a `$(` at position i (i points at the `(`). */
function closeParen(s: string, i: number): number {
  let d = 0, q = ''
  for (let j = i; j < s.length; j++) {
    const ch = s[j]
    if (q) { if (ch === q) q = ''; continue }
    if (ch === "'" || ch === '"') { q = ch; continue }
    if (ch === '(') d++
    else if (ch === ')') { d--; if (d === 0) return j }
  }
  throw new ScriptError('unexpected EOF while looking for matching `)\'', 2)
}

/**
 * Pre-expansion of what the one-line tokenizer cannot do: $(...), $((...)), ${N:-x}, ${N:?msg}, $#, $@, $*, and `set -u` checks.
 * Results go into hidden variables (`${__sN}`) so the tokenizer keeps quoting rules; `inline` pastes the text instead (for `for x in $(...)`).
 */
async function expand(r: Run, text: string, ln: number, inline = false): Promise<string> {
  let out = '', q = ''
  const hold = (v: string) => { if (inline) return v; const k = `__s${r.sub++}`; r.vars[k] = v; return '${' + k + '}' }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (q === "'") { out += ch; if (ch === "'") q = ''; continue }
    if (ch === '\\') { out += ch + (text[i + 1] ?? ''); i++; continue }
    if (ch === "'" && !q) { q = "'"; out += ch; continue }
    if (ch === '"') { q = q === '"' ? '' : '"'; out += ch; continue }
    if (ch !== '$') { out += ch; continue }
    const nx = text[i + 1]
    if (nx === '(' && text[i + 2] === '(') {
      const end = text.indexOf('))', i)
      if (end < 0) throw new ScriptError('unexpected EOF while looking for matching `))\'', 2)
      out += hold(arith(await expand(r, text.slice(i + 3, end), ln, true), r, ln)); i = end + 1; continue
    }
    if (nx === '(') {
      const end = closeParen(text, i + 1)
      const inner = await expand(r, text.slice(i + 2, end), ln)
      const res = await r.c.runLine(inner, envOf(r), { pipefail: r.pipefail })
      emit(r, res.out.filter((l) => l.t !== 'out'))
      r.subExit = res.exit
      out += hold(res.out.filter((l) => l.t === 'out').map((l) => l.s).join('\n').replace(/\n+$/, '')); i = end; continue
    }
    if (nx === '{') {
      const end = text.indexOf('}', i)
      if (end < 0) throw new ScriptError('bad substitution', 1)
      const body = text.slice(i + 2, end)
      const m = /^(\w+|\d+)(?::?([-?=+])(.*))?$/.exec(body)
      if (!m) { out += text.slice(i, end + 1); i = end; continue }
      const v = lookup(r, m[1])
      if (m[2] === '-') out += hold(v ? v : await expand(r, m[3] ?? '', ln, true))
      else if (m[2] === '?') {
        if (!v) { r.c.emit({ t: 'err', s: `${r.name}: line ${ln}: ${m[1]}: ${m[3] || 'parameter null or not set'}` }); throw new Abort(1) }
        out += hold(v)
      } else if (m[2] === '+') out += hold(v ? await expand(r, m[3] ?? '', ln, true) : '')
      else {
        if (v === undefined && r.u) { r.c.emit({ t: 'err', s: `${r.name}: line ${ln}: ${m[1]}: unbound variable` }); throw new Abort(1) }
        out += text.slice(i, end + 1)
      }
      i = end; continue
    }
    if (nx === '#') { out += hold(String(r.args.length)); i++; continue }
    if (nx === '@' || nx === '*') { out += hold(r.args.join(' ')); i++; continue }
    const m = /^\$(\w+)/.exec(text.slice(i))
    if (m) {
      if (r.u && lookup(r, m[1]) === undefined) { r.c.emit({ t: 'err', s: `${r.name}: line ${ln}: ${m[1]}: unbound variable` }); throw new Abort(1) }
      out += m[0]; i += m[0].length - 1; continue
    }
    out += ch
  }
  return out
}

/** Everything the tokenizer may refer to with $NAME: script variables, positional args, $? and $0. */
function envOf(r: Run): Record<string, string> {
  const e: Record<string, string> = { ...r.c.env, ...r.vars, '?': String(r.last), '0': r.name }
  r.args.forEach((a, i) => { e[String(i + 1)] = a })
  return e
}

/** Split a line on `&&` / `||` that sit outside quotes and outside `[[ ... ]]`. */
function splitList(s: string): { seg: string; before: '&&' | '||' | null }[] {
  const out: { seg: string; before: '&&' | '||' | null }[] = []
  let cur = '', q = '', br = 0, before: '&&' | '||' | null = null
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]
    if (q) { cur += ch; if (ch === '\\' && q === '"') cur += s[++i] ?? ''; else if (ch === q) q = ''; continue }
    if (ch === '\\') { cur += ch + (s[i + 1] ?? ''); i++; continue }
    if (ch === "'" || ch === '"') { q = ch; cur += ch; continue }
    if (s.startsWith('[[', i) && (i === 0 || /\s/.test(s[i - 1]))) br++
    if (s.startsWith(']]', i) && br) br--
    if (!br && (s.startsWith('&&', i) || s.startsWith('||', i))) { out.push({ seg: cur.trim(), before }); before = s.slice(i, i + 2) as '&&' | '||'; cur = ''; i++; continue }
    cur += ch
  }
  out.push({ seg: cur.trim(), before })
  return out
}

const wordsOf = (r: Run, s: string) => tokenize(s, envOf(r)).flatMap((x) => (x.k === 'w' ? [x.w.v] : []))

/** One statement: expand it, then run its `&&` / `||` parts, honouring set -e the way bash does. */
async function simple(r: Run, text: string, ln: number): Promise<number> {
  let t = text
  r.subExit = 0
  let invert = false
  if (/^!\s/.test(t)) { invert = true; t = t.replace(/^!\s+/, '') }
  const ex = await expand(r, t, ln)
  if (r.x) r.c.emit({ t: 'err', s: `+ ${ex.replace(/\$\{__s\d+\}/g, (m) => r.vars[m.slice(2, -1)] ?? '')}` })
  const parts = splitList(ex)
  let code = 0, ranLast = false
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i]
    if ((p.before === '&&' && code !== 0) || (p.before === '||' && code === 0)) continue
    ranLast = i === parts.length - 1
    code = await unit(r, p.seg, ln)
    r.last = code
  }
  if (invert) { code = code === 0 ? 1 : 0; r.last = code }
  if (code !== 0 && r.e && ranLast && r.inCond === 0 && !invert) throw new Abort(code)
  return code
}

/** One simple command: interpreter builtins, a user function, or an ordinary command line. */
async function unit(r: Run, ex: string, ln: number): Promise<number> {
  const w = firstWord(ex)
  if (w === 'exit') { const v = wordsOf(r, ex)[1]; const n = v === undefined ? r.last : Number(v); throw new Abort(Number.isFinite(n) ? n & 255 : 2) }
  if (w === 'return') { const v = wordsOf(r, ex)[1]; const n = v === undefined ? r.last : Number(v); throw new Return(Number.isFinite(n) ? n & 255 : 2) }
  if (w === 'set') {
    const toks = wordsOf(r, ex).slice(1)
    for (let i = 0; i < toks.length; i++) {
      const a = toks[i]
      if (a === '-o' || a === '+o') { if (toks[i + 1] === 'pipefail') r.pipefail = a === '-o'; i++; continue }
      if (/^[-+][a-zA-Z]+$/.test(a)) for (const ch of a.slice(1)) { const on = a[0] === '-'; if (ch === 'e') r.e = on; else if (ch === 'u') r.u = on; else if (ch === 'x') r.x = on; else if (ch === 'o') { if (toks[i + 1] === 'pipefail') r.pipefail = on; i++ } }
    }
    return 0
  }
  if (w === 'shift') { r.args.shift(); return 0 }
  if (w === 'local' || w === 'readonly' || w === 'export' || w === 'declare') {
    const body = ex.slice(w.length).trim()
    if (!body) return 0
    assign(r, body, w === 'export', ln)
    return 0
  }
  if (/^[A-Za-z_]\w*=/.test(w) && tokenize(ex, envOf(r)).length <= 1) {
    assign(r, ex, false, ln)
    if (r.subExit !== 0 && r.e && r.inCond === 0) throw new Abort(r.subExit)   // VAR=$(failing command) stops a set -e script
    return r.subExit
  }
  const fn = r.funcs[w]
  if (fn) {
    if (r.depth > 40) throw new ScriptError(`${r.name}: line ${ln}: ${w}: maximum function nesting level exceeded`, 1)
    const saved = r.args
    r.args = wordsOf(r, ex).slice(1); r.depth++
    let code = 0
    try { await block(r, fn); code = r.last } catch (e) { if (!(e instanceof Return)) throw e; code = e.code } finally { r.depth--; r.args = saved }
    return code
  }
  let res
  try { res = await r.c.runLine(ex, envOf(r), { pipefail: r.pipefail }) } catch (e) { r.c.emit({ t: 'err', s: `${r.name}: line ${ln}: ${(e as Error).message}` }); return 2 }
  emit(r, res.out)
  return res.exit
}

function assign(r: Run, body: string, exp: boolean, ln: number): Promise<number> | number {
  const m = /^([A-Za-z_]\w*)(=(.*))?$/.exec(body)
  if (!m) return 0
  if (m[2] === undefined) { if (exp && r.vars[m[1]] !== undefined) r.c.env[m[1]] = r.vars[m[1]]; return 0 }
  const tk = tokenize(m[3] ?? '', envOf(r))[0] as { w: { v: string } } | undefined
  const v = tk?.w.v ?? ''
  r.vars[m[1]] = v
  if (exp) r.c.env[m[1]] = v
  void ln
  return 0
}

async function cond(r: Run, text: string, ln: number): Promise<boolean> {
  r.inCond++
  try { return (await simple(r, text, ln)) === 0 } finally { r.inCond-- }
}

async function block(r: Run, nodes: Node[]): Promise<void> {
  for (const n of nodes) {
    switch (n.k) {
      case 'func': r.funcs[n.name] = n.body; break
      case 'cmd': await line(r, n.t, n.ln); break
      case 'if': {
        let done = false
        for (const arm of n.arms) {
          if (await cond(r, arm.c, arm.ln)) { await block(r, arm.body); done = true; break }
        }
        if (!done && n.els) await block(r, n.els)
        if (!done && !n.els) r.last = 0
        break
      }
      case 'for': {
        const list = await expand(r, n.list, n.ln, true)
        const items = tokenize(list, envOf(r)).map((x) => (x as { w: { v: string } }).w.v)
        const words = items.flatMap((x) => (x.includes(' ') && !/["']/.test(n.list) ? x.split(/\s+/) : [x])).filter((x) => x !== '')
        for (const v of words) { r.vars[n.v] = v; await block(r, n.body) }
        break
      }
      case 'brace': {
        r.inCond++
        let code: number
        try { code = await simple(r, n.head, n.ln) } finally { r.inCond-- }
        if ((n.op === '||' && code !== 0) || (n.op === '&&' && code === 0)) await block(r, n.body)
        break
      }
    }
  }
}

/** A plain statement; a `a && b || c` list keeps set -e quiet for the parts bash also ignores. */
async function line(r: Run, text: string, ln: number) {
  await simple(r, text, ln)
}

export interface ScriptResult { code: number }

export async function runScript(c: CmdCtx, src: string, o: { name: string; args: string[] }): Promise<number> {
  const r: Run = { c, name: o.name, vars: {}, args: o.args, funcs: {}, e: false, u: false, x: false, pipefail: false, last: 0, subExit: 0, inCond: 0, sub: 0, depth: 0 }
  const startCwd = c.cwd
  let code = 0
  try {
    const ast = buildAst(toStatements(src))
    await block(r, ast)
    code = r.last
  } catch (e) {
    if (e instanceof Abort || e instanceof Return) code = e.code
    else if (e instanceof ScriptError) { c.emit({ t: 'err', s: e.message.startsWith(o.name) ? e.message : `${o.name}: ${e.message}` }); code = e.code }
    else throw e
  } finally { c.setCwd(startCwd) }
  return code
}

/** `bash file`, `bash -c '...'`, `sh ...` */
export const bashCmd: CmdFn = async (c) => {
  const a = c.argv.slice(1)
  const flags: string[] = []
  while (a[0]?.startsWith('-') && a[0] !== '-c' && a[0].length > 1) flags.push(a.shift()!)
  if (a[0] === '-c') {
    if (!a[1]) { c.err('bash: -c: option requires an argument'); return 2 }
    const [, cmd, nm, ...args] = a
    return runScript(c, cmd, { name: nm ?? 'bash', args })
  }
  if (!a.length) { c.err('bash: an interactive sub-shell is not simulated here: run a script with `bash script.sh`'); return 1 }
  return runFile(c, a[0], a.slice(1), false)
}

/** Shared by `bash file` (needs read permission) and `./file` (needs the x bit). */
export async function runFile(c: CmdCtx, typed: string, args: string[], needExec: boolean): Promise<number> {
  const rp = realpath(c.fs, c.abs(typed)) ?? c.abs(typed)
  const e = c.fs[rp]
  const who = needExec ? `bash: ${typed}` : `bash: ${typed}`
  if (!e) { c.err(`${who}: No such file or directory`); return 127 }
  if (e.type === 'dir') { c.err(`${who}: Is a directory`); return needExec ? 126 : 126 }
  if (!can(e, c.user, 'r') && !(c.user === 'root')) { c.err(`${who}: Permission denied`); return needExec ? 126 : 126 }
  if (needExec) {
    const x = c.user === 'root' ? /[1357]/.test(e.mode) : can(e, c.user, 'x')
    if (!x) { c.err(`${who}: Permission denied`); c.tip(`A script is just a text file until it has the execute bit. \`chmod +x ${typed.replace(/^\.\//, '')}\` then try again (or run it as \`bash ${typed.replace(/^\.\//, '')}\`).`); return 126 }
  }
  if (e.content === undefined) { c.err(`${who}: cannot execute binary file`); return 126 }
  void parent
  return runScript(c, e.content, { name: typed, args })
}
