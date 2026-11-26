// The Stage 2 starting world and the "fully hardened" baseline that every Stage 2 chaos lab assumes.
import { certbotRun, installNginx, nginxReload, nginxStart, SITES_AVAILABLE, SITES_ENABLED } from './nginx'
import { daemonReload, enableUnit, startUnit, stopUnit, unitPath } from './systemd'
import { mkdirp, writeFile } from './fs'
import { APP_DIR, fastForward, killProc, PG_CONF, pgConfListen, startPostgresProcs, syncWorld, type World } from './world'

export const UNIT_FILE = `[Unit]
Description=Shop Spring Boot App
After=network.target postgresql.service

[Service]
User=ubuntu
WorkingDirectory=/opt/myapp
EnvironmentFile=/etc/springboot.env
ExecStart=/usr/bin/java -jar /opt/myapp/app.jar
SuccessExitStatus=143
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
`

export const ENV_FILE = `DB_URL=jdbc:postgresql://localhost:5432/shopdb
DB_USER=shopuser
DB_PASSWORD=ShopPass123!
`

export const SITE_FILE = `server {
    listen 80;
    server_name shop.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
`

/** The new build reads its secrets from environment variables: the first fix for Stage 1's "password inside the jar" (P1.4). */
export const PROPS_STAGE2 = `# Spring Boot settings: secrets now come from the environment, not from this file
server.port=8080
spring.datasource.url=\${DB_URL}
spring.datasource.username=\${DB_USER}
spring.datasource.password=\${DB_PASSWORD}
spring.jpa.hibernate.ddl-auto=update
management.endpoints.web.exposure.include=health
`

/** Where a learner arrives after Stage 1: database and jar are in place, nothing is running, nothing is hardened. */
export function enterStage2(w: World) {
  fastForward(w, 'provisioned')
  w.x.apt.updated = true
  const f = w.fs.remote[`${APP_DIR}/application.properties`]
  if (f) w.fs.remote[`${APP_DIR}/application.properties`] = { ...f, content: PROPS_STAGE2, size: PROPS_STAGE2.length, mtime: w.clock }
  for (const p of w.procs.filter((q) => q.kind === 'app')) killProc(w, p.pid, 'stopped')
  w.x.app.lastExit = 'none'; w.x.app.everStarted = false
  w.state.stage = 2
}

/** Everything the labs build, done: env file, systemd service, nginx + TLS, UFW with 22/80/443. Chaos labs break exactly one piece of this. */
export function fullyHardened(w: World) {
  enterStage2(w)
  const r = w.fs.remote
  // PostgreSQL healthy
  const conf = r[PG_CONF]
  if (conf?.content && pgConfListen(w) !== 'localhost') r[PG_CONF] = { ...conf, content: conf.content.replace(/^\s*listen_addresses\s*=.*$/gm, "#listen_addresses = 'localhost'"), mtime: w.clock }
  startPostgresProcs(w)
  // the secrets file, the service
  writeFile(r, '/etc/springboot.env', ENV_FILE, 'root', w.clock, '600')
  writeFile(r, unitPath('springboot'), UNIT_FILE, 'root', w.clock, '644')
  daemonReload(w)
  enableUnit(w, 'springboot')
  stopUnit(w, 'springboot')
  startUnit(w, 'springboot')
  // nginx: install, drop the placeholder site, add the shop site, enable, certificate
  if (!w.x.nginx.installed) { installNginx(w); w.x.apt.pkgs.push('nginx', 'certbot', 'python3-certbot-nginx') }
  delete r[`${SITES_ENABLED}/default`]
  mkdirp(r, SITES_AVAILABLE, 'root', w.clock)
  writeFile(r, `${SITES_AVAILABLE}/shop`, SITE_FILE, 'root', w.clock)
  r[`${SITES_ENABLED}/shop`] = { type: 'file', mode: '777', owner: 'root', size: 0, mtime: w.clock, link: `${SITES_AVAILABLE}/shop` }
  if (!w.x.nginx.running) nginxStart(w); else nginxReload(w)
  if (!w.x.certs.includes('shop.example.com')) certbotRun(w, 'shop.example.com', false, false)
  // the guard, with the right guest list
  w.x.ufw.rules = [22, 80, 443]
  w.x.ufw.enabled = true
  syncWorld(w)
}
