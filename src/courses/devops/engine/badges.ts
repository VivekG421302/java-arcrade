// Health badges for the topology map, derived ONLY from the simulated world (spec 4.4.3). No component hard-codes a badge.
import type { HealthBadge } from '../types'
import { listensOn } from './nginx'
import { appProc, pgAccepting, ufwBlocks, type World } from './world'

export const BADGE_META: Record<HealthBadge, { emoji: string; label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  RUNNING: { emoji: '🟢', label: 'RUNNING', tone: 'ok' },
  CRASHED: { emoji: '🔴', label: 'CRASHED', tone: 'bad' },
  '502_BAD_GATEWAY': { emoji: '🟠', label: '502 BAD GATEWAY', tone: 'warn' },
  DB_CONN_REFUSED: { emoji: '🔴', label: 'DB_CONN_REFUSED', tone: 'bad' },
  PENDING: { emoji: '🟡', label: 'PENDING', tone: 'warn' },
  CrashLoopBackOff: { emoji: '🔴', label: 'CrashLoopBackOff', tone: 'bad' },
}

export type Badges = Record<'customer' | 'laptop' | 'vps' | 'app' | 'db' | 'nginx' | 'systemd', HealthBadge>

/** nginx has at least one proxying server block whose upstream is not answering. */
export const upstreamBroken = (w: World) => !!w.x.nginx.loaded?.servers.some((s) => s.proxy !== null && (s.proxy !== 8080 || !appProc(w)))

export function deriveBadges(w: World): Badges {
  const s = w.state
  const appUp = !!appProc(w)
  const unit = w.x.sd.units.springboot
  const looping = unit?.active === 'activating'
  const db: HealthBadge = !s.packages.postgresql ? 'PENDING' : !w.x.pg.running ? 'CRASHED' : !pgAccepting(w) ? 'DB_CONN_REFUSED' : 'RUNNING'
  let app: HealthBadge
  if (appUp) app = 'RUNNING'
  else if (looping) app = 'CrashLoopBackOff'
  else if (w.x.app.lastExit === 'db-refused') app = 'DB_CONN_REFUSED'
  else if (w.x.app.everStarted) app = 'CRASHED'
  else app = 'PENDING'
  const ngUp = listensOn(w, 80) || listensOn(w, 443)
  const nginx: HealthBadge = !w.x.nginx.installed ? 'PENDING' : !w.x.nginx.running ? 'CRASHED' : upstreamBroken(w) ? '502_BAD_GATEWAY' : 'RUNNING'
  const systemd: HealthBadge = !unit ? 'PENDING' : unit.active === 'active' ? 'RUNNING' : looping ? 'CrashLoopBackOff' : unit.active === 'failed' ? 'CRASHED' : 'PENDING'
  const reachable = (ngUp && (!ufwBlocks(w, 80) || !ufwBlocks(w, 443))) || (appUp && !ufwBlocks(w, 8080))
  return { customer: reachable ? 'RUNNING' : 'PENDING', laptop: 'RUNNING', vps: 'RUNNING', app, db, nginx, systemd }
}
