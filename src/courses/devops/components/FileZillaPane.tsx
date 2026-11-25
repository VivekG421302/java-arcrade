import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, FileText, Folder, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { base, humanSize, join, parent, modeString } from '../engine/fs'
import { keyChoices, listing, sftpConnect, sftpDelete, sftpDisconnect, sftpRename, sftpTransfer, type Side, type SftpLog } from '../engine/sftpGui'
import type { World } from '../engine/world'
import { useSim } from '../runtime'

const logClass: Record<SftpLog['kind'], string> = { Status: 'text-slate-600 dark:text-slate-300', Command: 'text-sky-700 dark:text-sky-300', Response: 'text-slate-500 dark:text-slate-400', Error: 'text-rose-700 dark:text-rose-300' }
const field = 'min-h-[40px] w-full rounded border border-slate-300 bg-white px-2 text-sm text-slate-900 dark:border-white/15 dark:bg-[#0f1115] dark:text-slate-100'
const btn = 'inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md px-3 text-sm font-medium'

interface Sel { side: Side; path: string; type: 'file' | 'dir' }

interface PaneProps {
  side: Side
  w: World
  connected: boolean
  dir: string
  setDir: (d: string) => void
  sel: Sel | null
  setSel: (s: Sel | null) => void
  transfer: (from: Sel, toSide: Side) => void
  say: (l: SftpLog[]) => void
}

function Pane({ side, w, connected, dir, setDir, sel, setSel, transfer, say }: PaneProps) {
  const rows = side === 'remote' && !connected ? null : listing(w, side, dir)
  const [draft, setDraft] = useState(dir)
  useEffect(() => setDraft(dir), [dir])
  const go = (p: string) => { if (w.fs[side][p]?.type === 'dir') { setDir(p); setDraft(p); setSel(null) } else say([{ kind: 'Error', s: `Failed to retrieve directory listing for ${p}` }]) }
  return (
    <section aria-label={side === 'local' ? 'Local site, your laptop' : 'Remote site, the server'} className="flex min-w-0 flex-col"
      onDragOver={(e) => { if (side === 'local' || connected) e.preventDefault() }}
      onDrop={(e) => { e.preventDefault(); try { const d: Sel = JSON.parse(e.dataTransfer.getData('application/x-ftp')); transfer(d, side) } catch { /* not ours */ } }}>
      <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
        <span className="shrink-0">{side === 'local' ? 'Local site:' : 'Remote site:'}</span>
        <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') go(draft) }} onBlur={() => setDraft(dir)} disabled={side === 'remote' && !connected} aria-label={`${side} path`}
          className={`${field} font-mono !min-h-[32px] text-xs`} />
      </label>
      <div className="mt-1 h-44 overflow-auto rounded border border-slate-300 bg-white dark:border-white/15 dark:bg-[#0f1115]">
        {rows === null ? <p className="p-3 text-sm text-slate-500">Not connected to any server</p> : (
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-100 dark:bg-[#1c1f26]"><tr><th className="px-2 py-1 font-medium">Filename</th><th className="px-2 py-1 text-right font-medium">Size</th><th className="px-2 py-1 font-medium">{side === 'remote' ? 'Permissions' : 'Owner'}</th></tr></thead>
            <tbody>
              {dir !== '/' && <tr onDoubleClick={() => go(parent(dir))} className="cursor-pointer hover:bg-slate-100 dark:hover:bg-white/5"><td className="px-2 py-1.5"><button type="button" onClick={() => go(parent(dir))} className="flex min-h-[28px] items-center gap-1.5"><Folder size={14} aria-hidden />..</button></td><td /><td /></tr>}
              {rows.map((r) => {
                const path = join(dir, r.name), picked = sel?.side === side && sel.path === path
                return (
                  <tr key={r.name} draggable={r.type === 'file'} onDragStart={(e) => { e.dataTransfer.setData('application/x-ftp', JSON.stringify({ side, path, type: r.type })) }}
                    onClick={() => setSel({ side, path, type: r.type })} onDoubleClick={() => (r.type === 'dir' ? go(path) : transfer({ side, path, type: r.type }, side === 'local' ? 'remote' : 'local'))}
                    aria-selected={picked} className={`cursor-pointer ${picked ? 'bg-sky-100 dark:bg-sky-400/15' : 'hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                    <td className="px-2 py-1.5"><button type="button" onClick={() => setSel({ side, path, type: r.type })} className="flex min-h-[28px] items-center gap-1.5 text-left">{r.type === 'dir' ? <Folder size={14} aria-hidden className="text-amber-500" /> : <FileText size={14} aria-hidden className="text-slate-500" />}<span className="break-all">{r.name}</span></button></td>
                    <td className="px-2 py-1.5 text-right tabular-nums">{r.type === 'file' ? humanSize(r.size) : ''}</td>
                    <td className="px-2 py-1.5 font-mono">{side === 'remote' ? modeString({ type: r.type, mode: r.mode, owner: r.owner, size: r.size, mtime: r.mtime }) : r.owner}</td>
                  </tr>
                )
              })}
              {!rows.length && <tr><td colSpan={3} className="px-2 py-3 text-slate-500">Empty directory</td></tr>}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

/** Dual-pane SFTP client. Works on the very same filesystems as the terminal, so uploads show up in `ls -lh /opt/myapp`. */
export default function FileZillaPane() {
  const sim = useSim()
  const w = sim.world
  const connected = w.x.sftp.connected
  const [form, setForm] = useState({ host: '', user: '', pass: '', port: '', key: '' })
  const [log, setLog] = useState<SftpLog[]>([{ kind: 'Status', s: 'FileZilla ready. Fill in Quickconnect to open the delivery route.' }])
  const [localDir, setLocalDir] = useState(() => (w.fs.local['/home/learner/shop-app/target'] ? '/home/learner/shop-app/target' : '/home/learner/shop-app'))
  const [remoteDir, setRemoteDir] = useState('/home/ubuntu')
  const [sel, setSel] = useState<Sel | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)
  const say = (l: SftpLog[]) => setLog((p) => [...p, ...l].slice(-60))
  const keys = keyChoices(w)

  const connect = () => {
    let r: ReturnType<typeof sftpConnect> | undefined
    sim.mutate('[FileZilla] Quickconnect', (world) => { r = sftpConnect(world, { host: form.host, user: form.user.trim(), port: Number(form.port || 0), key: form.key }) })
    say(r!.log)
    if (r!.ok) setRemoteDir('/home/ubuntu')
  }
  const disconnect = () => { let l: SftpLog[] = []; sim.mutate('[FileZilla] Disconnect', (world) => { l = sftpDisconnect(world) }); say(l); setSel(null) }

  const transfer = (from: Sel, toSide: Side) => {
    if (from.side === toSide) return
    if (!connected) { say([{ kind: 'Error', s: 'Not connected to any server.' }]); return }
    let l: SftpLog[] = []
    sim.mutate(`[FileZilla] ${toSide === 'remote' ? 'upload' : 'download'} ${base(from.path)}`, (world) => { l = sftpTransfer(world, toSide === 'remote' ? 'up' : 'down', from.path, toSide === 'remote' ? remoteDir : localDir) })
    say(l)
  }
  const act = (label: string, fn: (world: typeof w) => SftpLog[]) => { let l: SftpLog[] = []; sim.mutate(`[FileZilla] ${label}`, (world) => { l = fn(world) }); say(l) }

  const selFile = sel && sel.type === 'file' ? sel : null
  return (
    <div className="min-h-0 flex-1 space-y-3 overflow-auto bg-slate-50 p-3 text-slate-900 dark:bg-[#181b22] dark:text-slate-100">
      <form onSubmit={(e) => { e.preventDefault(); connect() }} className="rounded-lg bg-white p-3 ring-1 ring-slate-200 dark:bg-white/[0.04] dark:ring-white/10" aria-label="Quickconnect">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-[1.4fr_1fr_1fr_0.6fr]">
          <label className="col-span-2 text-xs md:col-span-1">Host<input value={form.host} onChange={(e) => setForm({ ...form, host: e.target.value })} placeholder="sftp://203.0.113.10" className={field} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
          <label className="text-xs">Username<input value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} placeholder="ubuntu" className={field} autoCapitalize="off" autoCorrect="off" spellCheck={false} /></label>
          <label className="text-xs">Password<input type="password" value={form.pass} onChange={(e) => setForm({ ...form, pass: e.target.value })} placeholder="(none: key login)" className={field} /></label>
          <label className="text-xs">Port<input inputMode="numeric" value={form.port} onChange={(e) => setForm({ ...form, port: e.target.value.replace(/\D/g, '') })} placeholder="22" className={field} /></label>
        </div>
        <div className="mt-2 flex flex-wrap items-end gap-2">
          <label className="min-w-[10rem] flex-1 text-xs">Key file (Edit, Settings, SFTP, Add key file)
            <select value={form.key} onChange={(e) => setForm({ ...form, key: e.target.value })} className={field}><option value="">(no key file)</option>{keys.map((k) => <option key={k} value={k}>{base(k)}</option>)}</select>
          </label>
          {connected
            ? <button type="button" onClick={disconnect} className={`${btn} bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-100`}>Disconnect</button>
            : <button type="submit" className={`${btn} bg-sky-600 text-white hover:bg-sky-500`}>Quickconnect</button>}
        </div>
      </form>

      <div role="log" aria-label="FileZilla messages" className="h-24 overflow-auto rounded-lg bg-white p-2 font-mono text-[11.5px] leading-snug ring-1 ring-slate-200 dark:bg-[#0f1115] dark:ring-white/10">
        {log.map((l, i) => <div key={i} className={logClass[l.kind]}><span className="font-semibold">{l.kind}:</span> {l.s}</div>)}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Pane side="local" w={w} connected={connected} dir={localDir} setDir={setLocalDir} sel={sel} setSel={setSel} transfer={transfer} say={say} />
        <Pane side="remote" w={w} connected={connected} dir={remoteDir} setDir={setRemoteDir} sel={sel} setSel={setSel} transfer={transfer} say={say} />
      </div>

      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="File actions">
        <button type="button" disabled={!selFile || selFile.side !== 'local' || !connected} onClick={() => selFile && transfer(selFile, 'remote')} className={`${btn} bg-emerald-600 text-white hover:bg-emerald-500 disabled:opacity-40`}>Upload <ArrowRight size={15} aria-hidden /></button>
        <button type="button" disabled={!selFile || selFile.side !== 'remote'} onClick={() => selFile && transfer(selFile, 'local')} className={`${btn} bg-slate-600 text-white hover:bg-slate-500 disabled:opacity-40`}><ArrowLeft size={15} aria-hidden /> Download</button>
        <span className="mx-1 hidden h-6 w-px bg-slate-300 dark:bg-white/15 sm:block" />
        {renaming !== null ? (
          <form className="flex items-center gap-2" onSubmit={(e) => { e.preventDefault(); if (sel) act(`rename ${base(sel.path)}`, (world) => sftpRename(world, sel.side, sel.path, renaming)); setRenaming(null); setSel(null) }}>
            <input autoFocus value={renaming} onChange={(e) => setRenaming(e.target.value)} aria-label="New file name" className={`${field} w-44 font-mono`} />
            <button type="submit" className={`${btn} bg-sky-600 text-white`}>OK</button><button type="button" onClick={() => setRenaming(null)} className={`${btn} bg-slate-200 text-slate-900 dark:bg-white/10 dark:text-slate-100`}>Cancel</button>
          </form>
        ) : (
          <>
            <button type="button" disabled={!sel} onClick={() => sel && setRenaming(base(sel.path))} className={`${btn} bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-40 dark:bg-white/10 dark:text-slate-100`}><Pencil size={14} aria-hidden />Rename</button>
            <button type="button" disabled={!sel} onClick={() => { if (sel && window.confirm(`Delete ${sel.path}?`)) { act(`delete ${base(sel.path)}`, (world) => sftpDelete(world, sel.side, sel.path)); setSel(null) } }} className={`${btn} bg-slate-200 text-slate-900 hover:bg-slate-300 disabled:opacity-40 dark:bg-white/10 dark:text-slate-100`}><Trash2 size={14} aria-hidden />Delete</button>
            <button type="button" onClick={() => { setSel(null); sim.mutate('[FileZilla] refresh', () => undefined) }} className={`${btn} bg-slate-200 text-slate-900 hover:bg-slate-300 dark:bg-white/10 dark:text-slate-100`}><RefreshCw size={14} aria-hidden />Refresh</button>
          </>
        )}
      </div>
      <p className="text-xs text-slate-500 dark:text-slate-400">Drag a file from one pane to the other, or select it and press Upload or Download. Double-clicking a file transfers it, like the real thing.</p>
    </div>
  )
}
