// One place for every keyboard shortcut. Matching uses e.code, so Alt+letter works on macOS too.
export type ShortcutId =
  | 'ide' | 'menu' | 'run' | 'terminal' | 'hideApp' | 'next' | 'prev' | 'dock' | 'reset' | 'focus'
  | 'solution' | 'leetcode' | 'appNarrower' | 'appWider' | 'termSmaller' | 'termBigger' | 'fontSmaller' | 'fontBigger' | 'wrap' | 'course' | 'home'

type Def = { code: string; alt?: boolean; mod?: boolean }
const DEFS: Record<ShortcutId, Def> = {
  ide: { code: 'KeyI', alt: true },
  menu: { code: 'KeyM', alt: true },
  run: { code: 'Enter', mod: true },
  terminal: { code: 'KeyT', alt: true },
  hideApp: { code: 'KeyH', alt: true },
  next: { code: 'KeyN', alt: true },
  prev: { code: 'KeyP', alt: true },
  dock: { code: 'KeyD', alt: true },
  reset: { code: 'KeyZ', alt: true },
  focus: { code: 'KeyC', alt: true },
  solution: { code: 'KeyS', alt: true },
  leetcode: { code: 'KeyL', alt: true },
  appNarrower: { code: 'BracketLeft', alt: true },
  appWider: { code: 'BracketRight', alt: true },
  termSmaller: { code: 'Minus', alt: true },
  termBigger: { code: 'Equal', alt: true },
  fontSmaller: { code: 'Comma', alt: true },
  fontBigger: { code: 'Period', alt: true },
  wrap: { code: 'KeyW', alt: true },
  course: { code: 'KeyO', alt: true },
  home: { code: 'KeyG', alt: true },   // Go home (Alt+H already hides the app)
}
const NAMES: Record<string, string> = { Enter: 'Enter', BracketLeft: '[', BracketRight: ']', Minus: '-', Equal: '=', Comma: ',', Period: '.' }

export const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/i.test(navigator.platform)

export function keyLabel(id: ShortcutId) {
  const d = DEFS[id]
  const key = d.code.startsWith('Key') ? d.code.slice(3) : NAMES[d.code] ?? d.code
  const parts = [d.mod ? (isMac ? '⌘' : 'Ctrl') : '', d.alt ? (isMac ? '⌥' : 'Alt') : '', key].filter(Boolean)
  return parts.join(isMac ? '' : '+')
}

export function matches(e: KeyboardEvent, id: ShortcutId) {
  const d = DEFS[id]
  const mod = e.ctrlKey || e.metaKey
  return e.code === d.code && !e.shiftKey && e.altKey === !!d.alt && (d.mod ? mod : !mod)
}

/** Tooltip attributes: `data-tip` text plus the shortcut (or a custom key hint) shown after it. */
export const tip = (label: string, id?: ShortcutId, keyText?: string) => ({
  'data-tip': label,
  ...(id || keyText ? { 'data-key': keyText ?? keyLabel(id!) } : {}),
})

/** Editor-only keys (handled inside the code editor), as [what it does, how to press it] for the cheat sheet. */
export function editorKeys(): [string, string][] {
  const mod = isMac ? '⌘' : 'Ctrl', alt = isMac ? '⌥' : 'Alt', shift = isMac ? '⇧' : 'Shift'
  const j = (...k: string[]) => k.join(isMac ? '' : '+')
  return [
    ['Run the program', keyLabel('run')],
    ['Go to Home', keyLabel('home')],
    ['Move line up / down', j(alt, '↑') + ' / ' + j(alt, '↓')],
    ['Duplicate line up / down', j(shift, alt, '↑') + ' / ' + j(shift, alt, '↓')],
    ['Delete line', j(mod, shift, 'K')],
    ['Comment / uncomment line(s)', j(mod, '/')],
    ['Add cursor above / below', j(mod, alt, '↑') + ' / ' + j(mod, alt, '↓')],
    ['Add cursor where you click', j(alt, 'Click')],
    ['Cut / copy the whole line (nothing selected)', j(mod, 'X') + ' / ' + j(mod, 'C')],
    ['Suggestions: pick / accept / close', '↑ ↓ / Tab / Esc'],
    ['Show suggestions here', j(mod, 'Space')],
    ['Back to one cursor, then leave the editor', 'Esc'],
  ]
}
