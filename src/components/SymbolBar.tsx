import { ChevronDown, Redo2, Undo2 } from 'lucide-react'
import { KIND_BADGE, type EditorApi } from './CodeEditor'
import type { Result } from '../lib/suggest'

type Key = { label: string; text: string; back?: number; wide?: boolean }
const k = (text: string, back = 0, label = text): Key => ({ label, text, back })

// Quick-access symbols per language. Pair keys drop the caret between the two characters.
const JAVA_SYMBOLS: Key[] = [
  k('{}', 1, '{ }'), k('()', 1, '( )'), k('[]', 1, '[ ]'), k('<>', 1, '< >'), k('""', 1, '" "'), k(';'), k('.'), k(','), k('='),
  k('=='), k('!='), k('<='), k('>='), k('&&'), k('||'), k('!'), k('+'), k('-'), k('*'), k('/'), k('%'),
  k('++'), k('--'), k('?'), k(':'), k('->'), k('::'), k('_'), k("'"), k('\\'), k('&'), k('|'), k('^'), k('@'),
]
const JAVA_WORDS: Key[] = [
  k('public '), k('static '), k('int '), k('String '), k('boolean '), k('new '), k('return '), k('for (int i = 0; i < n; i++) {}', 1, 'for'),
  k('if () {}', 4, 'if'), k('else '), k('while () {}', 4, 'while'), k('null'), k('true'), k('false'), k('int[] '), k('List<>', 1), k('Map<>', 1),
  k('System.out.println();', 2, 'println'), k('class '), k('this.'), k('.length'), k('.size()'),
]
const RUST_SYMBOLS: Key[] = [
  k('{}', 1, '{ }'), k('()', 1, '( )'), k('[]', 1, '[ ]'), k('<>', 1, '< >'), k('""', 1, '" "'), k(';'), k(':'), k('::'), k('->'), k('=>'),
  k('&'), k('&mut ', 0, '&mut'), k('*'), k('.'), k('..'), k(','), k('='), k('=='), k('!='), k('<='), k('>='), k('&&'), k('||'), k('!'), k('?'),
  k('+'), k('-'), k('/'), k('%'), k('||', 1, '| |'), k("'"), k('_'), k('#'),
]
const RUST_WORDS: Key[] = [
  k('fn '), k('let '), k('let mut ', 0, 'let mut'), k('mut '), k('pub '), k('struct '), k('impl '), k('enum '), k('return '), k('self'),
  k('match  {}', 3, 'match'), k('if  {}', 3, 'if'), k('for  in  {}', 7, 'for'), k('while  {}', 3, 'while'), k('loop {}', 1, 'loop'),
  k('Vec<>', 1), k('Option<>', 1), k('Result<>', 1), k('HashMap<>', 1), k('Box<>', 1), k('String'), k('&str'),
  k('Some()', 1), k('None'), k('Ok()', 1), k('Err()', 1), k('println!("{}", );', 3, 'println!'),
  k('.unwrap()'), k('.len()'), k('.iter()'), k('.collect::<Vec<_>>()', 0, '.collect()'),
]

// Symbols the suggestion engine can ask to show first or last (e.g. no ";" on an empty line); all are looked up by their inserted text.
// Mid-line with nothing to complete (e.g. right after `foo(1)`): operators and operands are what comes next, not `public static`.
const JAVA_NEXT: Key[] = [k('=='), k('!='), k('&&'), k('||'), k('<'), k('>'), k('<='), k('>='), k('+'), k('-'), k('*'), k('/'), k('%'), k('?'), k(':'), k('new '), k('null'), k('instanceof ')]
const RUST_NEXT: Key[] = [k('=='), k('!='), k('&&'), k('||'), k('<'), k('>'), k('+'), k('-'), k('*'), k('/'), k('%'), k('as '), k('..'), k('=>'), k('?'), k('None')]
const SQL_SYMBOLS: Key[] = [
  k('()', 1, '( )'), k("''", 1, "' '"), k('\"\"', 1, '" "'), k(';'), k(','), k('.'), k('*'), k('='), k('<>'), k('<='), k('>='), k('<'), k('>'),
  k('::'), k('->'), k('->>'), k('||'), k('%'), k('_'), k('+'), k('-'), k('/'), k('@>'), k('&&'), k('$$'),
]
const SQL_WORDS: Key[] = [
  k('SELECT '), k('FROM '), k('WHERE '), k('JOIN '), k(' ON '), k('GROUP BY '), k('ORDER BY '), k('LIMIT '), k('INSERT INTO '), k('VALUES ()', 1, 'VALUES'),
  k('UPDATE '), k('SET '), k('DELETE FROM '), k('CREATE TABLE () ;', 3, 'CREATE TABLE'), k('PRIMARY KEY'), k('NOT NULL'), k('REFERENCES '), k('DEFAULT '),
  k('AND '), k('OR '), k('NOT '), k('NULL'), k('AS '), k('DISTINCT '), k('count(*)'),
]
const SQL_NEXT: Key[] = [k('='), k('<>'), k('<'), k('>'), k(','), k(';'), k('AND '), k('OR '), k('FROM '), k('WHERE '), k('ORDER BY '), k('AS '), k('NULL')]
const EXTRA: Key[] = [k('//'), k('--'), k('%d'), k('%s'), k('\\n', 0, '\\n'), k(')'), k('()', 1, '( )')]

/**
 * Keyboard helper shown above the native keyboard on touch screens. Taps never steal focus from the editor.
 * Row 1: smart suggestions for the caret position (type-aware methods, "new HashMap<>()", loops for your arrays...).
 * Row 2: symbols ordered for this spot (a ";" only where a statement can end), cursor keys, undo / redo.
 */
export default function SymbolBar({ editor, inset, onHide, lang = 'java', sug }: { editor: EditorApi | null; inset: number; onHide: () => void; lang?: 'java' | 'rust' | 'sql'; sug?: Result | null }) {
  const SYMBOLS = lang === 'rust' ? RUST_SYMBOLS : lang === 'sql' ? SQL_SYMBOLS : JAVA_SYMBOLS
  const WORDS = lang === 'rust' ? RUST_WORDS : lang === 'sql' ? SQL_WORDS : JAVA_WORDS
  const NEXT = lang === 'rust' ? RUST_NEXT : lang === 'sql' ? SQL_NEXT : JAVA_NEXT
  const keep = { onMouseDown: (e: React.MouseEvent) => e.preventDefault() }   // keep the editor focused (and its keyboard open)
  const cell = 'grid h-10 min-w-[2.5rem] shrink-0 place-items-center rounded-lg bg-slate-100 px-2.5 font-mono text-[15px] text-slate-800 active:bg-sky-200 dark:bg-white/10 dark:text-slate-100 dark:active:bg-sky-500/40'

  const byText = new Map<string, Key>([...SYMBOLS, ...EXTRA].map((x) => [x.text, x]))
  const first = (sug?.first ?? []).map((t) => byText.get(t)).filter((x): x is Key => !!x)
  const last = (sug?.last ?? []).map((t) => byText.get(t)).filter((x): x is Key => !!x)
  const taken = new Set([...first, ...last].map((x) => x.text))
  const middle = SYMBOLS.filter((x) => !taken.has(x.text))
  const sym = (x: Key, hot = false) => (
    <button key={x.label} type="button" aria-label={`Insert ${x.text}`} {...keep} onClick={() => editor?.insert(x.text, x.back)} className={`${cell} ${hot ? 'ring-1 ring-sky-400/60' : ''}`}>{x.label}</button>
  )
  const items = sug?.items ?? []
  return (
    <div role="toolbar" aria-label="Code helper" style={{ bottom: inset }} className="fixed inset-x-0 z-[70] space-y-1.5 border-t border-slate-200 bg-white px-2 pb-2 pt-2 dark:border-white/10 dark:bg-[#101216]">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto" aria-label="Suggestions">
        {items.length > 0
          ? items.map((it, i) => (
            <button key={it.label + i} type="button" aria-label={`Insert ${it.label}`} {...keep} onClick={() => editor?.apply(it)}
              className="flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 text-[13px] text-slate-800 active:bg-sky-200 dark:bg-white/10 dark:text-slate-100 dark:active:bg-sky-500/40">
              <span className={`grid h-5 min-w-[1.25rem] place-items-center rounded px-0.5 font-mono text-[10px] font-bold ${KIND_BADGE[it.kind].cls}`}>{KIND_BADGE[it.kind].letter}</span>
              <span className="max-w-[12rem] truncate font-mono">{it.label}</span>
              {it.detail && it.kind !== 'snippet' && <span className="max-w-[6rem] truncate text-[11px] text-slate-500 dark:text-slate-400">{it.detail}</span>}
            </button>
          ))
          : (sug && sug.ctx === 'none' ? NEXT : WORDS).map((x) => <button key={x.label} type="button" aria-label={`Insert ${x.text.trim()}`} {...keep} onClick={() => editor?.insert(x.text, x.back)} className={`${cell} text-[13px]`}>{x.label.trim()}</button>)}
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        <button type="button" aria-label="Hide keyboard" onClick={onHide} {...keep} className={`${cell} text-slate-600 dark:text-slate-400`}><ChevronDown size={18} aria-hidden /></button>
        {first.slice(0, 4).map((x) => sym(x, true))}
        <button type="button" aria-label="Insert tab" {...keep} onClick={() => editor?.insert('    ')} className={`${cell} text-sm`}>Tab</button>
        <button type="button" aria-label="Cursor left" {...keep} onClick={() => editor?.move(-1)} className={cell}>←</button>
        <button type="button" aria-label="Cursor right" {...keep} onClick={() => editor?.move(1)} className={cell}>→</button>
        <button type="button" aria-label="Cursor up" {...keep} onClick={() => editor?.vmove(-1)} className={cell}>↑</button>
        <button type="button" aria-label="Cursor down" {...keep} onClick={() => editor?.vmove(1)} className={cell}>↓</button>
        <button type="button" aria-label="Undo" {...keep} onClick={() => editor?.undo()} className={cell}><Undo2 size={17} aria-hidden /></button>
        <button type="button" aria-label="Redo" {...keep} onClick={() => editor?.redo()} className={cell}><Redo2 size={17} aria-hidden /></button>
        <button type="button" aria-label="Comment line" {...keep} onClick={() => editor?.comment()} className={cell}>{lang === 'sql' ? '--' : '//'}</button>
        {first.slice(4).map((x) => sym(x))}
        {middle.map((x) => sym(x))}
        {last.map((x) => sym(x))}
      </div>
    </div>
  )
}
