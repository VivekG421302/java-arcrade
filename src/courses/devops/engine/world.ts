// The simulated world: two filesystems (laptop + VPS), a process table, and the hidden SimulatedServerState.
// Ground truth lives in `fs`, `procs` and `x`; `syncWorld` derives the spec's SimulatedServerState from it after every command,
// which is what the topology badges read (spec 4.4.3). Everything here is plain JSON so it can be persisted in localStorage.
import type { SimulatedServerState, VirtualFileSystemNode } from '../types'
import { buildFs, exists, mkdirp, writeFile, type Fs } from './fs'

export const PUBLIC_IP = '203.0.113.10'
export const HOSTNAME = 'shop-server'
export const HOME = { local: '/home/learner', remote: '/home/ubuntu' } as const
export const LOCAL_PROJECT = '/home/learner/shop-app'
export const JAR_NAME = 'shop-app-1.0.0.jar'
export const JAR_BYTES = 41_943_040            // exactly 40 MiB -> `ls -lh` prints 40M
export const APP_DIR = '/opt/myapp'
export const PG_CONF = '/etc/postgresql/14/main/postgresql.conf'
export const PEM = '/home/learner/.ssh/deploy.pem'
export const T0 = Date.UTC(2026, 10, 24, 9, 0, 0) / 1000
const APP_PIDS = [2142, 2317, 2488, 2651, 2814, 2977]

export interface Proc {
  pid: number
  user: string
  cmd: string
  tty: string
  stat: string
  rssKb: number
  started: number                 // epoch seconds
  kind: 'app' | 'sshd' | 'init' | 'postgres' | 'bash' | 'other'
  bound: number | null            // ssh session id this process dies with (SIGHUP) unless immune
  immune: boolean                 // started with nohup / setsid
  listens: number[]
}

export interface SshSlot { id: number; tty: string; since: number }

export interface Extras {
  app: { everStarted: boolean; lastExit: 'none' | 'sighup' | 'bind' | 'db-refused' | 'db-auth' | 'db-missing' | 'killed' | 'stopped'; starts: number }
  pg: { installed: boolean; running: boolean; users: Record<string, string>; dbs: Record<string, string>; grants: Record<string, string[]>; tablesCreated: boolean; confListen: string; activeListen: string }
  apt: { updated: boolean }
  sftp: { connected: boolean; transfers: number }
  net: { appReachableFromInternet: boolean }
}

export interface World {
  v: 1
  clock: number
  boot: number
  state: SimulatedServerState
  x: Extras
  fs: { local: Fs; remote: Fs }
  procs: Proc[]
  ssh: SshSlot[]
  nextPid: number
  nextSsh: number
  appSeq: number
  remoteHistory: string[]
  sshdPid: number
}

export function initialState(): SimulatedServerState {
  return {
    stage: 1,
    server: { hostname: HOSTNAME, publicIp: PUBLIC_IP, os: 'ubuntu-22.04', uptimeSeconds: 0, rebootPending: false },
    packages: { java17: false, java21: false, postgresql: false, nginx: false, docker: false },
    processes: { appPid: null, appManagedBy: 'none' },
    listeners: { '22': 812, '80': null, '443': null, '5432': null, '8080': null },
    firewall: { ufwEnabled: false, allowedPorts: [22] },
    files: {},
    disks: { rootUsedPct: 18, varLogUsedPct: 4 },
    systemd: { springbootService: 'disabled' },
    releases: { current: null, versions: [], brokenSymlink: false },
    docker: { containers: {}, networks: [], volumes: [], oomKilled: false, memoryLimitBytes: null },
    compose: { healthy: {}, envResolved: {} },
    cloud: { vpcOk: true, sgChainOk: true, albTargetsHealthy: 0, natOk: true, rdsReachable: false, hikariPool: { active: 0, pending: 0, max: 10 } },
    ci: { pipelineStatus: 'idle', lastImageTag: null, secretsPresent: {} },
    k8s: { pods: {}, deployments: {}, secrets: {}, pvcBound: false, hpaReplicas: { min: 1, max: 1, current: 1 } },
  }
}

export function createWorld(local: VirtualFileSystemNode, remote: VirtualFileSystemNode): World {
  const w: World = {
    v: 1, clock: T0, boot: T0 - 3 * 86400 - 4 * 3600,
    state: initialState(),
    x: {
      app: { everStarted: false, lastExit: 'none', starts: 0 },
      pg: { installed: false, running: false, users: {}, dbs: {}, grants: {}, tablesCreated: false, confListen: 'localhost', activeListen: 'localhost' },
      apt: { updated: false }, sftp: { connected: false, transfers: 0 }, net: { appReachableFromInternet: false },
    },
    fs: { local: buildFs(local, T0 - 86400), remote: buildFs(remote, T0 - 86400) },
    procs: [], ssh: [], nextPid: 2401, nextSsh: 1, appSeq: 0, remoteHistory: [], sshdPid: 812,
  }
  w.procs.push(
    { pid: 1, user: 'root', cmd: '/sbin/init', tty: '?', stat: 'Ss', rssKb: 13200, started: w.boot, kind: 'init', bound: null, immune: true, listens: [] },
    { pid: 812, user: 'root', cmd: 'sshd: /usr/sbin/sshd -D [listener] 0 of 10-100 startups', tty: '?', stat: 'Ss', rssKb: 7424, started: w.boot, kind: 'sshd', bound: null, immune: true, listens: [22] },
  )
  syncWorld(w)
  return w
}

export const tick = (w: World, s = 1) => { w.clock += s }
export const pad = (n: number, l = 2) => String(n).padStart(l, '0')
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const hhmm = (t: number) => { const d = new Date(t * 1000); return `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}` }
export const hhmmss = (t: number) => `${hhmm(t)}:${pad(new Date(t * 1000).getUTCSeconds())}`
export const isoMs = (t: number, ms = 412) => new Date(t * 1000 + ms).toISOString()
export const lsDate = (t: number) => { const d = new Date(t * 1000); return `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, ' ')} ${hhmm(t)}` }
export const longDate = (t: number) => { const d = new Date(t * 1000); return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${hhmmss(t)} UTC ${d.getUTCFullYear()}` }
export const nextPid = (w: World) => { const p = w.nextPid; w.nextPid += 2 + (p % 3); return p }

// ---------- derived facts ----------

export function pgConfListen(w: World): string {
  const c = w.fs.remote[PG_CONF]?.content
  if (c === undefined) return 'localhost'
  let v = 'localhost'
  for (const m of c.matchAll(/^\s*listen_addresses\s*=\s*'([^']*)'/gm)) v = m[1]
  return v
}
/** PostgreSQL accepts TCP on 127.0.0.1:5432 only while running AND when the listen_addresses it was STARTED with is not empty (editing the file needs a restart). */
export const pgAccepting = (w: World) => w.x.pg.running && w.x.pg.activeListen.split(',').some((a) => ['localhost', '127.0.0.1', '*', '0.0.0.0', '::1', '::'].includes(a.trim()))
export const appProc = (w: World) => w.procs.find((p) => p.kind === 'app')
export const pgProc = (w: World) => w.procs.find((p) => p.kind === 'postgres')

const hash = (s: string) => { let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return (h >>> 0).toString(16).padStart(8, '0') }

const TRACKED: [keyof World['fs'], string][] = [['remote', `${APP_DIR}/app.jar`], ['remote', `${APP_DIR}/app.log`], ['remote', PG_CONF], ['local', PEM], ['local', `${LOCAL_PROJECT}/target/${JAR_NAME}`]]

/** Recompute the spec's SimulatedServerState from ground truth. Call after every command. */
export function syncWorld(w: World) {
  const s = w.state
  const app = appProc(w), pg = pgProc(w)
  w.x.pg.confListen = pgConfListen(w)
  s.server.uptimeSeconds = w.clock - w.boot
  s.packages.postgresql = w.x.pg.installed
  s.processes.appPid = app?.pid ?? null
  s.processes.appManagedBy = app ? (app.immune ? 'nohup' : 'none') : 'none'
  s.listeners['22'] = w.sshdPid
  s.listeners['8080'] = app?.pid ?? null
  s.listeners['5432'] = pgAccepting(w) && pg ? pg.pid : null
  s.firewall.ufwEnabled = false
  for (const [host, p] of TRACKED) {
    const e = w.fs[host][p]
    s.files[`${host}:${p}`] = { exists: !!e, contentHash: e ? hash((e.content ?? '') + e.size) : '', permissions: e?.mode ?? '' }
  }
}

// ---------- processes ----------

/** The PID the next app launch will get (spec walkthrough: 2142, then 2317, ...). Failed launches print it too, without consuming it. */
export const peekAppPid = (w: World) => APP_PIDS[w.appSeq] ?? APP_PIDS[APP_PIDS.length - 1] + 163 * (w.appSeq - APP_PIDS.length + 1)

export function spawnApp(w: World, o: { bound: number | null; immune: boolean; cwd: string; pid?: number }): Proc {
  const next = peekAppPid(w)
  const pid = o.pid ?? next
  if (pid === next) w.appSeq++
  const p: Proc = { pid, user: 'ubuntu', cmd: 'java -jar app.jar', tty: w.ssh.find((s) => s.id === o.bound)?.tty ?? '?', stat: 'Sl', rssKb: 402112, started: w.clock, kind: 'app', bound: o.bound, immune: o.immune, listens: [8080] }
  w.procs.push(p)
  w.x.app.everStarted = true
  w.x.app.lastExit = 'none'
  w.x.app.starts++
  return p
}

export function killProc(w: World, pid: number, why: Extras['app']['lastExit'] = 'killed') {
  const i = w.procs.findIndex((p) => p.pid === pid)
  if (i < 0) return false
  const p = w.procs[i]
  w.procs.splice(i, 1)
  if (p.kind === 'app') w.x.app.lastExit = why
  if (p.kind === 'postgres') { w.x.pg.running = false; w.procs = w.procs.filter((q) => q.kind !== 'postgres') }
  return true
}

export function openSsh(w: World): SshSlot {
  const slot: SshSlot = { id: w.nextSsh++, tty: `pts/${w.ssh.length}`, since: w.clock }
  w.ssh.push(slot)
  return slot
}

/**
 * Closing an SSH session (typing `exit`, or closing the PuTTY window) sends SIGHUP to every process still attached to it.
 * Processes started with nohup or setsid ignore it. This is exactly what Chaos 1.1 teaches.
 */
export function closeSsh(w: World, id: number): number[] {
  const killed: number[] = []
  w.ssh = w.ssh.filter((s) => s.id !== id)
  for (const p of [...w.procs]) {
    if (p.bound === id && !p.immune) { killProc(w, p.pid, 'sighup'); killed.push(p.pid) }
    else if (p.bound === id) p.bound = null
  }
  w.procs = w.procs.filter((p) => !(p.kind === 'bash' && p.bound === id))
  return killed
}

// ---------- package / database provisioning (shared by `apt install` and the fast-forward baselines) ----------

const PG_CONF_DEFAULT = `# -----------------------------
# PostgreSQL configuration file
# -----------------------------
data_directory = '/var/lib/postgresql/14/main'
hba_file = '/etc/postgresql/14/main/pg_hba.conf'
port = 5432
max_connections = 100
#listen_addresses = 'localhost'		# what IP address(es) to listen on;
unix_socket_directories = '/var/run/postgresql'
shared_buffers = 128MB
`

export function installPostgres(w: World) {
  const r = w.fs.remote
  w.x.pg.installed = true
  w.x.pg.running = true
  mkdirp(r, '/etc/postgresql/14/main', 'root', w.clock)
  writeFile(r, PG_CONF, PG_CONF_DEFAULT, 'postgres', w.clock, '644')
  writeFile(r, '/etc/postgresql/14/main/pg_hba.conf', '# TYPE  DATABASE  USER  ADDRESS  METHOD\nlocal   all       postgres        peer\nhost    all       all   127.0.0.1/32  scram-sha-256\n', 'postgres', w.clock, '640')
  mkdirp(r, '/var/lib/postgresql/14/main', 'postgres', w.clock)
  startPostgresProcs(w)
}

export function startPostgresProcs(w: World) {
  w.procs = w.procs.filter((p) => p.kind !== 'postgres')
  const master = 1630
  const mk = (pid: number, cmd: string, kb: number): Proc => ({ pid, user: 'postgres', cmd, tty: '?', stat: 'Ss', rssKb: kb, started: w.clock, kind: 'postgres', bound: null, immune: true, listens: pid === master ? [5432] : [] })
  w.procs.push(
    mk(master, '/usr/lib/postgresql/14/bin/postgres -D /var/lib/postgresql/14/main -c config_file=/etc/postgresql/14/main/postgresql.conf', 29704),
    mk(1632, 'postgres: 14/main: checkpointer', 29156), mk(1633, 'postgres: 14/main: background writer', 29156),
    mk(1634, 'postgres: 14/main: walwriter', 29156), mk(1635, 'postgres: 14/main: autovacuum launcher', 29804), mk(1636, 'postgres: 14/main: logical replication launcher', 29804),
  )
  w.x.pg.running = true
  w.x.pg.activeListen = pgConfListen(w)
}

export function createShopDatabase(w: World) {
  const pg = w.x.pg
  pg.users.shopuser = 'ShopPass123!'
  pg.dbs.shopdb = 'shopuser'
  pg.grants.shopdb = ['shopuser']
}

/** The shipping address of the jar on the laptop: what `mvn clean package` produces. */
export function buildJarLocally(w: World) {
  const t = `${LOCAL_PROJECT}/target`
  for (const p of Object.keys(w.fs.local)) if (p === t || p.startsWith(t + '/')) delete w.fs.local[p]
  mkdirp(w.fs.local, t, 'learner', w.clock)
  writeFile(w.fs.local, `${t}/${JAR_NAME}`, '', 'learner', w.clock, '644', JAR_BYTES)
  writeFile(w.fs.local, `${t}/${JAR_NAME}.original`, '', 'learner', w.clock, '644', 128_411)
  writeFile(w.fs.local, `${t}/classes/application.properties`, '', 'learner', w.clock, '644')
}

export function uploadJar(w: World) {
  writeFile(w.fs.remote, `${APP_DIR}/app.jar`, '', 'ubuntu', w.clock, '644', JAR_BYTES)
}

export type Baseline = 'built' | 'uploaded' | 'provisioned'
/**
 * Fast-forwards the world to a known checkpoint so a chaos lab (or a returning learner) never depends on having typed every
 * earlier command: the spec requires SimulatedServerState to satisfy ALL chaos-lab preconditions.
 */
export function fastForward(w: World, level: Baseline) {
  if (!exists(w.fs.local, `${LOCAL_PROJECT}/target/${JAR_NAME}`)) buildJarLocally(w)
  if (level === 'built') return
  if (!exists(w.fs.remote, `${APP_DIR}/app.jar`)) uploadJar(w)
  if (level === 'uploaded') return
  w.x.apt.updated = true
  w.state.packages.java17 = true
  if (!w.x.pg.installed) installPostgres(w)
  createShopDatabase(w)
  syncWorld(w)
}
