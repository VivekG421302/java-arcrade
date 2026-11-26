import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

type Limit = number | (() => number)
const at = (l: Limit) => (typeof l === 'function' ? l() : l)

/**
 * A drag handle between two panes, like the sash in an IDE. Pointer drag, arrow keys (Shift = bigger steps) and a
 * double-click to reset. `vertical` is a vertical bar that changes a WIDTH; otherwise a horizontal bar that changes a HEIGHT.
 * `invert` is for a handle on the leading edge of the pane it sizes (drag left = wider).
 */
export default function Splitter({ vertical, getValue, onChange, onReset, min, max, invert, label, className = '' }: {
  vertical?: boolean
  getValue: () => number
  onChange: (px: number) => void
  onReset?: () => void
  min: Limit
  max: Limit
  invert?: boolean
  label: string
  className?: string
}) {
  const drag = useRef<{ p: number; v: number } | null>(null)
  const clamp = (n: number) => Math.round(Math.max(at(min), Math.min(at(max), n)))
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { p: vertical ? e.clientX : e.clientY, v: getValue() }
    e.preventDefault()
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const delta = (vertical ? e.clientX : e.clientY) - d.p
    onChange(clamp(d.v + (invert ? -delta : delta)))
  }
  const up = (e: PointerEvent<HTMLDivElement>) => { drag.current = null; if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId) }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.shiftKey ? 64 : 16
    const grow = vertical ? (invert ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown'
    const shrink = vertical ? (invert ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp'
    if (e.key === grow) { e.preventDefault(); onChange(clamp(getValue() + step)) }
    else if (e.key === shrink) { e.preventDefault(); onChange(clamp(getValue() - step)) }
    else if (e.key === 'Home' && onReset) { e.preventDefault(); onReset() }
  }
  return (
    <div role="separator" aria-orientation={vertical ? 'vertical' : 'horizontal'} aria-label={label} tabIndex={0}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} onDoubleClick={onReset}
      title={`${label} (drag, or arrow keys; double-click to reset)`}
      className={`group relative z-10 shrink-0 touch-none select-none ${vertical ? 'w-2 cursor-col-resize' : 'h-2 cursor-row-resize'} ${className}`}>
      <span aria-hidden className={`absolute rounded-full bg-slate-300/60 transition-colors dark:bg-white/10 group-hover:bg-sky-500/60 group-focus-visible:bg-sky-500/60 group-active:bg-sky-500 ${vertical ? 'inset-y-0 left-[3px] w-[2px]' : 'inset-x-0 top-[3px] h-[2px]'}`} />
    </div>
  )
}
