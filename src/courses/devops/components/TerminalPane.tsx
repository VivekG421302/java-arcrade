import { useEffect, useRef, useState } from 'react'
import { Square } from 'lucide-react'
import { complete } from '../engine/shell'
import type { TermLine } from '../engine/session'
import { useSim } from '../runtime'
import NanoEditor from './NanoEditor'

// eslint-disable-next-line no-control-regex
const SGR = /(\x1b\[[0-9;]*m)/
function Ansi({ text }: { text: string }) {
  let cls = ''
  return <>{text.split(SGR).map((p, i) => {
    if (SGR.test(p)) { cls = /32/.test(p) ? 'text-emerald-400 font-bold' : /31/.test(p) ? 'text-rose-400 font-bold' : /\[0m|\[m/.test(p) ? '' : cls; return null }
    return p ? <span key={i} className={cls}>{p}</span> : null
  })}</>
}

const lineClass: Record<TermLine['t'], string> = { cmd: 'text-slate-100', out: 'text-slate-300', err: 'text-rose-300', sys: 'text-sky-300 italic' }

/** One terminal tab: scrollback + prompt. Mounted for every tab (hidden when inactive) so typed text and scroll position survive tab switches. */
export default function TerminalPane({ tabId, visible }: { tabId: number; visible: boolean }) {
  const sim = useSim()
  const tab = sim.tab(tabId)
  const [value, setValue] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const hist = useRef<string[]>([])
  const hidx = useRef(-1)
  const seenDraft = useRef(sim.draftSeq)
  const hold = tab?.hold ?? null

  useEffect(() => { const b = box.current; if (b) b.scrollTop = b.scrollHeight }, [tab?.lines.length, hold])
  useEffect(() => {
    if (!visible || sim.draftSeq === seenDraft.current) return
    seenDraft.current = sim.draftSeq
    setValue(sim.draft); input.current?.focus()
  })
  useEffect(() => { if (visible && !hold) input.current?.focus() }, [visible, hold, tab?.edit])
  useEffect(() => {
    if (hold?.kind !== 'follow') return
    const t = setInterval(() => sim.follow(tabId), 1800)
    return () => clearInterval(t)
  }, [hold?.kind, sim, tabId])
  if (!tab) return null

  const submit = async () => {
    const line = value
    setValue(''); hidx.current = -1
    if (!tab.secret && line.trim()) hist.current.push(line)
    await sim.run(tabId, line)
  }
  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const k = e.key
    if (k === 'Enter') { e.preventDefault(); void submit() }
    else if (k === 'ArrowUp' && !tab.secret) { e.preventDefault(); if (hist.current.length) { hidx.current = hidx.current < 0 ? hist.current.length - 1 : Math.max(0, hidx.current - 1); setValue(hist.current[hidx.current]) } }
    else if (k === 'ArrowDown' && !tab.secret) { e.preventDefault(); if (hidx.current >= 0) { hidx.current++; setValue(hidx.current >= hist.current.length ? '' : hist.current[hidx.current]); if (hidx.current >= hist.current.length) hidx.current = -1 } }
    else if (k === 'Tab' && !tab.secret && !tab.shell.repl) {
      e.preventDefault()
      const c = complete(sim.world, tab.shell, value)
      if (!c.length) return
      const stem = value.replace(/\S*$/, '')
      let common = c[0]
      for (const x of c) while (!x.startsWith(common)) common = common.slice(0, -1)
      setValue(stem + (c.length === 1 && !common.endsWith('/') ? common + ' ' : common))
    } else if (e.ctrlKey && k.toLowerCase() === 'c') {
      if (window.getSelection()?.toString()) return          // let the browser copy selected text
      e.preventDefault(); setValue(''); sim.interrupt(tabId)
    } else if (e.ctrlKey && k.toLowerCase() === 'l') { e.preventDefault(); void sim.run(tabId, 'clear') }
    else if (e.ctrlKey && k.toLowerCase() === 'd' && !value) { e.preventDefault(); void sim.run(tabId, tab.shell.repl ? '\\q' : 'exit') }
  }
  const holdKey = (e: React.KeyboardEvent) => { if (e.ctrlKey && e.key.toLowerCase() === 'c') { e.preventDefault(); sim.interrupt(tabId) } }
  const prompt = sim.prompt(tab)

  return (
    <div className={`relative flex min-h-0 flex-1 flex-col bg-[#0b0d11] ${visible ? '' : 'hidden'}`} onKeyDown={hold ? holdKey : undefined} tabIndex={hold ? 0 : -1}
      onClick={() => { if (!window.getSelection()?.toString()) input.current?.focus() }}>
      <div ref={box} role="log" aria-live="off" aria-label="Terminal output" className="min-h-0 flex-1 overflow-auto px-3 py-2 font-mono text-[12.5px] leading-[1.45]">
        {tab.lines.map((l, i) => (
          <div key={i} className={`whitespace-pre-wrap break-words ${lineClass[l.t]}`}>
            {l.t === 'cmd' ? <><span className="text-emerald-400">{l.prompt}</span>{l.s}</> : <Ansi text={l.s || ' '} />}
          </div>
        ))}
        {hold ? (
          <div className="mt-1 flex items-center gap-3 text-amber-300">
            <span className="animate-pulse" aria-hidden>▍</span><span>{hold.label} is running. Press Ctrl+C to stop.</span>
            <button type="button" onClick={(e) => { e.stopPropagation(); sim.interrupt(tabId) }} className="inline-flex min-h-[36px] items-center gap-1.5 rounded bg-rose-600 px-3 text-sm font-medium text-white hover:bg-rose-500"><Square size={13} aria-hidden />Stop (Ctrl+C)</button>
          </div>
        ) : (
          <label className="flex items-baseline">
            <span className="shrink-0 whitespace-pre text-emerald-400">{prompt}</span>
            <input ref={input} value={value} onChange={(e) => setValue(e.target.value)} onKeyDown={onKey} type={tab.secret ? 'password' : 'text'} disabled={tab.busy}
              aria-label={`Command line, prompt ${prompt}`} autoCapitalize="off" autoCorrect="off" autoComplete="off" spellCheck={false} enterKeyHint="send"
              className="min-w-0 flex-1 bg-transparent font-mono text-[12.5px] text-slate-100 caret-emerald-400 outline-none" />
          </label>
        )}
      </div>
      {tab.edit && visible && (
        <NanoEditor req={tab.edit} initial={sim.world.fs[tab.edit.host][tab.edit.path]?.content ?? ''} onSave={(t) => sim.saveEditor(tabId, t)} onClose={() => sim.closeEditor(tabId)} />
      )}
    </div>
  )
}
