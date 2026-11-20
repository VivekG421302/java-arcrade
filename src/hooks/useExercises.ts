import { useCallback, useMemo, useSyncExternalStore } from 'react'
import { useAuth } from './useAuth'
import { useCourse } from './useCourse'

// Finished exercise ids per course (and per signed-in user), kept in localStorage and shared by every component.
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())
const subscribe = (l: () => void) => {
  listeners.add(l)
  window.addEventListener('storage', l)
  return () => { listeners.delete(l); window.removeEventListener('storage', l) }
}
const EMPTY: string[] = []
const cache = new Map<string, { raw: string | null; val: string[] }>()
function snapshot(key: string): string[] {
  let raw: string | null = null
  try { raw = localStorage.getItem(key) } catch { /* ignore */ }
  const hit = cache.get(key)
  if (hit && hit.raw === raw) return hit.val
  let val: string[] = EMPTY
  try { if (raw) val = JSON.parse(raw) as string[] } catch { /* ignore */ }
  cache.set(key, { raw, val })
  return val
}

export function useExercises() {
  const { user } = useAuth()
  const { course } = useCourse()
  const key = `exdone:${user?.id ?? 'guest'}:${course}`
  const list = useSyncExternalStore(subscribe, () => snapshot(key), () => EMPTY)
  const set = useMemo(() => new Set(list), [list])
  const setDone = useCallback((id: string, on: boolean) => {
    const cur = new Set(snapshot(key))
    if (on) cur.add(id); else cur.delete(id)
    try { localStorage.setItem(key, JSON.stringify([...cur])) } catch { /* ignore */ }
    emit()
  }, [key])
  return { isDone: (id: string) => set.has(id), setDone }
}
