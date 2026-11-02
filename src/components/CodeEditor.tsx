import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef, type KeyboardEvent } from 'react'
import { highlight } from './content'

export type EditorApi = { insert: (text: string, back?: number) => void; move: (dx: number) => void; blur: () => void }
export type Jump = { line: number; id: number; focus?: boolean }

const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']', '"': '"' }
const LINE = 24   // leading-6
const PAD = 16    // py-4

type Props = { value: string; onChange: (v: string) => void; errorLines?: number[]; jump?: Jump; onFocusChange?: (focused: boolean) => void }

/** Lightweight IDE-style editor: a transparent textarea over a Prism-highlighted <pre>, with error-line highlighting. */
const CodeEditor = forwardRef<EditorApi, Props>(function CodeEditor({ value, onChange, errorLines = [], jump, onFocusChange }, ref) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const html = useMemo(() => highlight(value, 'java') + '\n', [value])
  const lineCount = value.split('\n').length
  const errSet = useMemo(() => new Set(errorLines), [errorLines])

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
    sc.scrollTo({ top: Math.max(0, (jump.line - 4) * LINE), behavior: 'smooth' })
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
    <div ref={scroller} className="h-full overflow-auto bg-[#1e1e1e] font-mono text-[13px] leading-6 text-[#d4d4d4]" style={{ tabSize: 4 }}>
      <div className="flex min-h-full w-max min-w-full">
        <div aria-hidden className="sticky left-0 z-10 select-none bg-[#1e1e1e] py-4 pl-4 pr-4 text-right text-slate-600">
          {Array.from({ length: lineCount }, (_, i) => <div key={i} className={errSet.has(i + 1) ? 'font-semibold text-red-400' : ''}>{i + 1}</div>)}
        </div>
        <div className="relative flex-1">
          {errorLines.map((n) => (
            <div key={n} aria-hidden className="pointer-events-none absolute inset-x-0 border-l-2 border-red-500 bg-red-500/15" style={{ top: PAD + (n - 1) * LINE, height: LINE }} />
          ))}
          <pre aria-hidden className="relative m-0 min-h-full py-4 pr-8"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
          <textarea
            ref={ta} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
            onFocus={() => onFocusChange?.(true)} onBlur={() => onFocusChange?.(false)}
            id="ide-editor" spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" wrap="off" aria-label="Java code editor"
            className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre bg-transparent py-4 pr-8 font-mono text-[13px] leading-6 text-transparent caret-white outline-none selection:bg-sky-500/30"
            style={{ tabSize: 4 }}
          />
        </div>
      </div>
    </div>
  )
})
export default CodeEditor
