import { useEffect, useRef, useState } from 'react'
import type { EditReq } from '../engine/session'

/** A deliberately small nano: edit text, ^O writes the file (and fails like nano without sudo), ^X leaves. */
export default function NanoEditor({ req, initial, onSave, onClose }: { req: EditReq; initial: string; onSave: (text: string) => { ok: boolean; msg: string }; onClose: () => void }) {
  const [text, setText] = useState(initial)
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [saved, setSaved] = useState(initial)
  const ta = useRef<HTMLTextAreaElement>(null)
  useEffect(() => { ta.current?.focus() }, [])
  const save = () => { const r = onSave(text); setStatus(r); if (r.ok) setSaved(text) }
  const exit = () => { if (text !== saved && !window.confirm('Leave without saving your changes?')) return; onClose() }
  const onKey = (e: React.KeyboardEvent) => {
    if (e.ctrlKey && e.key.toLowerCase() === 'o') { e.preventDefault(); save() }
    else if (e.ctrlKey && e.key.toLowerCase() === 'x') { e.preventDefault(); exit() }
  }
  const btn = 'min-h-[40px] rounded px-3 text-sm font-medium bg-slate-200 text-slate-900 hover:bg-white'
  return (
    <div role="dialog" aria-label={`Editing ${req.path}`} className="absolute inset-0 z-10 flex flex-col bg-[#0b0d11] text-slate-100">
      <div className="flex items-center justify-between bg-slate-200 px-3 py-1 font-mono text-xs text-slate-900"><span>GNU nano (simplified)</span><span className="truncate pl-3">{req.sudo ? '[root] ' : ''}{req.path}{text !== saved ? ' (modified)' : ''}</span></div>
      <textarea ref={ta} value={text} onChange={(e) => setText(e.target.value)} onKeyDown={onKey} spellCheck={false} autoCapitalize="off" autoCorrect="off" aria-label="File contents"
        className="min-h-0 flex-1 resize-none bg-transparent p-3 font-mono text-[13px] leading-snug outline-none" />
      <div className="px-3 py-1 font-mono text-xs" role="status" aria-live="polite"><span className={status?.ok === false ? 'text-rose-300' : 'text-emerald-300'}>{status?.msg ?? ' '}</span></div>
      <div className="flex gap-2 border-t border-white/10 p-2">
        <button type="button" onClick={save} className={btn}>^O Write Out</button>
        <button type="button" onClick={exit} className={btn}>^X Exit</button>
        {!req.sudo && <span className="self-center text-xs text-slate-400">Opened without sudo: saving root-owned files will be refused.</span>}
      </div>
    </div>
  )
}
