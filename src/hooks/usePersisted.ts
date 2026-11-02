import { useCallback, useState } from 'react'

/** useState that remembers its value in localStorage (JSON). */
export function usePersisted<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const s = localStorage.getItem(key)
      return s === null ? initial : (JSON.parse(s) as T)
    } catch { return initial }
  })
  const set = useCallback((next: T | ((prev: T) => T)) => {
    setValue((prev) => {
      const v = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
      try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ }
      return v
    })
  }, [key])
  return [value, set] as const
}

/** Clears layout/preferences (not your code or progress). */
export function resetPreferences() {
  try {
    for (const k of Object.keys(localStorage)) {
      if (/^(ide:|ui:|qb:)/.test(k) || k === 'theme' || k === 'reminder:enabled') localStorage.removeItem(k)
    }
  } catch { /* ignore */ }
}
