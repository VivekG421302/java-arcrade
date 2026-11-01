import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type Dock = 'bottom' | 'right' | 'top' | 'left'

type Ctx = {
  open: boolean
  qn: number | null          // question being practised (null = scratch pad)
  hidden: boolean            // the phone-sized UI is slid out of view
  dock: Dock                 // where the terminal sits
  termOpen: boolean
  openFor: (n: number | null) => void
  toggle: () => void
  close: () => void
  toggleHidden: () => void
  setDock: (d: Dock) => void
  toggleTerm: () => void
}
const C = createContext<Ctx>(null!)

const saved = (k: string) => { try { return localStorage.getItem(k) } catch { return null } }

export function IdeProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [qn, setQn] = useState<number | null>(null)
  const [hidden, setHidden] = useState(false)
  const [dock, setDockState] = useState<Dock>((saved('ide:dock') as Dock) || 'bottom')
  const [termOpen, setTermOpen] = useState(true)

  const openFor = useCallback((n: number | null) => { setQn(n); setOpen(true) }, [])
  const setDock = useCallback((d: Dock) => { setDockState(d); try { localStorage.setItem('ide:dock', d) } catch { /* ignore */ } }, [])

  const value = useMemo<Ctx>(() => ({
    open, qn, hidden, dock, termOpen, openFor, setDock,
    toggle: () => setOpen((o) => !o),
    close: () => { setOpen(false); setHidden(false) },
    toggleHidden: () => setHidden((h) => !h),
    toggleTerm: () => setTermOpen((t) => !t),
  }), [open, qn, hidden, dock, termOpen, openFor, setDock])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useIde = () => useContext(C)
