import { useMemo, useRef, type KeyboardEvent } from 'react'
import { highlight } from './content'

const PAIRS: Record<string, string> = { '{': '}', '(': ')', '[': ']', '"': '"' }

/** Lightweight IDE-style editor: a transparent textarea over a Prism-highlighted <pre>. */
export default function CodeEditor({ value, onChange, onRun }: { value: string; onChange: (v: string) => void; onRun: () => void }) {
  const ta = useRef<HTMLTextAreaElement>(null)
  const html = useMemo(() => highlight(value, 'java') + '\n', [value])
  const lineCount = value.split('\n').length
  const nums = useMemo(() => Array.from({ length: lineCount }, (_, i) => i + 1).join('\n'), [lineCount])

  const replace = (start: number, end: number, text: string, caret = start + text.length) => {
    const el = ta.current!
    el.focus()
    el.setRangeText(text, start, end, 'end')
    el.setSelectionRange(caret, caret)
    onChange(el.value)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget
    const { selectionStart: s, selectionEnd: en, value: v } = el
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') { e.preventDefault(); onRun(); return }

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
    <div className="h-full overflow-auto bg-[#1e1e1e] font-mono text-[13px] leading-6 text-[#d4d4d4]" style={{ tabSize: 4 }}>
      <div className="flex min-h-full w-max min-w-full">
        <pre aria-hidden className="sticky left-0 z-10 m-0 select-none bg-[#1e1e1e] py-4 pl-4 pr-4 text-right text-slate-600">{nums}</pre>
        <div className="relative flex-1">
          <pre aria-hidden className="m-0 min-h-full py-4 pr-8"><code dangerouslySetInnerHTML={{ __html: html }} /></pre>
          <textarea
            ref={ta} value={value} onChange={(e) => onChange(e.target.value)} onKeyDown={onKeyDown}
            spellCheck={false} autoCapitalize="off" autoCorrect="off" autoComplete="off" wrap="off" aria-label="Java code editor"
            className="absolute inset-0 h-full w-full resize-none overflow-hidden whitespace-pre bg-transparent py-4 pr-8 font-mono text-[13px] leading-6 text-transparent caret-white outline-none selection:bg-sky-500/30"
            style={{ tabSize: 4 }}
          />
        </div>
      </div>
    </div>
  )
}
