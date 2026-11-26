// What happens when the shop app starts, and what it answers over HTTP. Failures are causal: they read the real simulated world
// (is PostgreSQL accepting TCP? does the role/database exist? is port 8080 taken?) and print the real-world error.
import { pgAccepting, spawnApp, appProc, isoMs, longDate, peekAppPid, serverDown, T0, ufwBlocks, type Proc, type World } from './world'
import { DOMAIN, listensOn, NGINX_VERSION, nginxRoute, type NginxReply } from './nginx'
import { writeFile, type Fs } from './fs'

const BANNER = [
  '  .   ____          _            __ _ _',
  ' /\\\\ / ___\'_ __ _ _(_)_ __  __ _ \\ \\ \\ \\',
  '( ( )\\___ | \'_ | \'_| | \'_ \\/ _` | \\ \\ \\ \\',
  ' \\\\/  ___)| |_)| | | | | || (_| |  ) ) ) )',
  '  \'  |____| .__|_| |_|_| |_\\__, | / / / /',
  ' =========|_|==============|___/=/_/_/_/',
  ' :: Spring Boot ::                (v3.2.5)',
  '',
]

const log = (t: number, ms: number, level: 'INFO' | 'ERROR' | 'WARN', pid: number, thread: string, logger: string, msg: string) =>
  `${isoMs(t, ms)} ${level.padStart(5)} ${pid} --- [${thread.padStart(15)}] ${logger.padEnd(40).slice(0, 40)} : ${msg}`

export interface AppConfig { host: string; port: number; db: string; user: string; password: string; unresolved?: string }

const PACKAGED: AppConfig = { host: 'localhost', port: 5432, db: 'shopdb', user: 'shopuser', password: 'ShopPass123!' }

/** Spring Boot reads ./application.properties from the working directory; otherwise the config baked into the jar (same values). */
export function readConfig(remoteFs: Fs, cwd: string, env: Record<string, string> = {}): AppConfig {
  const f = remoteFs[`${cwd === '/' ? '' : cwd}/application.properties`]
  if (!f?.content) return { ...PACKAGED }
  let unresolved: string | undefined
  // ${NAME} placeholders are filled from the process environment (what a systemd EnvironmentFile provides)
  const fill = (v: string | undefined) => v?.replace(/\$\{(\w+)\}/g, (_, n: string) => { if (env[n] === undefined) unresolved ??= n; return env[n] ?? '' })
  const get = (k: string) => fill(new RegExp(`^\\s*${k.replace(/\./g, '\\.')}\\s*=\\s*(.*?)\\s*$`, 'm').exec(f.content!)?.[1])
  const url = get('spring.datasource.url')
  const m = /^jdbc:postgresql:\/\/([^:/]+)(?::(\d+))?\/([^?]+)/.exec(url ?? '')
  return {
    host: m?.[1] ?? PACKAGED.host, port: Number(m?.[2] ?? 5432), db: m?.[3] ?? PACKAGED.db,
    user: get('spring.datasource.username') ?? PACKAGED.user, password: get('spring.datasource.password') ?? PACKAGED.password, unresolved,
  }
}

export interface StartResult { ok: boolean; lines: string[]; proc?: Proc }

export function startApp(w: World, o: { host: 'local' | 'remote'; cwd: string; bound: number | null; immune: boolean; user: string; env?: Record<string, string>; unit?: string; cmd?: string }): StartResult {
  const t = w.clock
  const portTaken = o.host === 'remote' && w.procs.some((p) => p.kind === 'app')
  const previewPid = o.host === 'remote' ? peekAppPid(w) : 4101
  const header = [...BANNER]
  const dbFail = (msg: string, cause: string): StartResult => ({
    ok: false,
    lines: [
      ...header,
      log(t, 412, 'INFO', previewPid, 'main', 'com.shop.ShopApplication', `Starting ShopApplication v1.0.0 using Java 17.0.13 with PID ${previewPid} (${o.cwd}/app.jar started by ${o.user} in ${o.cwd})`),
      log(t, 988, 'INFO', previewPid, 'main', 'com.zaxxer.hikari.HikariDataSource', 'HikariPool-1 - Starting...'),
      log(t, 1204, 'ERROR', previewPid, 'main', 'com.zaxxer.hikari.pool.HikariPool', 'HikariPool-1 - Exception during pool initialization'),
      msg,
      `Caused by: ${cause}`,
      log(t, 1260, 'WARN', previewPid, 'main', 'o.s.b.SpringApplication', 'Application run failed'),
    ],
  })

  if (o.host === 'local') {
    return dbFail('org.postgresql.util.PSQLException: Connection to localhost:5432 refused. Check that the hostname and port are correct and that the postmaster is accepting TCP/IP connections.', 'java.net.ConnectException: Connection refused')
  }

  // 1. the kitchen door (port 8080) must be free
  if (portTaken) {
    w.x.app.lastExit = 'bind'
    return {
      ok: false,
      lines: [
        ...header,
        log(t, 412, 'INFO', previewPid, 'main', 'com.shop.ShopApplication', `Starting ShopApplication v1.0.0 using Java 17.0.13 with PID ${previewPid} (${o.cwd}/app.jar started by ${o.user} in ${o.cwd})`),
        log(t, 1730, 'WARN', previewPid, 'main', 'ConfigServletWebServerApplicationContext', 'Exception encountered during context initialization - cancelling refresh attempt: org.springframework.context.ApplicationContextException: Failed to start bean \'webServerStartStop\''),
        log(t, 1741, 'ERROR', previewPid, 'main', 'o.a.catalina.core.StandardService', 'Failed to start connector [Connector[HTTP/1.1-8080]]'),
        'Caused by: java.net.BindException: Address already in use',
        '',
        '***************************',
        'APPLICATION FAILED TO START',
        '***************************',
        '',
        'Description:',
        '',
        'Web server failed to start. Port 8080 was already in use.',
        '',
        'Action:',
        '',
        "Identify and stop the process that's listening on port 8080 or configure this application to listen on another port.",
      ],
    }
  }

  // 2. the stockroom (database) must answer, know this role and this database
  const cfg = readConfig(w.fs.remote, o.cwd, o.env)
  if (cfg.unresolved) {
    w.x.app.lastExit = 'db-config'
    w.x.app.everStarted = true
    return dbFail(`org.springframework.beans.factory.BeanCreationException: Error creating bean with name 'dataSource' defined in class path resource`, `java.lang.IllegalArgumentException: Could not resolve placeholder '${cfg.unresolved}' in value "\${${cfg.unresolved}}"`)
  }
  const local = cfg.host === 'localhost' || cfg.host === '127.0.0.1'
  if (!local || cfg.port !== 5432 || !pgAccepting(w)) {
    w.x.app.lastExit = 'db-refused'
    w.x.app.everStarted = true
    return dbFail(`org.postgresql.util.PSQLException: Connection to ${cfg.host}:${cfg.port} refused. Check that the hostname and port are correct and that the postmaster is accepting TCP/IP connections.`, 'java.net.ConnectException: Connection refused')
  }
  const pass = w.x.pg.users[cfg.user]
  if (pass === undefined || pass !== cfg.password) {
    w.x.app.lastExit = 'db-auth'
    w.x.app.everStarted = true
    return dbFail(`org.postgresql.util.PSQLException: FATAL: password authentication failed for user "${cfg.user}"`, 'org.postgresql.util.PSQLException: FATAL: password authentication failed')
  }
  if (!(cfg.db in w.x.pg.dbs)) {
    w.x.app.lastExit = 'db-missing'
    w.x.app.everStarted = true
    return dbFail(`org.postgresql.util.PSQLException: FATAL: database "${cfg.db}" does not exist`, 'org.postgresql.util.PSQLException: FATAL: database does not exist')
  }

  // 3. everything is in place
  const proc = spawnApp(w, { bound: o.bound, immune: o.immune, cwd: o.cwd, unit: o.unit, cmd: o.cmd })
  w.x.pg.tablesCreated = true
  const P = proc.pid
  return {
    ok: true,
    proc,
    lines: [
      ...header,
      log(t, 412, 'INFO', P, 'main', 'com.shop.ShopApplication', `Starting ShopApplication v1.0.0 using Java 17.0.13 with PID ${P} (${o.cwd}/app.jar started by ${o.user} in ${o.cwd})`),
      log(t, 431, 'INFO', P, 'main', 'com.shop.ShopApplication', 'No active profile set, falling back to 1 default profile: "default"'),
      log(t, 1502, 'INFO', P, 'main', 'o.s.d.r.c.RepositoryConfigurationDelegate', 'Finished Spring Data repository scanning in 61 ms. Found 1 JPA repository interface.'),
      log(t, 2120, 'INFO', P, 'main', 'o.s.b.w.embedded.tomcat.TomcatWebServer', 'Tomcat initialized with port 8080 (http)'),
      log(t, 2988, 'INFO', P, 'main', 'com.zaxxer.hikari.pool.HikariPool', 'HikariPool-1 - Added connection org.postgresql.jdbc.PgConnection@5b5a1c32'),
      log(t, 2991, 'INFO', P, 'main', 'com.zaxxer.hikari.HikariDataSource', 'HikariPool-1 - Start completed.'),
      log(t, 4623, 'INFO', P, 'main', 'o.s.b.w.embedded.tomcat.TomcatWebServer', "Tomcat started on port 8080 (http) with context path '/'"),
      log(t, 4651, 'INFO', P, 'main', 'com.shop.ShopApplication', 'Started ShopApplication in 4.812 seconds (process running for 5.274)'),
    ],
  }
}

/** Append text to a file (creating it), the way `>>` or a running process writing its log would. */
export function appendText(fs: Fs, path: string, text: string, owner: string, now: number) {
  const prev = fs[path]?.content ?? ''
  writeFile(fs, path, prev + text, owner, now)
}

// ---------- HTTP ----------

export const ORDERS = [
  { id: 1, customer: 'Asha Patil', item: 'Masala Chai Box', qty: 2, total: 480.0 },
  { id: 2, customer: 'Rohan Mehta', item: 'Filter Coffee 500g', qty: 1, total: 350.0 },
  { id: 3, customer: 'Meera Nair', item: 'Millet Cookies', qty: 4, total: 640.0 },
]

export const ORDERS_SEED_SQL = `CREATE TABLE orders (id int PRIMARY KEY, customer text, item text, qty int, total numeric(10,2));
INSERT INTO orders VALUES ${ORDERS.map((o) => `(${o.id}, '${o.customer}', '${o.item}', ${o.qty}, ${o.total.toFixed(2)})`).join(', ')};
`

export type HttpResult =
  | { kind: 'ok'; status: number; body: string; headers: string[]; proto: 'HTTP/1.1' | 'HTTP/2'; location?: string }
  | { kind: 'fail'; code: number; msg: string }

const SERVER_HOSTS = ['203.0.113.10', DOMAIN]
/** What the Spring Boot app itself answers on :8080 (null when nothing listens there). */
function appReply(w: World, path: string): NginxReply | null {
  if (!appProc(w)) return null
  const dbUp = pgAccepting(w)
  const j = (status: number, body: unknown): NginxReply => ({ status, body: JSON.stringify(body) })
  if (path === '/') return j(200, { service: 'shop-app', version: '1.0.0' })
  if (path === '/api/health' || path === '/actuator/health') return dbUp ? j(200, { status: 'UP' }) : j(503, { status: 'DOWN' })
  if (path === '/api/orders') return dbUp ? j(200, ORDERS) : j(500, { timestamp: new Date(T0 * 1000).toISOString(), status: 500, error: 'Internal Server Error', path })
  return j(404, { timestamp: new Date(w.clock * 1000).toISOString(), status: 404, error: 'Not Found', path })
}

export function httpRequest(w: World, from: 'local' | 'remote', rawUrl: string): HttpResult {
  const m = /^(?:(https?):\/\/)?([^/:]+)(?::(\d+))?(\/.*)?$/.exec(rawUrl)
  if (!m) return { kind: 'fail', code: 3, msg: 'curl: (3) URL using bad/illegal format or missing URL' }
  const https = m[1] === 'https'
  const host = m[2], port = Number(m[3] ?? (https ? 443 : 80)), path = m[4] ?? '/'
  const isLoop = host === 'localhost' || host === '127.0.0.1'
  if (!isLoop && !SERVER_HOSTS.includes(host)) return { kind: 'fail', code: 6, msg: `curl: (6) Could not resolve host: ${host}` }
  const toServer = SERVER_HOSTS.includes(host) || (isLoop && from === 'remote')
  const refused = (): HttpResult => ({ kind: 'fail', code: 7, msg: `curl: (7) Failed to connect to ${host} port ${port} after ${toServer ? 0 : 31} ms: Connection refused` })
  if (!toServer) return refused()                       // `localhost` on the laptop is the laptop: nothing listens there
  if (serverDown(w)) return { kind: 'fail', code: 7, msg: `curl: (7) Failed to connect to ${host} port ${port} after 28 ms: Connection refused` }
  if (from === 'local' && ufwBlocks(w, port)) return { kind: 'fail', code: 28, msg: `curl: (28) Failed to connect to ${host} port ${port} after 130002 ms: Connection timed out` }
  const date = `Date: ${longDate(w.clock)}`
  if (port === 8080) {
    const r = appReply(w, path)
    if (!r) return refused()
    return { kind: 'ok', status: r.status, body: r.body, proto: 'HTTP/1.1', headers: ['Content-Type: application/json', `Content-Length: ${r.body.length}`, date] }
  }
  if ((port === 80 || port === 443) && listensOn(w, port)) {
    if (port === 443 && !https) return { kind: 'ok', status: 400, proto: 'HTTP/1.1', body: '400 The plain HTTP request was sent to HTTPS port', headers: [`Server: ${NGINX_VERSION}`, date] }
    if (port === 80 && https) return { kind: 'fail', code: 35, msg: 'curl: (35) error:1408F10B:SSL routines:ssl3_get_record:wrong version number' }
    if (https && host !== DOMAIN) return { kind: 'fail', code: 60, msg: `curl: (60) SSL: no alternative certificate subject name matches target host name '${host}'` }
    const r = nginxRoute(w, port, host, path, (p) => appReply(w, p))
    const ct = r.body.startsWith('{') || r.body.startsWith('[') ? 'application/json' : 'text/html'
    const h2 = https
    const hd = [`server: ${NGINX_VERSION}`, `date: ${longDate(w.clock)}`, `content-type: ${ct}`, `content-length: ${r.body.length}`, ...(r.location ? [`location: ${r.location}`] : [])]
    return { kind: 'ok', status: r.status, body: r.body, proto: h2 ? 'HTTP/2' : 'HTTP/1.1', location: r.location, headers: h2 ? hd : hd.map((l) => l.replace(/^([a-z-]+):/, (_, k: string) => k.split('-').map((x) => x[0].toUpperCase() + x.slice(1)).join('-') + ':')) }
  }
  return refused()
}
