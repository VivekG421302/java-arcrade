// Chaos injection (spec 0.2 pillar 4). Each `injectionScript` string on a ChaosIncident names one of these functions.
// They break the *world* (processes, files, config); the topology badges and every command's output then change causally.
import { startApp } from './app'
import { writeFile } from './fs'
import { closeShell } from './shell'
import type { OutLine, Shell } from './shellTypes'
import { APP_DIR, fastForward, killProc, openSsh, PEM, PG_CONF, pgConfListen, spawnApp, startPostgresProcs, syncWorld, type World } from './world'

/** A healthy, fully deployed shop with nothing running: the starting point every chaos lab assumes. */
export function healthyBaseline(w: World) {
  fastForward(w, 'provisioned')
  const conf = w.fs.remote[PG_CONF]
  if (conf?.content && pgConfListen(w) !== 'localhost') {
    conf.content = conf.content.replace(/^\s*listen_addresses\s*=.*$/gm, "#listen_addresses = 'localhost'\t\t# what IP address(es) to listen on;")
    w.fs.remote[PG_CONF] = { ...conf, mtime: w.clock }
  }
  startPostgresProcs(w)
  for (const p of w.procs.filter((q) => q.kind === 'app')) killProc(w, p.pid, 'stopped')
  w.x.app.lastExit = 'none'
  w.fs.local[PEM].mode = '400'
}

type Injection = (w: World, shells: Shell[]) => string

const REMEMBER = (w: World, cmd: string) => { if (!w.remoteHistory.includes(cmd)) w.remoteHistory.push(cmd) }

const INJECTIONS: Record<string, Injection> = {
  /** Chaos 1.1: the app was started by hand without nohup, then the PuTTY window closes (SIGHUP to everything attached). */
  killProcessTree(w, shells) {
    healthyBaseline(w)
    const slot = openSsh(w)
    startApp(w, { host: 'remote', cwd: APP_DIR, bound: slot.id, immune: false, user: 'ubuntu' })
    REMEMBER(w, 'cd /opt/myapp && java -jar app.jar &')
    for (const sh of shells) closeShell(w, sh)
    w.procs.filter((p) => p.bound === slot.id).forEach((p) => killProc(w, p.pid, 'sighup'))
    w.ssh = []
    return '💥 PuTTY window closed unexpectedly. Every program still attached to that session was sent a hangup signal (SIGHUP).'
  },
  /** Chaos 1.2: a forgotten java from an earlier run still owns port 8080. */
  startZombieOnPort(w) {
    healthyBaseline(w)
    spawnApp(w, { bound: null, immune: true, cwd: APP_DIR, pid: 2142 })
    return '💥 A forgotten java process from an earlier run is still sitting on port 8080.'
  },
  /** Chaos 1.3: PostgreSQL is "active" but only reachable through its unix socket. */
  setPgListenAddresses(w) {
    healthyBaseline(w)
    const conf = w.fs.remote[PG_CONF]
    w.fs.remote[PG_CONF] = { ...conf, content: (conf.content ?? '').replace(/^#listen_addresses.*$/m, "listen_addresses = ''\t\t# what IP address(es) to listen on;"), mtime: w.clock }
    startPostgresProcs(w)
    startApp(w, { host: 'remote', cwd: APP_DIR, bound: null, immune: true, user: 'ubuntu' })   // the app tries to start and dies
    return '💥 PostgreSQL was restarted with a different network setting, and the shop app just tried to start.'
  },
  /** Chaos 1.4: the key file is world-readable. */
  loosenKeyPermissions(w) {
    healthyBaseline(w)
    w.fs.local[PEM].mode = '644'
    return '💥 deploy.pem was copied around and is now readable by everyone on this laptop (permissions 644).'
  },
}

export function injectChaos(w: World, shells: Shell[], script: string): { message: string; perShell: Map<number, OutLine[]> } {
  const name = /^(\w+)\(/.exec(script)?.[1] ?? ''
  const fn = INJECTIONS[name]
  if (!fn) throw new Error(`Unknown injection script: ${script}`)
  const hadSsh = new Set(shells.filter((s) => s.ssh).map((s) => s.id))
  const message = fn(w, shells)
  syncWorld(w)
  const perShell = new Map<number, OutLine[]>()
  for (const s of shells) if (hadSsh.has(s.id) && !s.ssh) perShell.set(s.id, [{ t: 'err', s: 'client_loop: send disconnect: Broken pipe' }, { t: 'sys', s: '💡 Your PuTTY window is gone. Reconnect with ssh.' }])
  return { message, perShell }
}

export { writeFile }
