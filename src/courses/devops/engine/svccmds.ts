import { appendText, startApp, ORDERS_SEED_SQL } from './app'
import { installNginx } from './nginx'
import { flagsOf } from './corecmds'
import { can, exists, mkdirp, writeFile } from './fs'
import { ANSI, sqlBridge, type CmdCtx, type CmdFn, type OutLine, type Shell } from './shellTypes'
import { buildJarLocally, hhmm, installPostgres, JAR_NAME, killProc, LOCAL_PROJECT, pgAccepting, startPostgresProcs, tick, type World } from './world'

// ---------- wrappers ----------

const sudo: CmdFn = async (c) => {
  const rest = c.argv.slice(1)
  let user = 'root'
  while (rest[0]?.startsWith('-')) {
    const f = rest.shift()!
    if (f === '-u') user = rest.shift() ?? 'root'
  }
  if (!rest.length) { c.err('usage: sudo [-u user] command'); return 1 }
  if (c.host === 'local') {
    c.err('sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper')
    c.err('sudo: a password is required')
    c.tip('`sudo` on your laptop wants YOUR laptop password. The shop server is a different machine: log in with ssh first.')
    return 1
  }
  return c.run(rest, { sudo: true, user })
}

const nohup: CmdFn = async (c) => {
  const rest = c.argv.slice(1)
  if (!rest.length) { c.err('nohup: missing operand'); return 125 }
  const msg = c.redir.stdout ? 'nohup: ignoring input' : "nohup: ignoring input and appending output to 'nohup.out'"
  if (c.redir.stdout && c.redir.errToOut) c.out(msg)       // stderr is the log file: the message lands in app.log, like real nohup
  else c.err(msg)
  if (c.redir.stdout) return c.run(rest, { immune: true })
  const buf: string[] = []
  const code = await c.run(rest, { immune: true, stdout: buf })
  appendText(c.fs, `${c.cwd}/nohup.out`, buf.join('\n') + '\n', c.user, c.w.clock)
  return code
}

const setsid: CmdFn = (c) => c.run(c.argv.slice(1), { immune: true })

// ---------- apt ----------

const KNOWN = {
  nginx: { ver: '1.18.0-6ubuntu14.4', mb: 2 },
  certbot: { ver: '1.21.0-1build1', mb: 6 },
  'python3-certbot-nginx': { ver: '1.21.0-1', mb: 1 },
  ufw: { ver: '0.36.1-4ubuntu0.1', mb: 0 },
  'openjdk-17-jre-headless': { ver: '17.0.13+11-2ubuntu1~22.04', mb: 213 },
  'openjdk-17-jdk-headless': { ver: '17.0.13+11-2ubuntu1~22.04', mb: 264 },
  postgresql: { ver: '14+238', mb: 49 },
  curl: { ver: '7.81.0-1ubuntu1.18', mb: 0 },
} as Record<string, { ver: string; mb: number }>
const LOCKED = { 'docker.io': 4, 'docker-compose': 5, rsync: 3, git: 7 } as Record<string, number>
const STAGE2_PKGS = ['nginx', 'certbot', 'python3-certbot-nginx', 'ufw']

const apt: CmdFn = (c) => {
  const { flags, operands } = flagsOf(c.argv.slice(1).filter((a) => !a.startsWith('--')))
  const [verb, ...pkgs] = operands
  if (c.host === 'local' || !c.sudo) {
    if (!verb || verb === '--help') { c.out('apt 2.4.12 (amd64)'); return 0 }
    c.err('E: Could not open lock file /var/lib/dpkg/lock-frontend - open (13: Permission denied)')
    c.err('E: Unable to acquire the dpkg frontend lock (/var/lib/dpkg/lock-frontend), are you root?')
    if (c.host === 'local') c.tip('This is your laptop prompt (learner@laptop). Packages for the shop go on the server: ssh in first, then use `sudo`.')
    else c.tip('Installing software changes the whole machine, so Linux wants `sudo` in front.')
    return 100
  }
  const w = c.w
  if (verb === 'update') {
    ;['Hit:1 http://us-east-1.ec2.archive.ubuntu.com/ubuntu jammy InRelease', 'Get:2 http://us-east-1.ec2.archive.ubuntu.com/ubuntu jammy-updates InRelease [128 kB]', 'Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [129 kB]', 'Fetched 5,917 kB in 2s (3,162 kB/s)', 'Reading package lists... Done', 'Building dependency tree... Done', 'Reading state information... Done', 'All packages are up to date.'].forEach((l) => c.out(l))
    w.x.apt.updated = true
    return 0
  }
  if (verb !== 'install') { c.err(`E: Invalid operation ${verb ?? ''}`); return 100 }
  if (!pkgs.length) { c.err('E: No packages specified'); return 100 }
  let code = 0
  for (const p of pkgs) {
    if (STAGE2_PKGS.includes(p) && w.state.stage < 2) { c.err(`E: Package '${p}' is part of Stage 2 of this course and is not available yet.`); code = 100; continue }
    if (p in LOCKED) { c.err(`E: Package '${p}' is part of Stage ${LOCKED[p]} of this course and is not available yet.`); code = 100; continue }
    if (p.startsWith('mysql')) { c.err(`E: Package '${p}' is not available in this simulator build yet (the MySQL track is coming in a later phase).`); code = 100; continue }
    if (!w.x.apt.updated || !KNOWN[p]) { c.err(`E: Unable to locate package ${p}`); if (!w.x.apt.updated) c.tip('A brand-new server has an empty package catalogue. Run `sudo apt update` first.'); code = 100; continue }
    const have = p.startsWith('openjdk-17') ? w.state.packages.java17 : p === 'postgresql' ? w.x.pg.installed : p === 'curl' || p === 'ufw' ? true : w.x.apt.pkgs.includes(p)
    if (have) { c.out('Reading package lists... Done'); c.out(`${p} is already the newest version (${KNOWN[p].ver}).`); c.out('0 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.'); continue }
    c.out('Reading package lists... Done'); c.out('Building dependency tree... Done')
    c.out('The following NEW packages will be installed:'); c.out(`  ${p === 'postgresql' ? 'postgresql postgresql-14 postgresql-client-14 postgresql-common' : p}`)
    c.out(`After this operation, ${KNOWN[p].mb} MB of additional disk space will be used.`)
    if (!flags.has('y')) c.out('Do you want to continue? [Y/n] y')
    c.out(`Get:1 http://us-east-1.ec2.archive.ubuntu.com/ubuntu jammy-updates/main amd64 ${p} amd64 ${KNOWN[p].ver} [${KNOWN[p].mb} MB]`)
    if (p === 'postgresql') {
      c.out('Setting up postgresql-client-14 (14.13-0ubuntu0.22.04.1) ...'); c.out('Setting up postgresql-14 (14.13-0ubuntu0.22.04.1) ...')
      c.out('Creating new PostgreSQL cluster 14/main ...'); c.out('Setting up postgresql (14+238) ...'); installPostgres(w)
    } else {
      c.out(`Setting up ${p}${p.startsWith('python3') ? '' : ':amd64'} (${KNOWN[p].ver}) ...`)
      if (p.startsWith('openjdk-17')) w.state.packages.java17 = true
      if (p === 'nginx') { installNginx(w); c.out('Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → /lib/systemd/system/nginx.service.') }
      if (STAGE2_PKGS.includes(p)) w.x.apt.pkgs.push(p)
    }
  }
  return code
}

// ---------- java & maven ----------

const javaCmd: CmdFn = (c) => {
  const w = c.w
  const have = c.host === 'local' || w.state.packages.java17
  if (!have) {
    c.err("Command 'java' not found, but can be installed with:"); c.err(''); c.err('sudo apt install openjdk-17-jre-headless  # version 17.0.13+11-2ubuntu1~22.04, or')
    c.err('sudo apt install default-jre               # version 2:1.17-72'); c.tip('A brand-new server has no Java. Install it with apt first (and remember `sudo`).')
    return 127
  }
  const a = c.argv.slice(1)
  if (a.includes('-version') || a.includes('--version')) {
    c.err('openjdk version "17.0.13" 2024-10-15'); c.err('OpenJDK Runtime Environment (build 17.0.13+11-Ubuntu-2ubuntu122.04)'); c.err('OpenJDK 64-Bit Server VM (build 17.0.13+11-Ubuntu-2ubuntu122.04, mixed mode, sharing)')
    return 0
  }
  const j = a.indexOf('-jar')
  if (j < 0 || !a[j + 1]) { c.err('Usage: java [options] -jar <jarfile> [args...]'); return 1 }
  const jar = a[j + 1], jp = c.abs(jar)
  if (!c.fs[jp] || c.fs[jp].type !== 'file') { c.err(`Error: Unable to access jarfile ${jar}`); c.tip('Java looks for the jar relative to the folder you are standing in. Check `pwd` and `ls`.'); return 1 }
  const dir = jp.slice(0, jp.lastIndexOf('/')) || '/'
  const cwdForCfg = c.cwd
  const r = startApp(c.w, { host: c.host, cwd: dir === cwdForCfg ? c.cwd : c.cwd, bound: c.sh.ssh?.id ?? null, immune: c.immune, user: c.user })
  r.lines.forEach((l) => c.out(l))
  c.result.ok = r.ok
  if (!r.ok) { if (c.bg) { c.note('[1]+  Exit 1                  java -jar ' + jar, 'post'); return 0 } return 1 }
  if (c.bg) { c.note(`[1] ${r.proc!.pid}`, 'pre'); return 0 }
  if (c.host === 'remote') c.result.hold = { kind: 'fg', label: `java -jar ${jar}`, host: c.host, pid: r.proc!.pid }
  return 0
}

const mvn: CmdFn = (c) => {
  if (c.host === 'remote') {
    c.err("Command 'mvn' not found, but can be installed with:"); c.err(''); c.err('sudo apt install maven')
    c.tip('Maven (the builder) lives on your laptop, where the code is. The server only receives the finished jar.')
    return 127
  }
  const goals = c.argv.slice(1).filter((a) => !a.startsWith('-'))
  if (!goals.length) { c.err('[ERROR] No goals have been specified for this build. You must specify a valid lifecycle phase or a goal in the format <plugin-prefix>:<goal>.'); return 1 }
  if (!c.fs[`${c.cwd}/pom.xml`]) {
    c.err(`[ERROR] The goal you specified requires a project to execute but there is no POM in this directory (${c.cwd}). Please verify you invoked Maven from the correct directory. -> [Help 1]`)
    c.tip(`The project lives in ${LOCAL_PROJECT}. Try \`cd shop-app\` first.`)
    return 1
  }
  const bad = goals.find((g) => !['clean', 'package', 'install', 'verify', 'compile', 'test'].includes(g))
  if (bad) { c.err(`[ERROR] Unknown lifecycle phase "${bad}".`); return 1 }
  const t = `${c.cwd}/target`
  const L = (s: string) => c.out(`[INFO] ${s}`)
  L('Scanning for projects...'); L(''); L('------------------------< com.shop:shop-app >-------------------------'); L('Building shop-app 1.0.0'); L('--------------------------------[ jar ]---------------------------------')
  if (goals.includes('clean')) { L('--- clean:3.3.2:clean (default-clean) @ shop-app ---'); for (const p of Object.keys(c.fs)) if (p === t || p.startsWith(t + '/')) delete c.fs[p] }
  if (!goals.some((g) => ['package', 'install', 'verify'].includes(g))) { L('BUILD SUCCESS'); return 0 }
  L('--- resources:3.3.1:resources (default-resources) @ shop-app ---'); L('--- compiler:3.11.0:compile (default-compile) @ shop-app ---'); L('Compiling 6 source files with javac [debug release 17] to target/classes')
  if (!c.argv.some((a) => a.includes('skipTests'))) { L('--- surefire:3.1.2:test (default-test) @ shop-app ---'); L('Tests run: 4, Failures: 0, Errors: 0, Skipped: 0') }
  L('--- jar:3.3.0:jar (default-jar) @ shop-app ---'); L(`Building jar: ${t}/${JAR_NAME}`)
  L('--- spring-boot:3.2.5:repackage (repackage) @ shop-app ---'); L(`Replacing main artifact ${t}/${JAR_NAME} with repackaged archive, adding nested dependencies in BOOT-INF/.`)
  buildJarLocally(c.w)
  L('------------------------------------------------------------------------'); L('BUILD SUCCESS'); L('------------------------------------------------------------------------'); L('Total time:  8.412 s')
  tick(c.w, 8)
  return 0
}

// ---------- psql ----------

async function viaPglite(w: World, db: string, sql: string): Promise<{ out: string[]; err: string[] } | null> {
  if (!sqlBridge.run) return null
  const seed = db === 'shopdb' && w.x.pg.tablesCreated ? ORDERS_SEED_SQL + "SELECT '@@START@@' AS m;\n" : ''
  const r = await sqlBridge.run(seed + sql)
  let so = r.stdout
  if (seed) { const i = so.indexOf('@@START@@\n(1 row)\n\n'); so = i >= 0 ? so.slice(i + '@@START@@\n(1 row)\n\n'.length) : so }
  const split = (s: string) => (s.trim() === '' ? [] : s.replace(/\n+$/, '').split('\n'))
  return { out: split(so), err: split(r.stderr).map((l) => l.replace(/^psql:query\.sql:\d+: /, '')) }
}

/** Runs one SQL statement or backslash command. Role/database management is simulated here (PGlite has one database); queries go to PGlite. */
export async function sqlStatement(w: World, user: string, db: string, raw: string): Promise<{ out: string[]; err: string[]; leave?: boolean; db?: string }> {
  const s = raw.trim().replace(/;$/, '').trim()
  const up = s.replace(/\s+/g, ' ').toUpperCase()
  const pg = w.x.pg
  const err = (m: string) => ({ out: [], err: [m] })
  const su = user === 'postgres'
  if (s === '\\q') return { out: [], err: [], leave: true }
  if (s === '\\l') {
    const rows = Object.entries({ postgres: 'postgres', ...pg.dbs, template0: 'postgres', template1: 'postgres' }).map(([n, o]) => `${n.padEnd(10)}| ${o.padEnd(9)}| UTF8     | C.UTF-8 | C.UTF-8 |`)
    return { out: ['                              List of databases', '   Name    |  Owner   | Encoding | Collate |  Ctype  | Access privileges', '-----------+----------+----------+---------+---------+-------------------', ...rows, `(${rows.length} rows)`, ''], err: [] }
  }
  if (s === '\\du') {
    const rows = ['postgres  | Superuser, Create role, Create DB, Replication, Bypass RLS | {}', ...Object.keys(pg.users).map((u) => `${u.padEnd(10)}|                                                            | {}`)]
    return { out: ['                                    List of roles', ' Role name |                         Attributes                         | Member of', '-----------+------------------------------------------------------------+-----------', ...rows, ''], err: [] }
  }
  if (s === '\\dt') return db === 'shopdb' && pg.tablesCreated ? { out: ['          List of relations', ' Schema |  Name  | Type  |  Owner', '--------+--------+-------+----------', ' public | orders | table | shopuser', '(1 row)', ''], err: [] } : { out: ['Did not find any relations.'], err: [] }
  const cd = /^\\c(?:onnect)? (\w+)$/.exec(s)
  if (cd) return cd[1] in pg.dbs || cd[1] === 'postgres' ? { out: [`You are now connected to database "${cd[1]}" as user "${user}".`], err: [], db: cd[1] } : err(`connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed: FATAL:  database "${cd[1]}" does not exist\nPrevious connection kept`)
  const cu = /^CREATE (?:USER|ROLE) (\w+)(?: WITH)?(?: LOGIN)?(?: PASSWORD '(.*)')?$/.exec(s.replace(/\s+/g, ' '))
  if (cu || /^CREATE (USER|ROLE)/.test(up)) {
    if (!cu) return err(`ERROR:  syntax error at or near "${s.split(' ').slice(2, 4).join(' ')}"`)
    if (!su) return err('ERROR:  permission denied to create role')
    if (cu[1] in pg.users) return err(`ERROR:  role "${cu[1]}" already exists`)
    pg.users[cu[1]] = cu[2] ?? ''
    return { out: ['CREATE ROLE'], err: [] }
  }
  const cdb = /^CREATE DATABASE (\w+)(?: OWNER (\w+))?$/i.exec(s.replace(/\s+/g, ' '))
  if (cdb || up.startsWith('CREATE DATABASE')) {
    if (!cdb) return err('ERROR:  syntax error at or near "DATABASE"')
    if (!su) return err('ERROR:  permission denied to create database')
    if (cdb[1] in pg.dbs) return err(`ERROR:  database "${cdb[1]}" already exists`)
    if (cdb[2] && !(cdb[2] in pg.users)) return err(`ERROR:  role "${cdb[2]}" does not exist`)
    pg.dbs[cdb[1]] = cdb[2] ?? 'postgres'
    return { out: ['CREATE DATABASE'], err: [] }
  }
  const gr = /^GRANT ALL(?: PRIVILEGES)? ON DATABASE (\w+) TO (\w+)$/i.exec(s.replace(/\s+/g, ' '))
  if (gr || up.startsWith('GRANT')) {
    if (!gr) return err(`ERROR:  syntax error at or near "${s.split(' ')[1] ?? 'GRANT'}"`)
    if (!(gr[1] in pg.dbs)) return err(`ERROR:  database "${gr[1]}" does not exist`)
    if (!(gr[2] in pg.users)) return err(`ERROR:  role "${gr[2]}" does not exist`)
    pg.grants[gr[1]] = [...new Set([...(pg.grants[gr[1]] ?? []), gr[2]])]
    return { out: ['GRANT'], err: [] }
  }
  const al = /^ALTER (?:USER|ROLE) (\w+) WITH PASSWORD '(.*)'$/i.exec(s.replace(/\s+/g, ' '))
  if (al) { if (!(al[1] in pg.users)) return err(`ERROR:  role "${al[1]}" does not exist`); pg.users[al[1]] = al[2]; return { out: ['ALTER ROLE'], err: [] } }
  if (/^SELECT 1$/i.test(s)) return { out: [' ?column?', '----------', '        1', '(1 row)', ''], err: [] }
  const r = await viaPglite(w, db, s.endsWith(';') ? s : s + ';')
  if (r) return r
  return err('ERROR:  this simulator only runs simple queries when the in-browser PostgreSQL is not loaded')
}

const psql: CmdFn = async (c) => {
  const w = c.w
  if (c.host === 'local' || !w.x.pg.installed) {
    c.err("Command 'psql' not found, but can be installed with:"); c.err(''); c.err('sudo apt install postgresql-client-common')
    c.tip(c.host === 'local' ? 'The database lives on the server, not on your laptop: ssh in first.' : 'PostgreSQL is not installed yet: `sudo apt install -y postgresql`.')
    return 127
  }
  const { values, operands } = flagsOf(c.argv.slice(1), ['h', 'U', 'd', 'c', 'p', 'f'])
  const host = values.h, dbArg = values.d ?? operands[0]
  const asUser = values.U ?? c.user
  const sock = `connection to server on socket "/var/run/postgresql/.s.PGSQL.5432" failed:`
  const tcp = `connection to server at "${host}" (127.0.0.1), port 5432 failed:`
  let db = dbArg ?? (host ? asUser : asUser)
  if (!host) {
    if (c.user === 'postgres' && asUser === 'postgres') db = dbArg ?? 'postgres'
    else if (asUser !== c.user) { c.err(`psql: error: ${sock} FATAL:  Peer authentication failed for user "${asUser}"`); return 2 }
    else if (!(asUser in w.x.pg.users)) { c.err(`psql: error: ${sock} FATAL:  role "${asUser}" does not exist`); c.tip('Linux user `ubuntu` has no PostgreSQL role. Either enter as the database owner with `sudo -u postgres psql`, or connect as a role with `-h localhost -U shopuser`.'); return 2 }
  } else {
    if (!pgAccepting(w)) { c.err(`psql: error: ${tcp} Connection refused`); c.err('\tIs the server running on that host and accepting TCP/IP connections?'); return 2 }
    const pw = c.env.PGPASSWORD
    if (pw === undefined) {
      c.sh.repl = { kind: 'password', label: `Password for user ${asUser}: `, replay: JSON.stringify(c.argv) }
      c.result.secret = true
      return 0
    }
    if (w.x.pg.users[asUser] === undefined || w.x.pg.users[asUser] !== pw) { c.err(`psql: error: ${tcp} FATAL:  password authentication failed for user "${asUser}"`); return 2 }
  }
  if (!(db in w.x.pg.dbs) && db !== 'postgres') { c.err(`psql: error: ${host ? tcp : sock} FATAL:  database "${db}" does not exist`); return 2 }
  if (values.c !== undefined) {
    for (const stmt of values.c.split(/;\s*/).filter(Boolean)) {
      const r = await sqlStatement(w, asUser, db, stmt + ';')
      r.out.forEach((l) => c.out(l)); r.err.forEach((l) => c.err(l))
      if (r.err.length) return 1
    }
    return 0
  }
  c.sh.repl = { kind: 'psql', user: asUser, db, buf: '' }
  c.out('psql (14.13 (Ubuntu 14.13-0ubuntu0.22.04.1))'); c.out('Type "help" for help.'); c.out('')
  return 0
}

export async function psqlLine(w: World, sh: Shell, line: string): Promise<{ out: OutLine[]; leave: boolean }> {
  const r = sh.repl
  if (!r || r.kind !== 'psql') return { out: [], leave: true }
  const out: OutLine[] = []
  const t = line.trim()
  if (!t) return { out, leave: false }
  if (t === 'help') { out.push({ t: 'out', s: 'You are using psql, the command-line interface to PostgreSQL.' }, { t: 'out', s: 'Type:  \\q to quit   \\l list databases   \\du list roles   \\dt list tables' }); return { out, leave: false } }
  r.buf = r.buf ? `${r.buf} ${t}` : t
  if (!r.buf.startsWith('\\') && !r.buf.endsWith(';')) return { out, leave: false }       // statement continues on the next line
  const stmt = r.buf
  r.buf = ''
  const res = await sqlStatement(w, r.user, r.db, stmt)
  res.out.forEach((s) => out.push({ t: 'out', s }))
  res.err.forEach((s) => out.push({ t: 'err', s }))
  if (res.db) r.db = res.db
  return { out, leave: !!res.leave }
}

// ---------- nano ----------

const nano: CmdFn = (c) => {
  const f = c.argv.slice(1).find((a) => !a.startsWith('-'))
  if (!f) { c.err('nano: please give a file name, e.g. `sudo nano /etc/postgresql/14/main/postgresql.conf`'); return 1 }
  const p = c.abs(f)
  if (c.fs[p]?.type === 'dir') { c.err(`nano: ${f} is a directory`); return 1 }
  if (c.fs[p] && !can(c.fs[p], c.user, 'r')) { c.err(`nano: ${f}: Permission denied`); return 1 }
  c.result.edit = { host: c.host, path: p, sudo: c.user === 'root' }
  return 0
}

/** Called by the editor overlay on Ctrl+O / Save. Mirrors nano's own error text when you lack permission. */
export function saveEdit(w: World, host: 'local' | 'remote', path: string, content: string, sudoUser: boolean): { ok: boolean; msg: string } {
  const fs = w.fs[host]
  const user = sudoUser ? 'root' : host === 'remote' ? 'ubuntu' : 'learner'
  const e = fs[path]
  const par = path.slice(0, path.lastIndexOf('/')) || '/'
  if (e ? !can(e, user, 'w') : !fs[par] || !can(fs[par], user, 'w')) return { ok: false, msg: `[ Error writing ${path}: Permission denied ]` }
  if (!fs[par]) mkdirp(fs, par, user, w.clock)
  writeFile(fs, path, content.endsWith('\n') || content === '' ? content : content + '\n', user, w.clock)
  return { ok: true, msg: `[ Wrote ${content.split('\n').length} lines ]` }
}

export const SVC: Record<string, CmdFn> = { sudo, nohup, setsid, apt, 'apt-get': apt, java: javaCmd, mvn, psql, nano }
export { exists }
export type { CmdCtx }
