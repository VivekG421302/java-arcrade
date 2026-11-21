import { createPortal } from 'react-dom'
import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ClipboardEvent, type KeyboardEvent, type MouseEvent } from 'react'
import { highlight } from './content'
import { bump, getUsage, loadUsage, suggest, type Kind, type Result, type Sug } from '../lib/suggest'

export type EditorApi = {
  insert: (text: string, back?: number) => void; move: (dx: number) => void; blur: () => void
  apply: (s: Sug) => void; vmove: (dy: number) => void; undo: () => void; redo: () => void; comment: () => void
}
export const KIND_BADGE: Record<Kind, { letter: string; cls: string }> = {
  keyword: { letter: 'k', cls: 'bg-blue-500/15 text-blue-600 dark:text-blue-300' },
  type: { letter: 'T', cls: 'bg-teal-500/15 text-teal-600 dark:text-teal-300' },
  method: { letter: 'm', cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  field: { letter: 'f', cls: 'bg-orange-500/15 text-orange-700 dark:text-orange-300' },
  var: { letter: 'v', cls: 'bg-sky-500/15 text-sky-700 dark:text-sky-300' },
  snippet: { letter: '{}', cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300' },
}
const USAGE_KEY = 'ide:sugusage'
export type Jump = { line: number; id: number; focus?: boolean }

const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']', '"': '"' }
const OPEN: Record<string, string> = { '(': ')', '[': ']', '{': '}' }
const CLOSE: Record<string, string> = { ')': '(', ']': '[', '}': '{' }
const IDENT = /^[A-Za-z_$][\w$]*$/
const isWordCh = (c: string | undefined) => !!c && /[\w$]/.test(c)

type Props = {
  value: string
  onChange: (v: string) => void
  errorLines?: number[]
  jump?: Jump
  onFocusChange?: (focused: boolean) => void
  fontSize?: number
  wrap?: boolean
  lang?: 'java' | 'rust' | 'sql'
  onSuggest?: (r: Result | null) => void   // the current suggestions (the mobile bar shows them)
  popup?: boolean                          // show the suggestion popup at the caret (desktop)
}

/** Splits Prism's HTML into one HTML string per source line, closing and reopening spans across line breaks. */
function splitLines(html: string): string[] {
  const out: string[] = []
  const stack: string[] = []
  let cur = ''
  for (const m of html.matchAll(/(<\/?span[^>]*>)|([^<]+)/g)) {
    if (m[1]) {
      if (m[1].startsWith('</')) stack.pop(); else stack.push(m[1])
      cur += m[1]
    } else {
      m[2].split('\n').forEach((part, i) => {
        if (i > 0) { out.push(cur + '</span>'.repeat(stack.length)); cur = stack.join('') }
        cur += part
      })
    }
  }
  out.push(cur + '</span>'.repeat(stack.length))
  return out
}

/** 1 where a character is real code, 0 inside comments, strings and char literals (so brackets there are ignored). */
function codeMask(v: string): Uint8Array {
  const n = v.length
  const m = new Uint8Array(n).fill(1)
  let i = 0
  while (i < n) {
    const c = v[i]
    if (c === '/' && v[i + 1] === '/') { const j = v.indexOf('\n', i); const end = j < 0 ? n : j; m.fill(0, i, end); i = end; continue }
    if (c === '/' && v[i + 1] === '*') { const j = v.indexOf('*/', i + 2); const end = j < 0 ? n : j + 2; m.fill(0, i, end); i = end; continue }
    if (c === '"' && v.startsWith('"""', i)) { const j = v.indexOf('"""', i + 3); const end = j < 0 ? n : j + 3; m.fill(0, i, end); i = end; continue }
    if (c === '"') {
      let j = i + 1
      while (j < n && v[j] !== '"' && v[j] !== '\n') { if (v[j] === '\\') j++; j++ }
      const end = Math.min(n, j + 1); m.fill(0, i, end); i = end; continue
    }
    if (c === "'") {   // 'x' or '\n' is a char literal; a lone ' (Rust lifetime) is not
      const hit = /^'(?:\\[^'\n]*|[^'\\\n])'/.exec(v.slice(i, i + 10))
      if (hit) { m.fill(0, i, i + hit[0].length); i += hit[0].length; continue }
    }
    i++
  }
  return m
}

/** Same as codeMask for SQL: `--` and block comments, 'strings' and "identifiers" ('' and "" are escaped quotes). */
function sqlMask(v: string): Uint8Array {
  const n = v.length
  const m = new Uint8Array(n).fill(1)
  let i = 0
  while (i < n) {
    const c = v[i]
    if (c === '-' && v[i + 1] === '-') { const j = v.indexOf('\n', i); const end = j < 0 ? n : j; m.fill(0, i, end); i = end; continue }
    if (c === '/' && v[i + 1] === '*') { const j = v.indexOf('*/', i + 2); const end = j < 0 ? n : j + 2; m.fill(0, i, end); i = end; continue }
    if (c === "'" || c === '"') {
      let j = i + 1
      while (j < n) { if (v[j] === c) { if (v[j + 1] === c) { j += 2; continue } break } j++ }
      const end = Math.min(n, j + 1); m.fill(0, i, end); i = end; continue
    }
    i++
  }
  return m
}

/** Index of the bracket that pairs with the one at `i`, or -1. */
function matchBracket(v: string, mask: Uint8Array, i: number): number {
  const c = v[i]
  if (!mask[i]) return -1
  if (OPEN[c]) {
    for (let j = i + 1, d = 1; j < v.length; j++) {
      if (!mask[j]) continue
      if (v[j] === c) d++
      else if (v[j] === OPEN[c] && --d === 0) return j
    }
  } else if (CLOSE[c]) {
    for (let j = i - 1, d = 1; j >= 0; j--) {
      if (!mask[j]) continue
      if (v[j] === c) d++
      else if (v[j] === CLOSE[c] && --d === 0) return j
    }
  }
  return -1
}

const lineStartOf = (v: string, p: number) => v.lastIndexOf('\n', p - 1) + 1
const lineEndOf = (v: string, p: number) => { const i = v.indexOf('\n', p); return i < 0 ? v.length : i }

/** The DOM text node + offset that holds column `col` of a rendered row (a range start prefers the node that begins there, so no stray zero-width rect). */
function textPoint(code: Element, col: number, start = false): [Node, number] {
  const w = document.createTreeWalker(code, NodeFilter.SHOW_TEXT)
  let n = w.nextNode(), left = col, last: Node | null = null
  while (n) {
    const len = n.nodeValue!.length
    last = n
    if (start ? left < len : left <= len) return [n, left]
    left -= len
    n = w.nextNode()
  }
  return last ? [last, last.nodeValue!.length] : [code, code.childNodes.length]
}

/**
 * IDE-style editor: a transparent textarea over Prism-highlighted rows (one row per line, so wrapping keeps numbers aligned).
 * Suggestions: a popup at the caret on desktop (Tab accepts, Ctrl+Space forces), chips above the keyboard on touch screens.
 * Keys: Ctrl+/ toggle comment, Alt+Up/Down move line, Shift+Alt+Up/Down duplicate line, Ctrl+Shift+K delete line, Ctrl+Alt+Up/Down (or Alt+click) add a cursor.
 */
const CodeEditor = forwardRef<EditorApi, Props>(function CodeEditor({ value, onChange, errorLines = [], jump, onFocusChange, fontSize = 13, wrap = false, lang = 'java', onSuggest, popup = false }, ref) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const inner = useRef<HTMLDivElement>(null)
  const overlay = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => splitLines(highlight(value, lang)), [value, lang])
  const mask = useMemo(() => (lang === 'sql' ? sqlMask(value) : codeMask(value)), [value, lang])
  const errSet = useMemo(() => new Set(errorLines), [errorLines])
  const lh = Math.round(fontSize * 1.85)
  const gutter = Math.ceil(String(rows.length).length * fontSize * 0.62) + 28
  const wrapCls = wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre'

  // caret for highlighting (null until the first interaction) and the extra cursors of multi-line editing
  const [caret, setCaret] = useState<{ s: number; e: number } | null>(null)
  const [extra, setExtra] = useState<number[]>([])
  const [tick, setTick] = useState(0)                  // bumped when the layout changes (resize), so highlights are re-measured
  const extraRef = useRef<number[]>([])
  const [sel, setSel] = useState(0)                      // highlighted suggestion in the popup
  const [navd, setNavd] = useState(false)                // true once the arrow keys were used (then Enter accepts too)
  const [dismissed, setDismissed] = useState('')         // popup closed with Esc at this value/caret
  const [forced, setForced] = useState('')               // popup forced open with Ctrl+Space at this value/caret
  const [pop, setPop] = useState<{ left: number; top?: number; bottom?: number; maxH: number } | null>(null)
  const popRef = useRef<HTMLDivElement>(null)
  extraRef.current = extra

  // ---- suggestions for the caret position
  useEffect(() => { try { loadUsage(JSON.parse(localStorage.getItem(USAGE_KEY) || '{}')) } catch { /* ignore */ } }, [])
  const sug = useMemo(() => (caret && caret.s === caret.e && !extra.length && caret.s <= value.length && lang !== 'sql' ? suggest(value, caret.s, lang) : null), [value, caret, extra.length, lang])
  useEffect(() => { onSuggest?.(sug) }, [sug]) // eslint-disable-line react-hooks/exhaustive-deps
  const sigKey = `${value.length}:${caret?.s ?? -1}`
  const popItems = useMemo<Sug[]>(() => {
    if (!popup || !sug || !sug.items.length || dismissed === sigKey) return []
    if (forced === sigKey) return sug.items
    const first = sug.items[0]
    // opens by itself like an IDE: after '.', after 'Type name =', after 'Type ' (names), and from the first typed letter
    if (sug.ctx === 'member' || sug.ctx === 'init' || sug.ctx === 'name') return sug.items
    if (sug.ctx === 'word' && first.replace >= 1 && !(sug.items.length === 1 && first.insert.trim() === first.label && first.label.length === first.replace)) return sug.items
    return []
  }, [popup, sug, dismissed, forced, sigKey])
  const popOpen = popItems.length > 0
  useEffect(() => { setSel(0); setNavd(false) }, [sigKey])
  useEffect(() => { (popRef.current?.children[sel] as HTMLElement | undefined)?.scrollIntoView?.({ block: 'nearest' }) }, [sel, popOpen])
  const busy = useRef(false)                           // true while this component is itself editing the textarea
  const lastMulti = useRef<string | null>(null)        // the text produced by the last multi-cursor edit
  const altDown = useRef<number | null>(null)          // caret position at an Alt+mouse-down (becomes an extra cursor)

  /** Replace [start,end) with `text` through the browser's edit pipeline, so Ctrl+Z / Ctrl+Y keep working. */
  const edit = (start: number, end: number, text: string, selStart = start + text.length, selEnd = selStart) => {
    const el = ta.current!
    el.focus()
    const before = el.value
    const want = before.slice(0, start) + text + before.slice(end)
    busy.current = true
    let ok = false
    try {
      el.setSelectionRange(start, end)
      ok = text === '' ? (start === end ? true : document.execCommand('delete')) : document.execCommand('insertText', false, text)
    } catch { ok = false }
    busy.current = false
    if (!ok || el.value !== want) { el.value = want; onChange(want) }   // fallback (no undo history)
    else if (text === '' && start === end) { /* nothing to do */ }
    else onChange(el.value)
    el.setSelectionRange(selStart, selEnd)
    setCaret({ s: selStart, e: selEnd })
  }

  const clearExtra = () => { if (extraRef.current.length) setExtra([]) }

  /** Insert a suggestion in place of the word typed so far; the caret lands where the snippet says. */
  const accept = (sg: Sug) => {
    const el = ta.current!
    const v = el.value, p = el.selectionStart
    const ls = lineStartOf(v, p)
    const indent = (v.slice(ls).match(/^[ \t]*/) as RegExpMatchArray)[0]
    const idx = sg.insert.length - sg.back
    const pre = sg.insert.slice(0, idx).replace(/\n/g, '\n' + indent), post = sg.insert.slice(idx).replace(/\n/g, '\n' + indent)
    bump(sg.label)
    try { localStorage.setItem(USAGE_KEY, JSON.stringify(getUsage())) } catch { /* ignore */ }
    edit(p - sg.replace, p, pre + post, p - sg.replace + pre.length)
  }
  const vmove = (dy: number) => {
    const el = ta.current!
    el.focus()
    const v = el.value, p = el.selectionStart, ls = lineStartOf(v, p), col = p - ls
    let to: number
    if (dy < 0) { if (ls === 0) to = 0; else { const ps = lineStartOf(v, ls - 1); to = Math.min(ps + col, ls - 1) } }
    else { const le = lineEndOf(v, p); if (le >= v.length) to = v.length; else { const ne = lineEndOf(v, le + 1); to = Math.min(le + 1 + col, ne) } }
    el.setSelectionRange(to, to)
    setCaret({ s: to, e: to })
  }

  useImperativeHandle(ref, () => ({
    apply: accept, vmove,
    undo: () => { ta.current?.focus(); document.execCommand('undo') },
    redo: () => { ta.current?.focus(); document.execCommand('redo') },
    comment: () => { const el = ta.current; if (el) toggleComment(el.value, el.selectionStart, el.selectionEnd) },
    insert: (text, back = 0) => { const el = ta.current!; edit(el.selectionStart, el.selectionEnd, text, el.selectionStart + text.length - back) },
    move: (dx) => {
      const el = ta.current!
      el.focus()
      const p = Math.max(0, Math.min(el.value.length, el.selectionStart + dx))
      el.setSelectionRange(p, p)
      setCaret({ s: p, e: p })
    },
    blur: () => ta.current?.blur(),
  }))

  // jump to a line (after an error, or when a terminal link is clicked)
  useEffect(() => {
    const el = ta.current, sc = scroller.current
    if (!jump || !el || !sc) return
    const pos = el.value.split('\n').slice(0, jump.line - 1).reduce((a, l) => a + l.length + 1, 0)
    if (jump.focus) { el.focus({ preventScroll: true }); el.setSelectionRange(pos, pos) }
    const row = sc.querySelector<HTMLElement>(`[data-line="${jump.line}"]`)
    if (row) sc.scrollTo({ top: Math.max(0, row.offsetTop - lh * 3), behavior: 'smooth' })
  }, [jump?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // the selection can also change without a mouse/key event (touch handles, programmatic moves)
  useEffect(() => {
    const h = () => { const el = ta.current; if (el && document.activeElement === el) setCaret((c) => (c && c.s === el.selectionStart && c.e === el.selectionEnd ? c : { s: el.selectionStart, e: el.selectionEnd })) }
    document.addEventListener('selectionchange', h)
    return () => document.removeEventListener('selectionchange', h)
  }, [])

  // any change that did not come from a multi-cursor edit (undo, paste, a line shortcut, typing) drops the extra cursors
  useEffect(() => { if (extraRef.current.length && value !== lastMulti.current) setExtra([]) }, [value])

  // re-measure highlights when the editor is resized or wraps differently
  useEffect(() => {
    const sc = scroller.current
    if (!sc || typeof ResizeObserver === 'undefined') return
    let t = 0
    const ro = new ResizeObserver(() => { window.clearTimeout(t); t = window.setTimeout(() => setTick((x) => x + 1), 60) })
    ro.observe(sc)
    let raf = 0
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; setTick((x) => x + 1) }) }   // keep the popup attached to the caret
    sc.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => { ro.disconnect(); window.clearTimeout(t); sc.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); cancelAnimationFrame(raf) }
  }, [])

  // popup position (viewport coordinates, drawn in a portal so no panel can clip it): right under the caret, above it when there is no room below
  useLayoutEffect(() => {
    const host = inner.current, sc = scroller.current
    if (!popOpen || !host || !sc || !caret) { setPop(null); return }
    const codes = host.querySelectorAll<HTMLElement>('[data-line] code')
    const before = value.slice(0, caret.s)
    const code = codes[before.split('\n').length - 1]
    if (!code) return
    const r = document.createRange()
    const [n, o] = textPoint(code, caret.s - (before.lastIndexOf('\n') + 1))
    r.setStart(n, o); r.setEnd(n, o)
    const rect = r.getClientRects()[0] ?? code.getBoundingClientRect()
    const view = sc.getBoundingClientRect()
    if (rect.bottom < view.top || rect.top > view.bottom) { setPop(null); return }   // caret scrolled out of the editor
    const want = Math.min(popItems.length, 8) * 30 + 12
    const below = window.innerHeight - rect.bottom - 10, above = rect.top - 10
    const down = below >= Math.min(want, 160) || below >= above
    const maxH = Math.max(90, Math.min(want, 260, down ? below : above))
    const left = Math.max(8, Math.min(rect.left - 6, window.innerWidth - 288 - 8))
    const next = down ? { left, top: Math.round(rect.bottom + 3), maxH } : { left, bottom: Math.round(window.innerHeight - rect.top + 3), maxH }
    setPop((c) => (c && c.left === next.left && c.top === next.top && c.bottom === next.bottom && c.maxH === next.maxH ? c : next))
  }, [popOpen, popItems, caret, value, wrap, fontSize, tick])

  // ---- highlights: same-word occurrences, matching bracket pair, extra cursors (measured from the rendered rows) ----
  useLayoutEffect(() => {
    const box = overlay.current, host = inner.current
    if (!box || !host) return
    box.textContent = ''
    const codes = host.querySelectorAll<HTMLElement>('[data-line] code')
    if (!codes.length) return
    const starts = [0]
    for (let i = value.indexOf('\n'); i >= 0; i = value.indexOf('\n', i + 1)) starts.push(i + 1)
    const lineOf = (p: number) => { let lo = 0, hi = starts.length - 1; while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (starts[mid] <= p) lo = mid; else hi = mid - 1 } return lo }
    const base = host.getBoundingClientRect()
    const rectsOf = (a: number, b: number) => {
      const li = lineOf(a), code = codes[li]
      if (!code) return []
      const r = document.createRange()
      const [n1, o1] = textPoint(code, a - starts[li], true); const [n2, o2] = textPoint(code, b - starts[li])
      r.setStart(n1, o1); r.setEnd(n2, o2)
      return Array.from(r.getClientRects()).filter((x) => a === b || x.width > 0.5)   // a collapsed range (cursor) is zero-width by nature
    }
    const add = (cls: string, a: number, b: number, fullLine = false) => {
      for (const r of rectsOf(a, b)) {
        const d = document.createElement('div')
        d.className = cls
        const h = fullLine ? lh : r.height
        d.style.cssText = `left:${r.left - base.left}px;top:${r.top - base.top - (h - r.height) / 2}px;width:${fullLine ? 2 : r.width}px;height:${h}px`
        box.appendChild(d)
      }
    }

    if (caret) {
      const { s, e } = caret
      // 1) every use of the word under the caret
      let word = ''
      let a = s
      if (s !== e) { const t = value.slice(s, e); if (IDENT.test(t)) { word = t; a = s } }
      else {
        let x = s, y = s
        while (x > 0 && isWordCh(value[x - 1])) x--
        while (y < value.length && isWordCh(value[y])) y++
        const t = value.slice(x, y)
        if (IDENT.test(t)) { word = t; a = x }
      }
      if (word) {
        const hits: number[] = []
        for (let i = value.indexOf(word); i >= 0 && hits.length < 300; i = value.indexOf(word, i + 1)) {
          if (!isWordCh(value[i - 1]) && !isWordCh(value[i + word.length])) hits.push(i)
        }
        if (hits.length > 1) hits.forEach((i) => add(i === a ? 'ide-occ ide-occ-cur' : 'ide-occ', i, i + word.length))
      }
      // 2) the bracket next to the caret and its partner
      if (s === e) {
        for (const i of [s, s - 1]) {
          const c = value[i]
          if (c && (OPEN[c] || CLOSE[c])) {
            const j = matchBracket(value, mask, i)
            if (j >= 0) { add('ide-br', i, i + 1); add('ide-br', j, j + 1); break }
          }
        }
      }
    }
    // 3) extra cursors
    for (const p of extra) add('ide-caret', p, p, true)
  }, [value, caret, extra, mask, wrap, fontSize, lang, tick, lh, rows])

  /** Apply one edit at every cursor at once (the primary selection plus the extra cursors). */
  const multiEdit = (fn: (v: string, s: number, e: number) => { from: number; to: number; text: string }) => {
    const el = ta.current!
    const v = el.value
    const all = [{ s: el.selectionStart, e: el.selectionEnd, primary: true }, ...extraRef.current.map((p) => ({ s: p, e: p, primary: false }))]
      .sort((a, b) => a.s - b.s)
    let out = '', last = 0, lo = Infinity, hi = 0
    const after: { pos: number; primary: boolean }[] = []
    for (const c of all) {
      const r = fn(v, c.s, c.e)
      const from = Math.max(r.from, last), to = Math.max(r.to, from)
      out += v.slice(last, from) + r.text
      last = to
      after.push({ pos: out.length, primary: c.primary })   // where this cursor lands in the new text
      lo = Math.min(lo, from); hi = Math.max(hi, to)
    }
    out += v.slice(last)
    const prefix = v.slice(0, lo), suffix = v.slice(hi)
    const middle = out.slice(prefix.length, out.length - suffix.length)
    const primary = after.find((a) => a.primary)!.pos
    const rest = Array.from(new Set(after.filter((a) => !a.primary).map((a) => a.pos))).filter((p) => p !== primary)
    lastMulti.current = out
    edit(lo, hi, middle, primary)
    setExtra(rest)
  }

  const move = (dir: 1 | -1, v: string, s: number, e: number) => {
    const last = e > s && v[e - 1] === '\n' ? e - 1 : e
    const bs = lineStartOf(v, s), be = lineEndOf(v, last)
    const block = v.slice(bs, be)
    if (dir < 0) {
      if (bs === 0) return
      const ps = lineStartOf(v, bs - 1), prev = v.slice(ps, bs - 1)
      edit(ps, be, block + '\n' + prev, s - prev.length - 1, e - prev.length - 1)
    } else {
      if (be >= v.length) return
      const ne = lineEndOf(v, be + 1), next = v.slice(be + 1, ne)
      edit(bs, ne, next + '\n' + block, s + next.length + 1, e + next.length + 1)
    }
  }
  const duplicate = (dir: 1 | -1, v: string, s: number, e: number) => {
    const last = e > s && v[e - 1] === '\n' ? e - 1 : e
    const bs = lineStartOf(v, s), be = lineEndOf(v, last)
    const block = v.slice(bs, be)
    if (dir < 0) edit(bs, bs, block + '\n', s, e)                                   // caret stays on the upper copy
    else edit(be, be, '\n' + block, s + block.length + 1, e + block.length + 1)     // caret follows to the lower copy
  }
  const deleteLines = (v: string, s: number, e: number) => {
    const last = e > s && v[e - 1] === '\n' ? e - 1 : e
    const bs = lineStartOf(v, s), be = lineEndOf(v, last)
    const col = s - bs
    if (be < v.length) {
      const nextEnd = lineEndOf(v, be + 1)
      const p = bs + Math.min(col, nextEnd - (be + 1))
      edit(bs, be + 1, '', p)
    } else if (bs > 0) {
      const ps = lineStartOf(v, bs - 1)
      edit(bs - 1, be, '', ps + Math.min(col, bs - 1 - ps))
    } else edit(0, be, '', 0)
  }
  /** Ctrl+/ : comment the selected lines, or uncomment them when every non-blank line is already commented. */
  const toggleComment = (v: string, s: number, e: number) => {
    const last = e > s && v[e - 1] === '\n' ? e - 1 : e
    const bs = lineStartOf(v, s), be = lineEndOf(v, last)
    const lines = v.slice(bs, be).split('\n')
    const body = lines.filter((l) => l.trim())
    if (!body.length) return
    const sql = lang === 'sql'   // SQL comments start with --
    const un = body.every((l) => (sql ? /^\s*--/ : /^\s*\/\//).test(l))
    const ind = Math.min(...body.map((l) => (l.match(/^\s*/) as RegExpMatchArray)[0].length))
    const out = lines.map((l) => (un ? l.replace(sql ? /^(\s*)-- ?/ : /^(\s*)\/\/ ?/, '$1') : l.trim() ? `${l.slice(0, ind)}${sql ? '--' : '//'} ${l.slice(ind)}` : l))
    const d0 = out[0].length - lines[0].length
    const total = out.join('\n').length - (be - bs)
    const ns = Math.max(bs, s + d0)
    edit(bs, be, out.join('\n'), ns, s === e ? ns : e + total)
  }
  const addCursor = (dir: 1 | -1, v: string, s: number) => {
    const all = [s, ...extraRef.current]
    const from = dir > 0 ? Math.max(...all) : Math.min(...all)
    const ls = lineStartOf(v, from), col = from - ls
    let p: number
    if (dir > 0) { const le = lineEndOf(v, from); if (le >= v.length) return; const ne = lineEndOf(v, le + 1); p = Math.min(le + 1 + col, ne) }
    else { if (ls === 0) return; const ps = lineStartOf(v, ls - 1); p = Math.min(ps + col, ls - 1) }
    setExtra(Array.from(new Set([...extraRef.current, p])).filter((x) => x !== s))
  }

  // text typed / deleted / pasted while extra cursors exist goes to every cursor
  useEffect(() => {
    const el = ta.current
    if (!el) return
    const h = (e: InputEvent) => {
      if (busy.current || !extraRef.current.length) return
      const t = e.inputType
      if (t === 'insertText' && e.data) { e.preventDefault(); multiEdit((_v, s, en) => ({ from: s, to: en, text: e.data! })) }
      else if (t === 'deleteContentBackward') { e.preventDefault(); multiEdit((_v, s, en) => ({ from: s === en ? Math.max(0, s - 1) : s, to: en, text: '' })) }
      else if (t === 'deleteContentForward') { e.preventDefault(); multiEdit((v, s, en) => ({ from: s, to: s === en ? Math.min(v.length, s + 1) : en, text: '' })) }
    }
    el.addEventListener('beforeinput', h)
    return () => el.removeEventListener('beforeinput', h)
  })

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    const { selectionStart: s, selectionEnd: en, value: v } = el
    const mod = e.ctrlKey || e.metaKey
    const multi = extraRef.current.length > 0

    if (e.key === 'Escape') {
      if (multi) { e.preventDefault(); setExtra([]); return }
      if (popOpen) { e.preventDefault(); setDismissed(sigKey); return }
      document.getElementById('ide-run')?.focus(); return
    }
    if (e.code === 'Space' && mod && !e.shiftKey && !e.altKey) { e.preventDefault(); setForced(sigKey); setDismissed(''); return }   // Ctrl+Space: suggestions here   // leave the editor (Tab otherwise indents)

    // Ctrl+Enter runs the program (handled at the window); it must not add a line here
    if (e.key === 'Enter' && mod) return

    // ---- suggestion popup ----
    if (popOpen && !mod && !e.altKey) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setNavd(true); setSel((x) => (x + (e.key === 'ArrowDown' ? 1 : popItems.length - 1)) % popItems.length); return }
      if ((e.key === 'Tab' && !e.shiftKey) || (e.key === 'Enter' && navd && !e.shiftKey)) { e.preventDefault(); accept(popItems[Math.min(sel, popItems.length - 1)]); return }
    }

    // ---- line shortcuts ----
    if (e.code === 'Slash' && mod && !e.shiftKey && !e.altKey) { e.preventDefault(); return toggleComment(v, s, en) }   // Ctrl+/ : toggle comment
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
      const dir = e.key === 'ArrowDown' ? 1 : -1
      if (mod && e.altKey && !e.shiftKey) { e.preventDefault(); return addCursor(dir, v, s) }          // Ctrl+Alt+Up/Down: add a cursor above / below
      if (e.altKey && e.shiftKey && !mod) { e.preventDefault(); return duplicate(dir, v, s, en) }      // Shift+Alt+Up/Down: duplicate line up / down
      if (e.altKey && !e.shiftKey && !mod) { e.preventDefault(); return move(dir, v, s, en) }          // Alt+Up/Down: move line up / down
      if (multi) setExtra([])
    }
    if (e.code === 'KeyK' && mod && e.shiftKey && !e.altKey) { e.preventDefault(); return deleteLines(v, s, en) }   // Ctrl+Shift+K: delete line

    // ---- with extra cursors ----
    if (multi) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); return multiEdit((val, p, q) => ({ from: p, to: q, text: '\n' + (val.slice(lineStartOf(val, p), p).match(/^ */) || [''])[0] })) }
      if (e.key === 'Tab' && !e.shiftKey) { e.preventDefault(); return multiEdit((_v, p, q) => ({ from: p, to: q, text: '    ' })) }
      const nav: Record<string, (val: string, p: number) => number> = {
        ArrowLeft: (_v, p) => Math.max(0, p - 1), ArrowRight: (val, p) => Math.min(val.length, p + 1),
        Home: (val, p) => lineStartOf(val, p), End: (val, p) => lineEndOf(val, p),
      }
      if (nav[e.key] && !mod && !e.altKey && !e.shiftKey) {
        e.preventDefault()
        const prim = s !== en ? (e.key === 'ArrowLeft' || e.key === 'Home' ? s : en) : nav[e.key](v, s)
        const pos = Array.from(new Set(extraRef.current.map((p) => nav[e.key](v, p)))).filter((p) => p !== prim)
        el.setSelectionRange(prim, prim); setCaret({ s: prim, e: prim }); setExtra(pos)
        return
      }
      if (!mod && !e.altKey && e.key.length > 1 && !['Shift', 'Control', 'Alt', 'Meta', 'Backspace', 'Delete', 'CapsLock'].includes(e.key)) setExtra([])
    }

    if (e.key === 'Tab') {
      e.preventDefault()
      const lineStart = lineStartOf(v, s)
      if (s === en && !e.shiftKey) return edit(s, en, '    ')
      // indent / outdent every selected line
      const block = v.slice(lineStart, en)
      const out = block.split('\n').map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, '') : '    ' + l)).join('\n')
      edit(lineStart, en, out, lineStart, lineStart + out.length)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const lineStart = lineStartOf(v, s)
      const indent = (v.slice(lineStart, s).match(/^ */) || [''])[0]
      const prev = v[s - 1], next = v[en]
      if (prev === '{' && next === '}') {
        const mid = '\n' + indent + '    '
        return edit(s, en, mid + '\n' + indent, s + mid.length)
      }
      return edit(s, en, '\n' + indent + (prev === '{' ? '    ' : ''))
    }

    if (PAIRS[e.key] && s === en && !e.ctrlKey && !e.metaKey) {
      if (e.key === '"' && v[s] === '"') { e.preventDefault(); el.setSelectionRange(s + 1, s + 1); return }
      e.preventDefault()
      return edit(s, en, e.key + PAIRS[e.key], s + 1)
    }
    if (Object.values(PAIRS).includes(e.key) && s === en && v[s] === e.key) {   // type-over a closer
      e.preventDefault()
      el.setSelectionRange(s + 1, s + 1)
    }
  }

  // Ctrl+C / Ctrl+X with nothing selected copies / cuts the whole line
  const onCopyCut = (e: ClipboardEvent<HTMLTextAreaElement>, cut: boolean) => {
    const el = e.currentTarget
    if (el.selectionStart !== el.selectionEnd || extraRef.current.length) return
    const v = el.value, s = el.selectionStart
    const bs = lineStartOf(v, s), be = lineEndOf(v, s)
    e.preventDefault()
    e.clipboardData.setData('text/plain', v.slice(bs, be) + '\n')
    if (cut) deleteLines(v, s, s)
  }
  const onPaste = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    if (!extraRef.current.length) return
    e.preventDefault()
    const text = e.clipboardData.getData('text/plain')
    const lines = text.split('\n')
    const count = extraRef.current.length + 1
    if (lines.length === count) {   // one line per cursor, top to bottom
      const order = [ta.current!.selectionStart, ...extraRef.current].sort((a, b) => a - b)
      multiEdit((_v, s) => ({ from: s, to: s, text: lines[order.indexOf(s)] ?? '' }))
    } else multiEdit((_v, s, en) => ({ from: s, to: en, text }))
  }

  // caret / selection tracking for the highlights; Alt+click adds a cursor where you were
  const sync = () => { const el = ta.current; if (el) setCaret((c) => (c && c.s === el.selectionStart && c.e === el.selectionEnd ? c : { s: el.selectionStart, e: el.selectionEnd })) }
  const onMouseDown = (e: MouseEvent<HTMLTextAreaElement>) => {
    if (e.altKey && !e.ctrlKey && !e.metaKey) altDown.current = e.currentTarget.selectionStart
    else { altDown.current = null; clearExtra() }
  }
  const onMouseUp = () => {
    const el = ta.current
    if (altDown.current === null || !el) return
    const was = altDown.current
    altDown.current = null
    if (was !== el.selectionStart) setExtra(Array.from(new Set([...extraRef.current, was])))
  }

  return (
    <div ref={scroller} className="ide-code h-full overflow-auto bg-white font-mono text-[#1f2328] dark:bg-[#22252d] dark:text-[#d4d4d4]" style={{ fontSize, lineHeight: `${lh}px`, tabSize: 4 }}>
      <div ref={inner} className="relative min-h-full" style={{ width: wrap ? '100%' : 'max-content', minWidth: '100%' }}>
        <div aria-hidden className="py-4">
          {rows.map((html, i) => {
            const err = errSet.has(i + 1)
            return (
              <div key={i} data-line={i + 1} className={`flex ${err ? 'bg-red-500/10 dark:bg-red-500/15' : ''}`} style={{ minHeight: lh }}>
                <span className={`sticky left-0 z-10 shrink-0 select-none pr-4 text-right ${err ? 'bg-red-50 font-semibold text-red-700 dark:bg-[#2b1e21] dark:text-red-400' : 'bg-white text-[#636976] dark:bg-[#22252d] dark:text-[#969696]'}`} style={{ width: gutter }}>{i + 1}</span>
                <code className={`min-w-0 flex-1 pr-8 ${wrapCls}`} dangerouslySetInnerHTML={{ __html: html || '&#8203;' }} />
              </div>
            )
          })}
        </div>
        <div ref={overlay} aria-hidden className="pointer-events-none absolute inset-0 z-[5]" />
        <textarea
          ref={ta} value={value} onChange={(e) => { onChange(e.target.value); setCaret({ s: e.target.selectionStart, e: e.target.selectionEnd }) }} onKeyDown={onKeyDown}
          onSelect={sync} onMouseDown={onMouseDown} onMouseUp={onMouseUp} onPaste={onPaste} onCopy={(e) => onCopyCut(e, false)} onCut={(e) => onCopyCut(e, true)}
          onFocus={() => onFocusChange?.(true)} onBlur={() => onFocusChange?.(false)}
          id="ide-editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" wrap={wrap ? 'soft' : 'off'} aria-label={`${lang === 'rust' ? 'Rust' : lang === 'sql' ? 'SQL' : 'Java'} code editor`}
          className={`absolute bottom-0 right-0 top-0 resize-none overflow-hidden bg-transparent py-4 pr-8 font-mono text-transparent caret-slate-900 dark:caret-white outline-none selection:bg-sky-500/30 ${wrapCls}`}
          style={{ left: gutter, fontSize, lineHeight: `${lh}px`, tabSize: 4 }}
        />
      </div>
      {popOpen && pop && createPortal(
        <div ref={popRef} role="listbox" aria-label="Suggestions" onMouseDown={(e) => e.preventDefault()}
          className="fixed z-[80] w-72 overflow-auto rounded-xl border border-slate-200 bg-white p-1 font-sans shadow-xl dark:border-white/10 dark:bg-[#2a2e38]" style={{ left: pop.left, top: pop.top, bottom: pop.bottom, maxHeight: pop.maxH }}>
          {popItems.map((it, i) => (
            <div key={it.label + i} role="option" aria-selected={i === sel} onMouseDown={() => accept(it)} onMouseMove={() => { if (i !== sel) setSel(i) }}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-[13px] ${i === sel ? 'bg-sky-500/15' : ''}`}>
              <span className={`grid h-5 min-w-[1.25rem] shrink-0 place-items-center rounded px-0.5 font-mono text-[10px] font-bold ${KIND_BADGE[it.kind].cls}`}>{KIND_BADGE[it.kind].letter}</span>
              <span className="truncate font-mono text-slate-900 dark:text-slate-100">{it.label}</span>
              {it.detail && <span className="ml-auto truncate pl-2 text-[11px] text-slate-400 dark:text-slate-500">{it.detail}</span>}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </div>
  )
})
export default CodeEditor
