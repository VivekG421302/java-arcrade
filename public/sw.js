/* Service worker: offline cache + daily noon reminder (push and periodic-sync fallback). */
const CACHE = 'jm-v1'
const TAG = 'daily-reminder'
const BODY = 'Midday check-in: update your progress, read a section or take a phase test.'

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(['/', '/favicon.svg', '/manifest.webmanifest'])).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== 'meta').map((k) => caches.delete(k)))).then(() => self.clients.claim())
  )
})

// Network-first for pages (fall back to cached shell), stale-while-revalidate for assets.
self.addEventListener('fetch', (e) => {
  const req = e.request
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put('/', c)); return r }).catch(() => caches.match('/')))
    return
  }
  e.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((r) => { if (r.ok) { const c = r.clone(); caches.open(CACHE).then((x) => x.put(req, c)) } return r }).catch(() => hit)
      return hit || net
    })
  )
})

const today = () => new Date().toDateString()
async function lastSent() {
  const r = await (await caches.open('meta')).match('/last-reminder')
  return r ? r.text() : ''
}
async function markSent() {
  await (await caches.open('meta')).put('/last-reminder', new Response(today()))
}
function show() {
  return self.registration.showNotification('Java Mastery', {
    body: BODY, tag: TAG, icon: '/icons/icon-192.png', badge: '/favicon.svg', data: { url: '/' },
  })
}

// Real push (sent by the Supabase Edge Function at 12:00 in the user's timezone).
self.addEventListener('push', (e) => {
  e.waitUntil(show().then(markSent))
})

// Best-effort fallback on installed Chromium PWAs: wakes occasionally; notify if it is past noon and none was sent today.
self.addEventListener('periodicsync', (e) => {
  if (e.tag !== TAG) return
  e.waitUntil((async () => {
    if (new Date().getHours() >= 12 && (await lastSent()) !== today()) { await show(); await markSent() }
  })())
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list[0]
      return open ? open.focus() : self.clients.openWindow((e.notification.data && e.notification.data.url) || '/')
    })
  )
})
