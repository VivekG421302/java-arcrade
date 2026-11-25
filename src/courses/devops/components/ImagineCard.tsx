import { useEffect, useRef } from 'react'
import { Lightbulb } from 'lucide-react'
import type { ImagineAnalogyBlock } from '../types'
import DataTable from './DataTable'

/**
 * The "Imagine..." card is always the first thing on a stage (spec 4.4.1). The technical sections stay locked until it has been read:
 * either by pressing the button or by lingering with the end of the story in view.
 */
export default function ImagineCard({ card, read, onRead }: { card: ImagineAnalogyBlock; read: boolean; onRead: () => void }) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (read || !end.current) return
    let t: ReturnType<typeof setTimeout> | undefined
    const io = new IntersectionObserver(([e]) => { clearTimeout(t); if (e.isIntersecting) t = setTimeout(onRead, 6000) }, { threshold: 1 })
    io.observe(end.current)
    return () => { io.disconnect(); clearTimeout(t) }
  }, [read, onRead])
  return (
    <section aria-labelledby="imagine-h" className="rounded-xl border-l-4 border-amber-400 bg-amber-50 p-5 dark:border-amber-300/70 dark:bg-amber-300/[0.06] md:p-6">
      <h2 id="imagine-h" className="flex items-center gap-2 text-xl font-bold"><Lightbulb size={20} aria-hidden className="text-amber-600 dark:text-amber-300" />Imagine… {card.headline}</h2>
      <div className="mt-3 max-w-[68ch] space-y-3 font-serif text-[17px] leading-relaxed">
        {card.analogy.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
      </div>
      <DataTable table={card.mappingTable} compact />
      <details className="text-sm text-slate-600 dark:text-slate-400">
        <summary className="min-h-[36px] cursor-pointer py-1.5">Illustration idea</summary>
        <p className="pb-2">{card.illustrationPrompt}</p>
      </details>
      <div ref={end} className="mt-4">
        {read
          ? <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">You have pictured the shop. The real steps are open below.</p>
          : <button type="button" onClick={onRead} className="min-h-[44px] rounded-lg bg-sky-600 px-4 font-medium text-white hover:bg-sky-500">I can picture it: show me the real steps</button>}
      </div>
    </section>
  )
}
