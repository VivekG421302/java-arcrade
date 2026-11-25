import { useEffect, useId, useState } from 'react'

const isDark = () => document.documentElement.classList.contains('dark')

/** Renders Mermaid source to SVG in the browser. The library is a separate lazy chunk: it only downloads when a diagram is shown. */
export default function MermaidView({ code, onError }: { code: string; onError?: () => void }) {
  const id = 'mmd' + useId().replace(/[^a-zA-Z0-9]/g, '')
  const [svg, setSvg] = useState('')
  const [dark, setDark] = useState(isDark)
  useEffect(() => {
    const mo = new MutationObserver(() => setDark(isDark()))
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    return () => mo.disconnect()
  }, [])
  useEffect(() => {
    let live = true
    import('mermaid').then(async ({ default: mermaid }) => {
      mermaid.initialize({ startOnLoad: false, securityLevel: 'strict', theme: dark ? 'dark' : 'neutral', fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif' })
      const out = await mermaid.render(`${id}${dark ? 'd' : 'l'}`, code)
      if (live) setSvg(out.svg)
    }).catch(() => { if (live) onError?.() })
    return () => { live = false }
  }, [code, dark, id, onError])
  if (!svg) return <p className="py-8 text-center text-sm text-slate-500" role="status">Drawing the diagram…</p>
  return <div className="overflow-x-auto py-2 [&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full" dangerouslySetInnerHTML={{ __html: svg }} />
}
