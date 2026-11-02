import type { KeyboardEvent, PointerEvent } from 'react'

type Props = {
  axis: 'x' | 'y'                       // x = vertical bar (drag sideways), y = horizontal bar (drag up/down)
  label: string
  onDrag: (clientX: number, clientY: number) => void
  onNudge: (dx: number, dy: number) => void
  onReset: () => void
  onStart?: () => void
  onEnd?: () => void
}

/** Drag handle (like a resizable sidebar). Also keyboard-operable: focus it and use the arrow keys; Enter resets. */
export default function Resizer({ axis, label, onDrag, onNudge, onReset, onStart, onEnd }: Props) {
  const down = (e: PointerEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    document.body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
    document.body.classList.add('select-none')
    onStart?.()
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) onDrag(e.clientX, e.clientY)
  }
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId)
    document.body.style.cursor = ''
    document.body.classList.remove('select-none')
    onEnd?.()
  }
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const k = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]
    if (k) { e.preventDefault(); onNudge(k[0], k[1]) }
    else if (e.key === 'Enter') { e.preventDefault(); onReset() }
  }
  return (
    <div
      role="separator" tabIndex={0} aria-label={`${label} (arrow keys to resize, Enter to reset)`} aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onKeyDown={key} onDoubleClick={onReset}
      className={`group absolute z-10 flex touch-none items-center justify-center outline-none ${axis === 'x' ? '-inset-x-1 inset-y-0 cursor-col-resize' : 'inset-x-0 -inset-y-1 cursor-row-resize'}`}
    >
      <span className={`rounded-full bg-slate-400/40 transition-colors duration-200 group-hover:bg-sky-500/70 group-focus-visible:bg-sky-500 group-active:bg-sky-500 dark:bg-white/20 ${axis === 'x' ? 'h-10 w-1' : 'h-1 w-10'}`} />
    </div>
  )
}
