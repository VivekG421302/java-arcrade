import { useEffect, useState } from 'react'

export const NARROW = '(max-width: 767px)'

export function useMedia(query: string) {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && !!window.matchMedia?.(query).matches)
  useEffect(() => {
    const mq = window.matchMedia?.(query)
    if (!mq) return
    const f = () => setMatch(mq.matches)
    f()
    mq.addEventListener?.('change', f)
    return () => mq.removeEventListener?.('change', f)
  }, [query])
  return match
}

/** Height covered by the on-screen keyboard (0 when it is closed), via the visual viewport. */
export function useKeyboardInset(active: boolean) {
  const [inset, setInset] = useState(0)
  useEffect(() => {
    const vv = typeof window !== 'undefined' ? window.visualViewport : null
    if (!active || !vv) { setInset(0); return }
    const f = () => setInset(Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop)))
    f()
    vv.addEventListener('resize', f)
    vv.addEventListener('scroll', f)
    return () => { vv.removeEventListener('resize', f); vv.removeEventListener('scroll', f) }
  }, [active])
  return inset
}
