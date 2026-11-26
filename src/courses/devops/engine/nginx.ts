// nginx as a receptionist: the enabled site files are parsed (with nginx's own error wording), and a request is routed by port and Host.
import { appProc, type NginxConfig, type NginxServer, type Proc, type World } from './world'
import { mkdirp, resolveLink, writeFile } from './fs'

export const NGINX_VERSION = 'nginx/1.18.0 (Ubuntu)'
export const SITES_ENABLED = '/etc/nginx/sites-enabled'
export const SITES_AVAILABLE = '/etc/nginx/sites-available'
export const nginxVersionLine = () => `nginx version: ${NGINX_VERSION}`
export const DOMAIN = 'shop.example.com'   // the "DNS A record" every certbot lab pretends to have

export const DEFAULT_SITE = `# Default server configuration
server {
\tlisten 80 default_server;
\tlisten [::]:80 default_server;
\troot /var/www/html;
\tindex index.html index.htm index.nginx-debian.html;
\tserver_name _;
\tlocation / {
\t\ttry_files $uri $uri/ =404;
\t}
}
`

export const WELCOME_HTML = '<!DOCTYPE html>\n<html>\n<head>\n<title>Welcome to nginx!</title>\n</head>\n<body>\n<h1>Welcome to nginx!</h1>\n<p>If you see this page, the nginx web server is successfully installed and working. Further configuration is required.</p>\n</body>\n</html>'

type Tok = { t: string; line: number }
interface Node { name: string; args: string[]; line: number; children: Node[] | null }

const ARGS: Record<string, [number, number]> = {
  server: [0, 0], location: [1, 2], listen: [1, 9], server_name: [1, 99], proxy_pass: [1, 1], proxy_set_header: [2, 2], root: [1, 1], index: [1, 99],
  return: [1, 2], ssl_certificate: [1, 1], ssl_certificate_key: [1, 1], try_files: [2, 99], include: [1, 1], access_log: [1, 9], error_log: [1, 2],
  client_max_body_size: [1, 1], proxy_read_timeout: [1, 1], proxy_http_version: [1, 1], ssl_protocols: [1, 9], ssl_ciphers: [1, 1], add_header: [2, 9], rewrite: [2, 3],
}

function tokenize(text: string): Tok[] {
  const out: Tok[] = []
  let line = 1, cur = ''
  const flush = () => { if (cur) { out.push({ t: cur, line }); cur = '' } }
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '#') { flush(); while (i < text.length && text[i] !== '\n') i++; i--; continue }
    if (ch === '\n') { flush(); line++; continue }
    if (/\s/.test(ch)) { flush(); continue }
    if (ch === ';' || ch === '{' || ch === '}') { flush(); out.push({ t: ch, line }); continue }
    cur += ch
  }
  flush()
  return out
}

/** Parses one site file. Throws an nginx-style message ("unknown directive ... in FILE:LINE"). */
function parseFile(text: string, file: string): Node[] {
  const toks = tokenize(text)
  const root: Node = { name: '', args: [], line: 0, children: [] }
  const stack: Node[] = [root]
  let pending: Tok[] = []
  const E = (m: string, line: number) => new Error(`${m} in ${file}:${line}`)
  for (const k of toks) {
    if (k.t === ';' || k.t === '{') {
      if (!pending.length) throw E(`unexpected "${k.t}"`, k.line)
      const [name, ...args] = pending.map((p) => p.t)
      const known = ARGS[name] ?? (name.startsWith('ssl_') ? [1, 9] as [number, number] : null)
      if (!known) throw E(`unknown directive "${name}"`, pending[0].line)
      const block = k.t === '{'
      if (block !== (name === 'server' || name === 'location')) throw E(block ? `directive "${name}" has no opening "{"` : `directive "${name}" is not terminated by ";"`.replace('is not terminated by ";"', 'is not terminated by ";"'), pending[0].line)
      if (args.length < known[0] || args.length > known[1]) throw E(`invalid number of arguments in "${name}" directive`, pending[0].line)
      if (name === 'proxy_pass' && !/^https?:\/\/[^/\s:]+(:\d+)?(\/\S*)?$/.test(args[0])) throw E('invalid URL prefix', pending[0].line)
      const n: Node = { name, args, line: pending[0].line, children: block ? [] : null }
      stack[stack.length - 1].children!.push(n)
      if (block) stack.push(n)
      pending = []
    } else if (k.t === '}') {
      if (pending.length) throw E('unexpected "}"', k.line)
      if (stack.length === 1) throw E('unexpected "}"', k.line)
      stack.pop()
    } else pending.push(k)
  }
  if (pending.length) throw new Error(`unexpected end of file, expecting ";" or "}" in ${file}:${toks[toks.length - 1].line}`)
  if (stack.length > 1) throw new Error(`unexpected end of file, expecting "}" in ${file}:${toks[toks.length - 1]?.line ?? 1}`)
  return root.children!
}

export type ParseResult = { ok: true; config: NginxConfig; notes: string[] } | { ok: false; err: string }

/** Reads every file in sites-enabled (following symlinks) and builds the active routing table. */
export function parseNginx(w: World): ParseResult {
  const fs = w.fs.remote
  const servers: NginxServer[] = []
  const names = Object.keys(fs).filter((p) => p.startsWith(SITES_ENABLED + '/') && !p.slice(SITES_ENABLED.length + 1).includes('/')).sort()
  for (const p of names) {
    const e = resolveLink(fs, p)
    if (!e) return { ok: false, err: `[emerg] open() "${p}" failed (2: No such file or directory)` }
    let nodes: Node[]
    try { nodes = parseFile(e.content ?? '', p) } catch (err) { return { ok: false, err: `[emerg] ${(err as Error).message}` } }
    for (const s of nodes) {
      if (s.name !== 'server') continue
      const kids = s.children!
      const sv: NginxServer = { listen: [], ssl: false, names: [], defaultServer: false, proxy: null, welcome: false, redirectTo: null }
      for (const k of kids) {
        if (k.name === 'listen') {
          const m = /(\d+)$/.exec(k.args[0].replace(/^\[.*\]:/, ''))
          if (m) sv.listen.push(Number(m[1]))
          if (k.args.includes('ssl')) sv.ssl = true
          if (k.args.includes('default_server')) sv.defaultServer = true
        } else if (k.name === 'server_name') sv.names.push(...k.args)
        else if (k.name === 'root' && k.args[0] === '/var/www/html') sv.welcome = true
        else if (k.name === 'return' && k.args[0] === '301') sv.redirectTo = k.args[1] ?? null
        else if (k.name === 'ssl_certificate' && !fs[k.args[0]]) return { ok: false, err: `[emerg] cannot load certificate "${k.args[0]}": BIO_new_file() failed (SSL: error:02001002:system library:fopen:No such file or directory) in ${p}:${k.line}` }
        else if (k.name === 'location' && k.args[0] === '/') {
          for (const l of k.children!) { const m = l.name === 'proxy_pass' ? /:(\d+)/.exec(l.args[0]) : null; if (m) sv.proxy = Number(m[1]); else if (l.name === 'proxy_pass') sv.proxy = 80 }
        }
      }
      if (!sv.listen.length) sv.listen.push(80)
      servers.push(sv)
    }
  }
  return { ok: true, config: { servers }, notes: [] }
}

export function nginxTestLines(w: World, root: boolean): { ok: boolean; lines: string[] } {
  if (!root) return { ok: false, lines: ['nginx: [alert] could not open error log file: open() "/var/log/nginx/error.log" failed (13: Permission denied)', 'nginx: [warn] the "user" directive makes sense only if the master process runs with super-user privileges, ignored in /etc/nginx/nginx.conf:5', 'nginx: [emerg] open() "/run/nginx.pid" failed (13: Permission denied)', 'nginx: configuration file /etc/nginx/nginx.conf test failed'] }
  const r = parseNginx(w)
  if (!r.ok) return { ok: false, lines: [`nginx: ${r.err}`, 'nginx: configuration file /etc/nginx/nginx.conf test failed'] }
  return { ok: true, lines: ['nginx: the configuration file /etc/nginx/nginx.conf syntax is ok', 'nginx: configuration file /etc/nginx/nginx.conf test is successful'] }
}

// ---------- lifecycle ----------

export function installNginx(w: World) {
  const r = w.fs.remote
  w.x.nginx.installed = true
  mkdirp(r, SITES_AVAILABLE, 'root', w.clock); mkdirp(r, SITES_ENABLED, 'root', w.clock); mkdirp(r, '/var/www/html', 'root', w.clock); mkdirp(r, '/var/log/nginx', 'root', w.clock)
  writeFile(r, '/etc/nginx/nginx.conf', 'user www-data;\nworker_processes auto;\nhttp {\n\tinclude /etc/nginx/sites-enabled/*;\n}\n', 'root', w.clock)
  writeFile(r, `${SITES_AVAILABLE}/default`, DEFAULT_SITE, 'root', w.clock)
  r[`${SITES_ENABLED}/default`] = { type: 'file', mode: '777', owner: 'root', size: 34, mtime: w.clock, link: `${SITES_AVAILABLE}/default` }
  writeFile(r, '/var/www/html/index.nginx-debian.html', WELCOME_HTML, 'root', w.clock)
  w.x.sd.units.nginx = { enabled: true, active: 'active', result: 'success', pid: null, restarts: 0, since: w.clock, nextRestartAt: null }
  nginxStart(w)
}

export function nginxProc(w: World): Proc | undefined { return w.procs.find((p) => p.unit === 'nginx' && p.cmd.startsWith('nginx: master')) }

/** Starts the master process if the configuration is valid. Returns the error text otherwise. */
export function nginxStart(w: World): string | null {
  const r = parseNginx(w)
  if (!r.ok) { w.x.nginx.running = false; return `nginx: ${r.err}` }
  w.procs = w.procs.filter((p) => p.unit !== 'nginx')
  const mk = (pid: number, cmd: string, user: string): Proc => ({ pid, user, cmd, tty: '?', stat: 'Ss', rssKb: 6244, started: w.clock, kind: 'other', bound: null, immune: true, listens: [], unit: 'nginx' })
  w.procs.push(mk(2511, 'nginx: master process /usr/sbin/nginx -g daemon on; master_process on;', 'root'), mk(2512, 'nginx: worker process', 'www-data'))
  w.x.nginx.running = true
  w.x.nginx.loaded = r.config
  return null
}

export function nginxStop(w: World) {
  w.procs = w.procs.filter((p) => p.unit !== 'nginx')
  w.x.nginx.running = false
}

/** `reload`: validate first; a bad file leaves the old, working configuration in place (that is why reload beats restart). */
export function nginxReload(w: World): string | null {
  const r = parseNginx(w)
  if (!r.ok) return `nginx: ${r.err}`
  w.x.nginx.loaded = r.config
  return null
}

// ---------- routing ----------

export interface NginxReply { status: number; body: string; location?: string }

const page = (code: number, title: string) => `<html>\r\n<head><title>${code} ${title}</title></head>\r\n<body>\r\n<center><h1>${code} ${title}</h1></center>\r\n<hr><center>${NGINX_VERSION}</center>\r\n</body>\r\n</html>`

export function listensOn(w: World, port: number): boolean {
  return w.x.nginx.running && !!nginxProc(w) && !!w.x.nginx.loaded?.servers.some((s) => s.listen.includes(port))
}

/** Pick the server block by port + Host (server_name), else the default_server, else the first block on that port. */
export function nginxRoute(w: World, port: number, host: string, path: string, appReply: (path: string) => NginxReply | null): NginxReply {
  const cfg = w.x.nginx.loaded!
  const onPort = cfg.servers.filter((s) => s.listen.includes(port))
  const sv = onPort.find((s) => s.names.includes(host)) ?? onPort.find((s) => s.defaultServer) ?? onPort[0]
  if (sv.redirectTo) return { status: 301, body: page(301, 'Moved Permanently'), location: sv.redirectTo.replace('$host', host).replace('$request_uri', path) }
  if (sv.proxy !== null) {
    const up = sv.proxy === 8080 ? appReply(path) : null           // the only upstream that exists in this world is the app on 8080
    return up ?? { status: 502, body: page(502, 'Bad Gateway') }
  }
  if (sv.welcome) return path === '/' || path === '/index.html' ? { status: 200, body: WELCOME_HTML } : { status: 404, body: page(404, 'Not Found') }
  return { status: 404, body: page(404, 'Not Found') }
}

// ---------- certbot ----------

export function certbotRun(w: World, domain: string, redirect: boolean, ufwBlocks80: boolean): { ok: boolean; lines: string[] } {
  const L = ['Saving debug log to /var/log/letsencrypt/letsencrypt.log']
  if (domain !== DOMAIN) return { ok: false, lines: [...L, `Requesting a certificate for ${domain}`, '', 'Certbot failed to authenticate some domains (authenticator: nginx). The Certificate Authority reported these problems:', `  Domain: ${domain}`, '  Type:   dns', `  Detail: DNS problem: NXDOMAIN looking up A for ${domain} - check that a DNS record exists for this domain`, '', 'Hint: the Stage 1-2 labs pretend that shop.example.com points to 203.0.113.10. Use that name.'] }
  const cfg = parseNginx(w)
  const site = cfg.ok ? cfg.config.servers.find((s) => s.names.includes(domain)) : undefined
  if (!w.x.nginx.running) return { ok: false, lines: [...L, 'Could not find nginx running: start it first (sudo systemctl start nginx).'] }
  if (!site) return { ok: false, lines: [...L, `Requesting a certificate for ${domain}`, '', `Could not automatically find a matching server block for ${domain}. Set the \`server_name\` directive to use the Nginx installer.`] }
  if (ufwBlocks80) return { ok: false, lines: [...L, `Requesting a certificate for ${domain}`, '', 'Certbot failed to authenticate some domains (authenticator: nginx). The Certificate Authority reported these problems:', `  Domain: ${domain}`, '  Type:   connection', `  Detail: 203.0.113.10: Fetching http://${domain}/.well-known/acme-challenge/x: Timeout during connect (likely firewall problem)`, '', 'Hint: Let\'s Encrypt must reach port 80 from the internet. Open it with: sudo ufw allow 80/tcp'] }
  const r = w.fs.remote
  const dir = `/etc/letsencrypt/live/${domain}`
  mkdirp(r, dir, 'root', w.clock)
  writeFile(r, `${dir}/fullchain.pem`, '-----BEGIN CERTIFICATE-----\n(simulated)\n-----END CERTIFICATE-----\n', 'root', w.clock)
  writeFile(r, `${dir}/privkey.pem`, '-----BEGIN PRIVATE KEY-----\n(simulated)\n-----END PRIVATE KEY-----\n', 'root', w.clock, '600')
  const path = `${SITES_AVAILABLE}/shop`
  const f = r[path]
  if (f?.content && !/listen\s+443/.test(f.content)) {
    let c = f.content.replace(/(server_name[^;]*;)/, `$1\n    listen 443 ssl; # managed by Certbot\n    ssl_certificate ${dir}/fullchain.pem; # managed by Certbot\n    ssl_certificate_key ${dir}/privkey.pem; # managed by Certbot`)
    if (redirect) c += `\nserver {\n    listen 80;\n    server_name ${domain};\n    return 301 https://$host$request_uri; # managed by Certbot\n}\n`
    writeFile(r, path, c, f.owner, w.clock)
  }
  if (!w.x.certs.includes(domain)) w.x.certs.push(domain)
  const rl = nginxReload(w)
  if (rl) return { ok: false, lines: [...L, rl] }
  return { ok: true, lines: [...L, `Requesting a certificate for ${domain}`, '', 'Successfully received certificate.', `Certificate is saved at: ${dir}/fullchain.pem`, `Key is saved at:         ${dir}/privkey.pem`, 'This certificate expires on 2027-02-22.', 'These files will be updated when the certificate renews.', 'Certbot has set up a scheduled task to automatically renew this certificate in the background.', '', 'Deploying certificate', `Successfully deployed certificate for ${domain} to ${SITES_ENABLED}/shop`, `Congratulations! You have successfully enabled HTTPS on https://${domain}`] }
}

export { appProc }
