import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type KeyboardEvent } from 'react'
import { highlight } from './content'

export type EditorApi = { insert: (text: string, back?: number) => void; move: (dx: number) => void; blur: () => void }
export type Jump = { line: number; id: number; focus?: boolean }

const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']', '"': '"' }

type Props = {
  value: string
  onChange: (v: string) => void
  errorLines?: number[]
  jump?: Jump
  onFocusChange?: (focused: boolean) => void
  fontSize?: number
  wrap?: boolean
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

/** IDE-style editor: a transparent textarea over Prism-highlighted rows (one row per line, so wrapping keeps numbers aligned). */
const CodeEditor = forwardRef<EditorApi, Props>(function CodeEditor({ value, onChange, errorLines = [], jump, onFocusChange, fontSize = 13, wrap = false }, ref) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const rows = useMemo(() => splitLines(highlight(value, 'java')), [value])
  const errSet = useMemo(() => new Set(errorLines), [errorLines])
  const lh = Math.round(fontSize * 1.85)
  const gutter = Math.ceil(String(rows.length).length * fontSize * 0.62) + 28
  const wrapCls = wrap ? 'whitespace-pre-wrap [overflow-wrap:anywhere]' : 'whitespace-pre'

  const replace = (start: number, end: number, text: string, caret = start + text.length) => {
    const el = ta.current!
    el.focus()
    el.setRangeText(text, start, end, 'end')
    el.setSelectionRange(caret, caret)
    onChange(el.value)
  }

  useImperativeHandle(ref, () => ({
    insert: (text, back = 0) => { const el = ta.current!; replace(el.selectionStart, el.selectionEnd, text, el.selectionStart + text.length - back) },
    move: (dx) => {
      const el = ta.current!
      el.focus()
      const p = Math.max(0, Math.min(el.value.length, el.selectionStart + dx))
      el.setSelectionRange(p, p)
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

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    const { selectionStart: s, selectionEnd: en, value: v } = el
    if (e.key === 'Escape') { document.getElementById('ide-run')?.focus(); return }   // leave the editor (Tab otherwise indents)

    if (e.key === 'Tab') {
      e.preventDefault()
      const lineStart = v.lastIndexOf('\n', s - 1) + 1
      if (s === en && !e.shiftKey) return replace(s, en, '    ')
      // indent / outdent every selected line
      const block = v.slice(lineStart, en)
      const out = block.split('\n').map((l) => (e.shiftKey ? l.replace(/^ {1,4}/, '') : '    ' + l)).join('\n')
      replace(lineStart, en, out, lineStart + out.length)
      el.setSelectionRange(lineStart, lineStart + out.length)
      return
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      const lineStart = v.lastIndexOf('\n', s - 1) + 1
      const indent = (v.slice(lineStart, s).match(/^ */) || [''])[0]
      const prev = v[s - 1], next = v[en]
      if (prev === '{' && next === '}') {
        const mid = '\n' + indent + '    '
        return replace(s, en, mid + '\n' + indent, s + mid.length)
      }
      return replace(s, en, '\n' + indent + (prev === '{' ? '    ' : ''))
    }

    if (PAIRS[e.key] && s === en && !e.ctrlKey && !e.metaKey) {
      if (e.key === '"' && v[s] === '"') { e.preventDefault(); el.setSelectionRange(s + 1, s + 1); return }
      e.preventDefault()
      return replace(s, en, e.key + PAIRS[e.key], s + 1)
    }
    if (Object.values(PAIRS).includes(e.key) && s === en && v[s] === e.key) {   // type-over a closer
      e.preventDefault()
      el.setSelectionRange(s + 1, s + 1)
    }
  }

  return (
    <div ref={scroller} className="h-full overflow-auto bg-[#1e1e1e] font-mono text-[#d4d4d4]" style={{ fontSize, lineHeight: `${lh}px`, tabSize: 4 }}>
      <div className="relative min-h-full" style={{ width: wrap ? '100%' : 'max-content', minWidth: '100%' }}>
        <div aria-hidden className="py-4">
          {rows.map((html, i) => {
            const err = errSet.has(i + 1)
            return (
              <div key={i} data-line={i + 1} className={`flex ${err ? 'bg-red-500/15' : ''}`} style={{ minHeight: lh }}>
                <span className={`sticky left-0 z-10 shrink-0 select-none pr-4 text-right ${err ? 'bg-[#2b1e21] font-semibold text-red-400' : 'bg-[#1e1e1e] text-slate-600'}`} style={{ width: gutter }}>{i + 1}</span>
                <code className={`min-w-0 flex-1 pr-8 ${wrapCls}`} dangerouslySetInnerHTML={{ __html: html || '&#8203;' }} />
              </div>
            )
          })}
        </div>
        <textarea
          ref={ta} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
          onFocus={() => onFocusChange?.(true)} onBlur={() => onFocusChange?.(false)}
          id="ide-editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" wrap={wrap ? 'soft' : 'off'} aria-label="Java code editor"
          className={`absolute bottom-0 right-0 top-0 resize-none overflow-hidden bg-transparent py-4 pr-8 font-mono text-transparent caret-white outline-none selection:bg-sky-500/30 ${wrapCls}`}
          style={{ left: gutter, fontSize, lineHeight: `${lh}px`, tabSize: 4 }}
        />
      </div>
    </div>
  )
})
export default CodeEditor
