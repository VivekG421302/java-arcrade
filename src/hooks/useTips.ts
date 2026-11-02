import { useEffect } from 'react'

/** Tooltips for every button: falls back to aria-label, and a long press shows the tip on touch screens. */
export function useTips() {
  useEffect(() => {
    let timer: number | undefined
    let swallow = false
    const fill = (el: Element) => {
      if (!el.hasAttribute('data-tip')) {
        const l = el.getAttribute('aria-label')
        if (l) el.setAttribute('data-tip', l)
      }
    }
    const target = (e: Event) => (e.target as Element | null)?.closest?.('[data-tip],button,a,[role=button]') ?? null

    const over = (e: Event) => { const el = target(e); if (el) fill(el) }
    const down = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return
      const el = target(e)
      if (!el) return
      fill(el)
      if (!el.hasAttribute('data-tip')) return
      timer = window.setTimeout(() => {
        el.setAttribute('data-tip-open', '')
        swallow = true
        window.setTimeout(() => { el.removeAttribute('data-tip-open'); swallow = false }, 2200)
      }, 450)
    }
    const cancel = () => window.clearTimeout(timer)
    const click = (e: MouseEvent) => { if (swallow) { e.preventDefault(); e.stopPropagation(); swallow = false } }
    const menu = (e: Event) => { if (swallow) e.preventDefault() }

    document.addEventListener('pointerover', over)
    document.addEventListener('focusin', over)
    document.addEventListener('pointerdown', down)
    document.addEventListener('pointerup', cancel)
    document.addEventListener('pointercancel', cancel)
    document.addEventListener('pointermove', cancel)
    document.addEventListener('click', click, true)
    document.addEventListener('contextmenu', menu)
    return () => {
      document.removeEventListener('pointerover', over)
      document.removeEventListener('focusin', over)
      document.removeEventListener('pointerdown', down)
      document.removeEventListener('pointerup', cancel)
      document.removeEventListener('pointercancel', cancel)
      document.removeEventListener('pointermove', cancel)
      document.removeEventListener('click', click, true)
      document.removeEventListener('contextmenu', menu)
    }
  }, [])
}
