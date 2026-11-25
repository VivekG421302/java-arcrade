// Health badges for the topology map, derived ONLY from SimulatedServerState + the world's lifecycle facts (spec 4.4.3).
import type { HealthBadge } from '../types'
import { appProc, pgAccepting, type World } from './world'

export const BADGE_META: Record<HealthBadge, { emoji: string; label: string; tone: 'ok' | 'warn' | 'bad' }> = {
  RUNNING: { emoji: '🟢', label: 'RUNNING', tone: 'ok' },
  CRASHED: { emoji: '🔴', label: 'CRASHED', tone: 'bad' },
  '502_BAD_GATEWAY': { emoji: '🟠', label: '502 BAD GATEWAY', tone: 'warn' },
  DB_CONN_REFUSED: { emoji: '🔴', label: 'DB_CONN_REFUSED', tone: 'bad' },
  PENDING: { emoji: '🟡', label: 'PENDING', tone: 'warn' },
  CrashLoopBackOff: { emoji: '🔴', label: 'CrashLoopBackOff', tone: 'bad' },
}

export interface Badges { customer: HealthBadge; laptop: HealthBadge; vps: HealthBadge; app: HealthBadge; db: HealthBadge }

export function deriveBadges(w: World): Badges {
  const s = w.state
  const jarOnLaptop = !!w.fs.local['/home/learner/shop-app/target/shop-app-1.0.0.jar']
  const appUp = !!appProc(w)
  const db: HealthBadge = !s.packages.postgresql ? 'PENDING' : !w.x.pg.running ? 'CRASHED' : !pgAccepting(w) ? 'DB_CONN_REFUSED' : 'RUNNING'
  let app: HealthBadge
  if (appUp) app = 'RUNNING'
  else if (w.x.app.lastExit === 'db-refused') app = 'DB_CONN_REFUSED'
  else if (w.x.app.everStarted) app = 'CRASHED'
  else app = 'PENDING'
  return {
    customer: appUp ? 'RUNNING' : 'PENDING',
    laptop: jarOnLaptop || true ? 'RUNNING' : 'PENDING',
    vps: 'RUNNING',
    app, db,
  }
}
