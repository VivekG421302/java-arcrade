import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from './useAuth'
import { useCourse } from './useCourse'

// Solved problem numbers per course (and per signed-in user), kept in localStorage and shared by every component.
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  window.addEventListener('storage', l)   // other tabs
  return () => { listeners.delete(l); window.removeEventListener('storage', l) }
}
const EMPTY: number[] = []
const cache = new Map<string, { raw: string | null; val: number[] }>()
function snapshot(key: string): number[] {
  let raw: string | null = null
  try { raw = localStorage.getItem(key) } catch { /* ignore */ }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.val
  let val: number[] = EMPTY
  try { if (raw) val = JSON.parse(raw) as number[] } catch { /* ignore */ }
  cache.set(key, { raw, val })
  return val
}

export function useSolved() {
  const { user } = useAuth()
  const { course } = useCourse()
  const key = `solved:${user?.id ?? 'guest'}:${course}`
  const list = useSyncExternalStore(subscribe, () => snapshot(key), () => EMPTY)
  const set = useMemo(() => new Set(list), [list])
  const setSolved = useCallback((n: number, on: boolean) => {
    const cur = new Set(snapshot(key))
    if (on) cur.add(n); else cur.delete(n)
    try { localStorage.setItem(key, JSON.stringify([...cur].sort((a, b) => a - b))) } catch { /* ignore */ }
    emit()
  }, [key])
  return { solved: set, isSolved: (n: number) => set.has(n), setSolved, count: set.size }
}
