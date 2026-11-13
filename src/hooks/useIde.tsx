import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useCourse } from './useCourse'
import { usePersisted } from './usePersisted'

export type Dock = 'bottom' | 'right' | 'top' | 'left'

export const DEFAULTS = { phoneW: 400, termH: 240, termW: 380 }

type Ctx = {
  open: boolean
  qn: number | null          // question being practised (null = scratch pad)
  hidden: boolean            // the phone-sized UI is slid out of view
  dock: Dock                 // where the terminal sits
  termOpen: boolean
  phoneW: number
  fontSize: number           // editor text size (px)
  wrap: boolean | null       // editor line wrapping; null = automatic (on for small screens)
  setFontSize: (n: number | ((prev: number) => number)) => void
  setWrap: (w: boolean) => void
  termH: number              // terminal height when docked top/bottom
  termW: number              // terminal width when docked left/right
  openFor: (n: number | null) => void
  go: (delta: number) => void
  toggle: () => void
  /** top-bar / Alt+I behaviour: on small screens it switches between the app and the IDE instead of closing */
  toggleSmart: (narrow: boolean) => void
  setHidden: (h: boolean) => void
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
  const { data, meta } = useCourse()
  const [openSaved, setOpen] = usePersisted('ide:open', false)
  const open = openSaved && meta.ide   // courses without a runnable IDE (SQL) never show it, but the saved choice is kept for the others
  const [qn, setQn] = usePersisted<number | null>('ide:qn', null)
  const [hidden, setHidden] = usePersisted('ide:hidden', false)
  const [dock, setDockState] = useState<Dock>((get('ide:dock') as Dock) || 'bottom')
  const [termOpen, setTermOpen] = usePersisted('ide:termOpen', true)
  const [fontSize, setFontSize] = usePersisted('ide:fontSize', 13)
  const [wrap, setWrap] = usePersisted<boolean | null>('ide:wrap', null)
  const [phoneW, setPhone] = useState(() => num('ide:phoneW', DEFAULTS.phoneW))
  const [termH, setH] = useState(() => num('ide:termH', DEFAULTS.termH))
  const [termW, setW] = useState(() => num('ide:termW', DEFAULTS.termW))

  useEffect(() => { if (!open && hidden) setHidden(false) }, [open, hidden, setHidden])   // closing the IDE (button, Alt+I, Esc) must never leave the app hidden or inert

  const openFor = useCallback((n: number | null) => { setQn(n); setOpen(true) }, [setQn, setOpen])
  const go = useCallback((delta: number) => {
    setQn((cur) => Math.min(data.questions.length, Math.max(1, (cur ?? (delta > 0 ? 0 : 2)) + delta)))
  }, [setQn, data.questions.length])
  const setDock = useCallback((d: Dock) => { setDockState(d); put('ide:dock', d) }, [])
  const setPhoneW = useCallback((n: number) => { setPhone(n); put('ide:phoneW', String(Math.round(n))) }, [])
  const setTermSize = useCallback((axis: 'h' | 'w', n: number) => {
    if (axis === 'h') { setH(n); put('ide:termH', String(Math.round(n))) } else { setW(n); put('ide:termW', String(Math.round(n))) }
  }, [])

  const value = useMemo<Ctx>(() => ({
    open, qn, hidden, dock, termOpen, phoneW, termH, termW, fontSize, wrap, setFontSize, setWrap,
    openFor, go, setDock, setTermOpen, setPhoneW, setTermSize,
    toggle: () => { if (open) { setOpen(false); setHidden(false) } else setOpen(true) },
    toggleSmart: (narrow: boolean) => { if (narrow && open && !hidden) setHidden(true); else if (open) { setOpen(false); setHidden(false) } else setOpen(true) },
    setHidden,
    close: () => { setOpen(false); setHidden(false) },
    toggleHidden: () => setHidden((h) => !h),
    toggleTerm: () => setTermOpen((t) => !t),
  }), [open, qn, hidden, dock, termOpen, phoneW, termH, termW, fontSize, wrap, setFontSize, setWrap, setOpen, setQn, setHidden, setTermOpen, openFor, go, setDock, setPhoneW, setTermSize])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useIde = () => useContext(C)
