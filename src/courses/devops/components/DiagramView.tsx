import { useState } from 'react'
import type { DiagramSpec } from '../types'
import MermaidView from './MermaidView'

const Ascii = ({ text, label }: { text: string; label: string }) => (
  <pre tabIndex={0} aria-label={label} className="overflow-x-auto rounded-lg bg-slate-900 p-4 font-mono text-[12px] leading-[1.35] text-slate-100 ring-1 ring-white/10">{text}</pre>
)

const seg = (on: boolean) => `min-h-[36px] rounded-md px-3 text-sm font-medium ${on ? 'bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'}`

/** One diagram from the spec: Mermaid with a raw-ASCII toggle, plain ASCII, or a side-by-side Before/After. */
export default function DiagramView({ spec }: { spec: DiagramSpec }) {
  const [mode, setMode] = useState<'visual' | 'ascii'>('visual')
  const [failed, setFailed] = useState(false)
  const hasMermaid = !!spec.mermaidCode && !failed
  return (
    <figure className="my-5">
      <figcaption className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-semibold">{spec.title}</span>
        {spec.highlightedPorts?.map((p) => <span key={p} className="rounded-full bg-sky-100 px-2 py-0.5 font-mono text-xs text-sky-800 dark:bg-sky-400/15 dark:text-sky-300">:{p}</span>)}
        {spec.mermaidCode && spec.asciiArt && (
          <span role="group" aria-label="Diagram style" className="ml-auto inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/5">
            <button type="button" aria-pressed={mode === 'visual' && hasMermaid} onClick={() => setMode('visual')} className={seg(mode === 'visual' && hasMermaid)}>Diagram</button>
            <button type="button" aria-pressed={mode === 'ascii' || !hasMermaid} onClick={() => setMode('ascii')} className={seg(mode === 'ascii' || !hasMermaid)}>Plain text</button>
          </span>
        )}
      </figcaption>
      {spec.kind === 'before-after-diff' ? (
        <div className="grid gap-3 md:grid-cols-2">
          <div><p className="mb-1 text-sm font-medium text-rose-700 dark:text-rose-300">Before</p><Ascii text={spec.beforeAscii ?? ''} label="Before" /></div>
          <div><p className="mb-1 text-sm font-medium text-emerald-700 dark:text-emerald-300">After</p><Ascii text={spec.afterAscii ?? ''} label="After" /></div>
        </div>
      ) : hasMermaid && mode === 'visual' ? (
        <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200 dark:bg-white/[0.03] dark:ring-white/10"><MermaidView code={spec.mermaidCode!} onError={() => setFailed(true)} /></div>
      ) : (
        <Ascii text={spec.asciiArt ?? spec.mermaidCode ?? ''} label={spec.title} />
      )}
      {spec.caption && <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{spec.caption}</p>}
    </figure>
  )
}
