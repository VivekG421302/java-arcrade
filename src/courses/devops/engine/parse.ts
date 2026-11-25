// A small bash-subset parser: words with quotes / $VAR / ~, operators && || ; | &, and redirects > >> 2> 2>> 2>&1 <.
export interface Word { v: string; glob: boolean }   // glob: the word had an unquoted * or ?
export interface Redir { op: '>' | '>>' | '2>' | '2>>' | '2>&1' | '<'; target?: Word }
export interface SimpleCmd { words: Word[]; redirs: Redir[] }
export interface Pipeline { cmds: SimpleCmd[]; bg: boolean }
export interface ListItem { p: Pipeline; before: '&&' | '||' | ';' | null }

type Tok = { k: 'w'; w: Word } | { k: 'op'; v: '&&' | '||' | '|' | ';' | '&' | '>' | '>>' | '2>' | '2>>' | '2>&1' | '<' }

export function tokenize(src: string, env: Record<string, string>): Tok[] {
  const out: Tok[] = []
  const n = src.length
  let i = 0
  const expand = (name: string) => env[name] ?? ''
  while (i < n) {
    const c = src[i]
    if (c === ' ' || c === '\t') { i++; continue }
    if (c === '#') break
    // operators
    const two = src.slice(i, i + 2), four = src.slice(i, i + 4)
    if (four === '2>&1') { out.push({ k: 'op', v: '2>&1' }); i += 4; continue }
    if (src.slice(i, i + 3) === '2>>') { out.push({ k: 'op', v: '2>>' }); i += 3; continue }
    if (two === '2>' ) { out.push({ k: 'op', v: '2>' }); i += 2; continue }
    if (two === '&&' || two === '||' || two === '>>') { out.push({ k: 'op', v: two as '&&' | '||' | '>>' }); i += 2; continue }
    if (c === '|' || c === ';' || c === '&' || c === '>' || c === '<') { out.push({ k: 'op', v: c }); i++; continue }
    // word
    let v = '', glob = false, any = false
    if (c === '~' && (src[i + 1] === undefined || src[i + 1] === '/' || src[i + 1] === ' ')) { v += expand('HOME'); i++; any = true }
    while (i < n) {
      const ch = src[i]
      if (ch === ' ' || ch === '\t' || ch === ';' || ch === '|' || ch === '&' || ch === '>' || ch === '<') break
      any = true
      if (ch === "'") {
        const j = src.indexOf("'", i + 1)
        if (j < 0) throw new Error("unexpected EOF while looking for matching `''")
        v += src.slice(i + 1, j); i = j + 1
      } else if (ch === '"') {
        i++
        while (i < n && src[i] !== '"') {
          if (src[i] === '\\' && '"\\$`'.includes(src[i + 1])) { v += src[i + 1]; i += 2 }
          else if (src[i] === '$') {
            const m = /^\$(?:\{(\w+)\}|(\w+)|\?)/.exec(src.slice(i))
            if (m) { v += m[0] === '$?' ? env['?'] ?? '0' : expand(m[1] ?? m[2]); i += m[0].length } else { v += '$'; i++ }
          } else v += src[i++]
        }
        if (i >= n) throw new Error('unexpected EOF while looking for matching `"\'')
        i++
      } else if (ch === '\\') { v += src[i + 1] ?? ''; i += 2 }
      else if (ch === '$') {
        const m = /^\$(?:\{(\w+)\}|(\w+)|\?)/.exec(src.slice(i))
        if (m) { v += m[0] === '$?' ? env['?'] ?? '0' : expand(m[1] ?? m[2]); i += m[0].length } else { v += '$'; i++ }
      } else { if (ch === '*' || ch === '?') glob = true; v += ch; i++ }
    }
    if (any) out.push({ k: 'w', w: { v, glob } })
  }
  return out
}

export function parse(src: string, env: Record<string, string>): ListItem[] {
  const toks = tokenize(src, env)
  const items: ListItem[] = []
  let before: ListItem['before'] = null
  let cmds: SimpleCmd[] = []
  let cur: SimpleCmd = { words: [], redirs: [] }
  let dangling = false                       // an && or || still waiting for its right-hand side
  const fail = (t: string): never => { throw new Error(`syntax error near unexpected token \`${t}'`) }
  const endCmd = (op: string) => {
    if (!cur.words.length) { if (cur.redirs.length) return; fail(op) }
    cmds.push(cur); cur = { words: [], redirs: [] }
  }
  const endPipe = (bg: boolean) => { items.push({ p: { cmds, bg }, before }); cmds = [] }
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i]
    if (t.k === 'w') { cur.words.push(t.w); dangling = false; continue }
    switch (t.v) {
      case '|': endCmd('|'); break
      case '&&': case '||': case ';': case '&': {
        endCmd(t.v); endPipe(t.v === '&')
        before = t.v === '&' ? ';' : t.v
        dangling = t.v === '&&' || t.v === '||'
        break
      }
      default: {
        if (t.v === '2>&1') { cur.redirs.push({ op: '2>&1' }); break }
        const nx = toks[i + 1]
        if (!nx || nx.k !== 'w') fail(nx ? (nx as { v: string }).v : 'newline')
        cur.redirs.push({ op: t.v, target: (nx as { k: 'w'; w: Word }).w }); i++
      }
    }
  }
  if (cur.words.length || cmds.length) { endCmd('newline'); endPipe(false) }
  // a trailing `;` or `&` leaves nothing pending; a trailing `&&` / `||` is an error in bash
  if (dangling) throw new Error('syntax error: unexpected end of file')
  return items
}
