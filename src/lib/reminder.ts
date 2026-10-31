import { supabase } from './supabase'

const TAG = 'daily-reminder'
const KEY = 'reminder:enabled'
const DEFAULT_BODY = 'Midday check-in: update your progress, read a section or take a phase test.'

export const reminderSupported = () => 'Notification' in window && 'serviceWorker' in navigator
export const reminderEnabled = () => reminderSupported() && Notification.permission === 'granted' && localStorage.getItem(KEY) === '1'
export const reminderBlocked = () => reminderSupported() && Notification.permission === 'denied'

const today = () => new Date().toDateString()
// Same cache entry the service worker uses, so the page and the worker never double-notify.
const lastSent = async () => (await (await caches.open('meta')).match('/last-reminder'))?.text() ?? ''
const markSent = async () => (await caches.open('meta')).put('/last-reminder', new Response(today()))

async function show(body: string) {
  const reg = await navigator.serviceWorker.getRegistration()
  const opts = { body, tag: TAG, icon: '/icons/icon-192.png', badge: '/favicon.svg', data: { url: '/' } }
  if (reg) await reg.showNotification('Java Mastery', opts)
  else new Notification('Java Mastery', opts) // dev mode: no service worker registered
}

/** Notify once per day, any time at or after 12:00 local time. */
export async function notifyIfDue(body = DEFAULT_BODY) {
  if (!reminderEnabled() || new Date().getHours() < 12 || (await lastSent()) === today()) return
  await show(body)
  await markSent()
}

/** While the app is open: check every minute and whenever the tab becomes visible. */
export function startLocalScheduler(getBody: () => string) {
  const tick = () => void notifyIfDue(getBody())
  tick()
  const id = setInterval(tick, 60_000)
  const vis = () => document.visibilityState === 'visible' && tick()
  document.addEventListener('visibilitychange', vis)
  return () => { clearInterval(id); document.removeEventListener('visibilitychange', vis) }
}

const toKey = (b64: string) => {
  const raw = atob((b64 + '='.repeat((4 - (b64.length % 4)) % 4)).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

/** Server push (works with the app closed). Needs VITE_VAPID_PUBLIC_KEY, Supabase and a signed-in user. */
export async function subscribePush(userId: string) {
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined
  const reg = await navigator.serviceWorker.getRegistration()
  if (!vapid || !supabase || !reg) return false
  const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: toKey(vapid) as BufferSource }))
  const j = sub.toJSON()
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: userId, endpoint: j.endpoint, p256dh: j.keys?.p256dh, auth: j.keys?.auth, tz: Intl.DateTimeFormat().resolvedOptions().timeZone },
    { onConflict: 'endpoint' }
  )
  return !error
}

type PeriodicReg = ServiceWorkerRegistration & { periodicSync?: { register(tag: string, o: { minInterval: number }): Promise<void>; unregister(tag: string): Promise<void> } }

export async function enableReminders(userId?: string) {
  if (!reminderSupported()) return false
  if ((await Notification.requestPermission()) !== 'granted') return false
  localStorage.setItem(KEY, '1')
  const reg = (await navigator.serviceWorker.getRegistration()) as PeriodicReg | undefined
  try { await reg?.periodicSync?.register(TAG, { minInterval: 12 * 3600 * 1000 }) } catch { /* unsupported or not installed */ }
  if (userId) await subscribePush(userId).catch(() => false)
  return true
}

export async function disableReminders() {
  localStorage.setItem(KEY, '0')
  const reg = (await navigator.serviceWorker.getRegistration()) as PeriodicReg | undefined
  try { await reg?.periodicSync?.unregister(TAG) } catch { /* ignore */ }
  const sub = await reg?.pushManager.getSubscription()
  if (sub) {
    await supabase?.from('push_subscriptions').delete().eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  }
}
