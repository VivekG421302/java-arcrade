import { ChevronDown } from 'lucide-react'
import type { EditorApi } from './CodeEditor'

type Key = { label: string; text: string; back?: number; wide?: boolean }
const k = (text: string, back = 0, label = text): Key => ({ label, text, back })

// Quick-access symbols for Java. Pair keys drop the caret between the two characters.
const SYMBOLS: Key[] = [
  k('{}', 1, '{ }'), k('()', 1, '( )'), k('[]', 1, '[ ]'), k('<>', 1, '< >'), k('""', 1, '" "'), k(';'), k('.'), k(','), k('='),
  k('=='), k('!='), k('<='), k('>='), k('&&'), k('||'), k('!'), k('+'), k('-'), k('*'), k('/'), k('%'),
  k('++'), k('--'), k('?'), k(':'), k('->'), k('::'), k('_'), k("'"), k('\\'), k('&'), k('|'), k('^'), k('@'),
]
const WORDS: Key[] = [
  k('public '), k('static '), k('int '), k('String '), k('boolean '), k('new '), k('return '), k('for (int i = 0; i < n; i++) {}', 1, 'for'),
  k('if () {}', 4, 'if'), k('else '), k('while () {}', 4, 'while'), k('null'), k('true'), k('false'), k('int[] '), k('List<>', 1), k('Map<>', 1),
  k('System.out.println();', 2, 'println'), k('class '), k('this.'), k('.length'), k('.size()'),
]

/** Symbol keyboard shown above the native keyboard on touch screens. Taps never steal focus from the editor. */
export default function SymbolBar({ editor, inset, onHide }: { editor: EditorApi | null; inset: number; onHide: () => void }) {
  const keep = { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }   // keep the editor focused (and its keyboard open)
  const cell = 'grid h-10 min-w-[2.5rem] shrink-0 place-items-center rounded-lg bg-white/10 px-2.5 font-mono text-[15px] text-slate-100 active:bg-sky-500/40'
  return (
    <div role="toolbar" aria-label="Code symbols" style={{ bottom: inset }} className="fixed inset-x-0 z-[70] space-y-1.5 border-t border-white/10 bg-[#101216] px-2 pb-2 pt-2">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        <button type="button" aria-label="Hide keyboard" onClick={onHide} {...keep} className={`${cell} text-slate-400`}><ChevronDown size={18} aria-hidden /></button>
        <button type="button" aria-label="Insert tab" {...keep} onClick={() => editor?.insert('    ')} className={`${cell} text-sm`}>Tab</button>
        <button type="button" aria-label="Cursor left" {...keep} onClick={() => editor?.move(-1)} className={cell}>←</button>
        <button type="button" aria-label="Cursor right" {...keep} onClick={() => editor?.move(1)} className={cell}>→</button>
        {SYMBOLS.map((s) => <button key={s.label} type="button" aria-label={`Insert ${s.text}`} {...keep} onClick={() => editor?.insert(s.text, s.back)} className={cell}>{s.label}</button>)}
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {WORDS.map((s) => <button key={s.label} type="button" aria-label={`Insert ${s.text.trim()}`} {...keep} onClick={() => editor?.insert(s.text, s.back)} className={`${cell} text-[13px]`}>{s.label.trim()}</button>)}
      </div>
    </div>
  )
}
