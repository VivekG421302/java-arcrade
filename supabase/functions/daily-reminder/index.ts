// Sends the daily reminder to every subscription whose local time is 12:00-12:29.
// Run it every 30 minutes (see supabase/reminder-cron.sql) so half-hour zones such as IST land exactly on 12:00.
import { createClient } from 'npm:@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const localTime = (tz: string) => {
  const p = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: 'numeric', hourCycle: 'h23' }).formatToParts(new Date())
  return { h: Number(p.find((x) => x.type === 'hour')!.value), m: Number(p.find((x) => x.type === 'minute')!.value) }
}

Deno.serve(async (req) => {
  if (req.headers.get('authorization') !== `Bearer ${Deno.env.get('CRON_SECRET')}`) return new Response('unauthorized', { status: 401 })

  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: subs, error } = await sb.from('push_subscriptions').select('*')
  if (error) return new Response(error.message, { status: 500 })

  let sent = 0
  const dead: string[] = []
  await Promise.all(
    (subs ?? []).map(async (s) => {
      try {
        const t = localTime(s.tz)
        if (t.h !== 12 || t.m >= 30) return
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, 'daily-reminder')
        sent++
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode
        if (code === 404 || code === 410) dead.push(s.endpoint) // browser unsubscribed
      }
    })
  )
  if (dead.length) await sb.from('push_subscriptions').delete().in('endpoint', dead)
  return Response.json({ sent, removed: dead.length })
})
