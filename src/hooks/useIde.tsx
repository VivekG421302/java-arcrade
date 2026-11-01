import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { content } from '../lib/content'

export type Dock = 'bottom' | 'right' | 'top' | 'left'

export const DEFAULTS = { phoneW: 400, termH: 240, termW: 380 }

type Ctx = {
  open: boolean
  qn: number | null          // question being practised (null = scratch pad)
  hidden: boolean            // the phone-sized UI is slid out of view
  dock: Dock                 // where the terminal sits
  termOpen: boolean
  phoneW: number
  termH: number              // terminal height when docked top/bottom
  termW: number              // terminal width when docked left/right
  openFor: (n: number | null) => void
  go: (delta: number) => void
  toggle: () => void
  close: () => void
  toggleHidden: () => void
  setDock: (d: Dock) => void
  setTermOpen: (o: boolean) => void
  toggleTerm: () => void
  setPhoneW: (n: number) => void
  setTermSize: (axis: 'h' | 'w', n: number) => void
}
const C = createContext<Ctx>(null!)

const get = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }
const put = (k: string, v: string) => { try { localStorage.setItem(k, v) } catch { /* ignore */ } }
const num = (k: string, d: number) => { const v = Number(get(k)); return v > 0 ? v : d }

export function IdeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [qn, setQn] = useState<number | null>(null)
  const [hidden, setHidden] = useState(false)
  const [dock, setDockState] = useState<Dock>((get('ide:dock') as Dock) || 'bottom')
  const [termOpen, setTermOpen] = useState(true)
  const [phoneW, setPhone] = useState(() => num('ide:phoneW', DEFAULTS.phoneW))
  const [termH, setH] = useState(() => num('ide:termH', DEFAULTS.termH))
  const [termW, setW] = useState(() => num('ide:termW', DEFAULTS.termW))

  const openFor = useCallback((n: number | null) => { setQn(n); setOpen(true) }, [])
  const go = useCallback((delta: number) => {
    setQn((cur) => Math.min(content.questions.length, Math.max(1, (cur ?? (delta > 0 ? 0 : 2)) + delta)))
  }, [])
  const setDock = useCallback((d: Dock) => { setDockState(d); put('ide:dock', d) }, [])
  const setPhoneW = useCallback((n: number) => { setPhone(n); put('ide:phoneW', String(Math.round(n))) }, [])
  const setTermSize = useCallback((axis: 'h' | 'w', n: number) => {
    if (axis === 'h') { setH(n); put('ide:termH', String(Math.round(n))) } else { setW(n); put('ide:termW', String(Math.round(n))) }
  }, [])

  const value = useMemo<Ctx>(() => ({
    open, qn, hidden, dock, termOpen, phoneW, termH, termW,
    openFor, go, setDock, setTermOpen, setPhoneW, setTermSize,
    toggle: () => setOpen((o) => !o),
    close: () => { setOpen(false); setHidden(false) },
    toggleHidden: () => setHidden((h) => !h),
    toggleTerm: () => setTermOpen((t) => !t),
  }), [open, qn, hidden, dock, termOpen, phoneW, termH, termW, openFor, go, setDock, setPhoneW, setTermSize])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useIde = () => useContext(C)
