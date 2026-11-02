import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/** One-line row of chips with horizontal scroll, edge fades and left/right arrow buttons (+ arrow-key focus movement). */
export default function ChipScroller({ label, children }: { label: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const [can, setCan] = useState({ left: false, right: false })

  const update = () => {
    const el = ref.current
    if (!el) return
    const left = el.scrollLeft > 4, right = el.scrollLeft + el.clientWidth < el.scrollWidth - 4
    setCan((c) => (c.left === left && c.right === right ? c : { left, right }))   // no state change = no re-render loop
  }
  useEffect(update)
  useEffect(() => {
    const ro = new ResizeObserver(update)
    if (ref.current) ro.observe(ref.current)
    return () => ro.disconnect()
  }, [])

  const by = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.6, behavior: 'smooth' })
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
    const chips = Array.from(ref.current!.querySelectorAll('button'))
    const next = chips[chips.indexOf(document.activeElement as HTMLButtonElement) + (e.key === 'ArrowRight' ? 1 : -1)]
    if (next) { e.preventDefault(); next.focus(); next.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' }) }
  }

  const arrow = (side: 'left' | 'right') => (
    <button type="button" tabIndex={-1} aria-label={side === 'left' ? 'Scroll left' : 'Scroll right'} onClick={() => by(side === 'left' ? -1 : 1)}
      className={`absolute inset-y-0 z-10 flex w-12 items-center text-slate-500 hover:text-sky-500 from-white from-40% to-transparent dark:from-[#0f1115] ${side === 'left'
        ? 'left-0 justify-start bg-gradient-to-r pl-1'
        : 'right-0 justify-end bg-gradient-to-l pr-1'}`}>
      {side === 'left' ? <ChevronLeft size={20} aria-hidden /> : <ChevronRight size={20} aria-hidden />}
    </button>
  )

  return (
    <div className="relative h-11 min-w-0">
      {can.left && arrow('left')}
      <div ref={ref} onScroll={update} onKeyDown={onKeyDown} role="group" aria-label={label} className="no-scrollbar flex h-full flex-nowrap gap-2 overflow-x-auto overflow-y-hidden scroll-smooth">
        {children}
      </div>
      {can.right && arrow('right')}
    </div>
  )
}
