// Framework-free controller for the playground: one world, several terminal tabs, persisted in localStorage (zero server cost).
// React reads it through useSyncExternalStore (see ../runtime.ts). Every state change emits a SimEvent, which the lab tracker validates.
import type { PlaygroundSpec } from '../types'
import { injectChaos } from './chaos'
import { closeShell, exec, followTick, interrupt, newShell, promptOf, saveEdit, type ExecResult, type Hold, type OutLine, type Shell } from './shell'
import { createWorld, HOME, openSsh, syncWorld, type World } from './world'

export interface TermLine { t: 'cmd' | 'out' | 'err' | 'sys'; s: string; prompt?: string }
export interface EditReq { host: 'local' | 'remote'; path: string; sudo: boolean }
export interface Tab { shell: Shell; lines: TermLine[]; hold: Hold | null; secret: boolean; edit: EditReq | null; busy: boolean }
export interface SimEvent { command: string; result: ExecResult | null; tabId: number | null }

export interface SimOptions { key?: string; stage?: number; init?: (w: World) => void }
const MAX_LINES = 400
const MAX_TABS = 4

const toLine = (o: OutLine): TermLine => ({ t: o.t, s: o.s })

export class Simulator {
  world: World
  tabs: Tab[] = []
  active = 0
  version = 0
  /** Text the step bar wants placed in the terminal input (the terminal reads it when `draftSeq` changes). */
  draft = ''
  draftSeq = 0
  onEvent: ((e: SimEvent) => void) | null = null
  private nextTabId = 1
  private listeners = new Set<() => void>()
  private saveTimer: ReturnType<typeof setTimeout> | null = null

  private readonly key: string
  constructor(private spec: PlaygroundSpec, private opts: SimOptions = {}) {
    this.key = opts.key ?? 'devops:v1:sim'
    this.world = this.fresh()
    this.restore()
    if (!this.tabs.length) this.addTab(false)
  }

  private fresh(): World {
    const w = createWorld(this.spec.terminal.filesystem, this.spec.terminal.remoteFilesystem ?? this.spec.terminal.filesystem, this.opts.stage ?? 1)
    this.opts.init?.(w)
    syncWorld(w)
    return w
  }

  // ---- store plumbing ----
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getVersion = () => this.version
  private emit(e?: SimEvent) {
    this.version++
    this.scheduleSave()
    this.listeners.forEach((l) => l())
    if (e) this.onEvent?.(e)
  }
  private scheduleSave() {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.save(), 250)
  }
  save() {
    try {
      localStorage.setItem(this.key, JSON.stringify({ v: 1, world: this.world, nextTabId: this.nextTabId, active: this.active, tabs: this.tabs.map((t) => ({ shell: t.shell, lines: t.lines.slice(-MAX_LINES) })) }))
    } catch { /* storage full or unavailable: the simulator still works, it just will not survive a reload */ }
  }
  private restore() {
    try {
      const raw = localStorage.getItem(this.key)
      if (!raw) return
      const d = JSON.parse(raw)
      if (d.v !== 1 || !d.world || !Array.isArray(d.tabs)) return
      this.world = d.world
      this.nextTabId = d.nextTabId ?? 1
      this.tabs = d.tabs.map((t: { shell: Shell; lines: TermLine[] }) => ({ shell: { ...t.shell, repl: t.shell.repl?.kind === 'password' ? null : t.shell.repl }, lines: t.lines, hold: null, secret: false, edit: null, busy: false }))
      this.active = Math.min(d.active ?? 0, this.tabs.length - 1)
      syncWorld(this.world)
    } catch { this.world = this.fresh(); this.tabs = [] }
  }

  // ---- tabs ----
  tab(id: number) { return this.tabs.find((t) => t.shell.id === id) }
  get current() { return this.tabs[this.active] }
  prompt(t: Tab) { return t.secret && t.shell.repl?.kind === 'password' ? t.shell.repl.label : promptOf(this.world, t.shell) }

  addTab(emit = true): number | null {
    if (this.tabs.length >= MAX_TABS) return null
    const shell = newShell(this.nextTabId++)
    this.tabs.push({ shell, lines: [{ t: 'sys', s: 'Laptop terminal. Type commands and press Enter. Tab completes, ↑ recalls, Ctrl+C interrupts.' }], hold: null, secret: false, edit: null, busy: false })
    this.active = this.tabs.length - 1
    if (emit) this.emit()
    return shell.id
  }
  selectTab(i: number) { this.active = Math.max(0, Math.min(i, this.tabs.length - 1)); this.emit() }

  /** Closing a tab that holds an SSH session is closing the PuTTY window: everything started without nohup gets SIGHUP. */
  closeTab(id: number) {
    const t = this.tab(id)
    if (!t) return
    const hadSsh = !!t.shell.ssh
    closeShell(this.world, t.shell)
    this.tabs = this.tabs.filter((x) => x !== t)
    if (!this.tabs.length) this.addTab(false)
    this.active = Math.min(this.active, this.tabs.length - 1)
    this.emit({ command: hadSsh ? '[closed PuTTY window]' : '[closed terminal tab]', result: null, tabId: id })
  }

  // ---- running commands ----
  async run(id: number, line: string): Promise<ExecResult | null> {
    const t = this.tab(id)
    if (!t || t.busy) return null
    t.busy = true
    const secret = t.secret
    const prompt = this.prompt(t)
    t.lines.push({ t: 'cmd', s: secret ? '' : line, prompt })
    t.secret = false
    this.emit()
    const r = await exec(this.world, t.shell, line)
    t.busy = false
    if (r.clear) t.lines = []
    r.out.forEach((o) => t.lines.push(toLine(o)))
    if (t.lines.length > MAX_LINES * 2) t.lines = t.lines.slice(-MAX_LINES)
    t.hold = r.hold ?? null
    t.secret = !!r.secret
    t.edit = r.edit ?? null
    if (r.closeTab) {
      if (this.tabs.length > 1) { this.closeTab(id); return r }
      t.lines.push({ t: 'sys', s: '[This is the only terminal. It stays open: use + to add another.]' })
    }
    this.applyHangup()
    this.emit({ command: secret ? '(password)' : line, result: r, tabId: id })
    return r
  }

  /** After `reboot`: every SSH session on every tab is gone. */
  private applyHangup() {
    if (!this.world.x.reboot.hangup) return
    this.world.x.reboot.hangup = false
    for (const t of this.tabs) {
      if (!t.shell.ssh) continue
      t.shell.ssh = null; t.shell.repl = null; t.hold = null; t.secret = false; t.edit = null
      t.lines.push({ t: 'err', s: 'Connection to 203.0.113.10 closed by remote host.' }, { t: 'err', s: 'Connection to 203.0.113.10 closed.' })
    }
    this.current.lines.push({ t: 'sys', s: '[simulator] The server is rebooting. Real servers take 30 to 60 seconds to come back. Services that are enabled start by themselves.' })
  }

  /** The hosting company's out-of-band console: a login that does not use the network (and so ignores the firewall). */
  openRescue(): number | null {
    if (this.tabs.length >= MAX_TABS) return null
    const shell = newShell(this.nextTabId++)
    const slot = openSsh(this.world)
    shell.rescue = true
    shell.ssh = { id: slot.id, user: 'ubuntu', cwd: HOME.remote }
    this.tabs.push({ shell, lines: [{ t: 'sys', s: 'Provider rescue console (like the AWS EC2 Serial Console or a VPS web console). It does not use the network, so a firewall cannot block it. Type exit to close it.' }], hold: null, secret: false, edit: null, busy: false })
    this.active = this.tabs.length - 1
    this.emit({ command: '[opened rescue console]', result: null, tabId: shell.id })
    return shell.id
  }

  interrupt(id: number) {
    const t = this.tab(id)
    if (!t) return
    if (t.hold) { interrupt(this.world, t.hold).forEach((o) => t.lines.push(toLine(o))); t.hold = null }
    else if (t.shell.repl && t.shell.repl.kind !== 'psql') { t.shell.repl = null; t.secret = false; t.lines.push({ t: 'out', s: '^C' }) }
    else t.lines.push({ t: 'out', s: '^C' })
    syncWorld(this.world)
    this.emit({ command: '^C', result: null, tabId: id })
  }

  /** Called on a timer by a terminal that is following a log (`tail -f`). */
  follow(id: number) {
    const t = this.tab(id)
    if (!t?.hold || t.hold.kind !== 'follow') return
    followTick(this.world, t.hold).forEach((o) => t.lines.push(toLine(o)))
    this.version++
    this.listeners.forEach((l) => l())
  }

  setDraft(text: string) { this.draft = text; this.draftSeq++; this.version++; this.listeners.forEach((l) => l()) }

  closeEditor(id: number) { const t = this.tab(id); if (t) { t.edit = null; this.emit() } }
  saveEditor(id: number, content: string): { ok: boolean; msg: string } {
    const t = this.tab(id)
    if (!t?.edit) return { ok: false, msg: 'nothing to save' }
    const r = saveEdit(this.world, t.edit.host, t.edit.path, content, t.edit.sudo)
    syncWorld(this.world)
    this.emit(r.ok ? { command: `nano ${t.edit.path}`, result: null, tabId: id } : undefined)
    return r
  }

  // ---- world-level actions ----
  /** A GUI action (FileZilla) or a direct change of the world. */
  mutate(label: string, fn: (w: World) => void) {
    fn(this.world)
    syncWorld(this.world)
    this.emit({ command: label, result: null, tabId: null })
  }

  inject(script: string): string {
    const { message, perShell } = injectChaos(this.world, this.tabs.map((t) => t.shell), script)
    for (const t of this.tabs) {
      t.hold = null; t.secret = false; t.edit = null
      const extra = perShell.get(t.shell.id)
      if (extra) extra.forEach((o) => t.lines.push(toLine(o)))
    }
    this.current.lines.push({ t: 'sys', s: `[simulator] ${message}` })
    this.emit({ command: `[chaos] ${script}`, result: null, tabId: null })
    return message
  }

  reset() {
    this.world = this.fresh()
    this.tabs = []
    this.nextTabId = 1
    this.addTab(false)
    this.emit({ command: '[reset]', result: null, tabId: null })
  }
}
