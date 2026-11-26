// Stage 2: Production Linux Hardening, systemd & Nginx Reverse Proxy. Source: spec sections 2A-2D and the command encyclopedia.
import type { ChaosIncident, CourseStage, InteractiveLab, PlaygroundSpec, TopologyNode } from '../types'
import { ENV_FILE, SITE_FILE, UNIT_FILE } from '../engine/stage2world'
import { LOCAL_FS, REMOTE_FS } from './stage1'
import { validateStage } from './validate'

const SSH_RX = '^ssh\\s+(-i\\s+\\S+\\s+)?ubuntu@(203\\.0\\.113\\.10|shop\\.example\\.com)\\s*$'

export const TOPOLOGY_NODES_2: TopologyNode[] = [
  { id: 'customer', name: 'Customer browser', kind: 'laptop', x: 10, y: 16, edges: [{ to: 'nginx', protocol: 'HTTPS', port: 443, label: 'HTTPS :443' }] },
  { id: 'nginx', name: 'Nginx front desk', kind: 'proxy', x: 43, y: 16, edges: [{ to: 'app', protocol: 'HTTP', port: 8080, label: 'proxy_pass :8080' }] },
  { id: 'app', name: 'Spring Boot :8080', kind: 'app', x: 76, y: 16, edges: [{ to: 'db', protocol: 'JDBC', port: 5432, label: 'JDBC :5432' }] },
  { id: 'laptop', name: 'Your laptop', kind: 'laptop', x: 10, y: 74, edges: [{ to: 'systemd', protocol: 'SSH', port: 22, label: 'SSH :22' }] },
  { id: 'systemd', name: 'systemd manager', kind: 'ci', x: 43, y: 74, edges: [{ to: 'app', protocol: 'TCP', label: 'supervises' }] },
  { id: 'db', name: 'PostgreSQL :5432', kind: 'database', x: 76, y: 74, edges: [] },
]

export const PLAYGROUND_STAGE2: PlaygroundSpec = {
  layout: 'split-vertical',
  terminal: { shell: 'bash', supportedCommands: ['everything from Stage 1', 'systemctl', 'journalctl', 'nginx', 'ufw', 'certbot', 'ln', 'sed', 'reboot', 'nano'], filesystem: LOCAL_FS, remoteFilesystem: REMOTE_FS, editor: 'nano' },
  topology: { nodes: TOPOLOGY_NODES_2, showHealthBadges: true },
  rescueConsole: true,
}

export const LABS_2: InteractiveLab[] = [
  {
    id: 'lab-2-1', title: 'Lab 2.1 — systemd service file (the building manager\'s job description)', environment: 'terminal', estimatedMinutes: 15,
    objective: 'Hand the app to systemd so it starts at boot, restarts on failure, and keeps a logbook. Then prove it by rebooting the server.',
    steps: [
      { instruction: 'Log in to the server (the shop is the same one from Stage 1; this time its app is not running and its new build reads secrets from environment variables).', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'regex', pattern: SSH_RX }, hintAfterAttempts: 2, hintText: 'Same login as Stage 1: ssh -i KEY ubuntu@IP.' },
      { instruction: 'Create the secrets file: three lines, one per secret. Open the editor with sudo (the file lives in /etc), paste the text, press Ctrl+O to save and Ctrl+X to leave.', command: 'sudo nano /etc/springboot.env', snippet: { title: '/etc/springboot.env', text: ENV_FILE }, expectedOutput: 'cat /etc/springboot.env shows 3 lines.',
        validation: { kind: 'state-equals', pattern: 'x.d.envKeys', expected: 3 }, hintAfterAttempts: 2, hintText: 'Use the Copy button, open the editor with sudo nano, paste, then Ctrl+O to write the file.' },
      { instruction: 'Secrets are for the service only: lock the file so nobody else can read it (600 = owner can read and write, nobody else).', command: 'sudo chmod 600 /etc/springboot.env', validation: { kind: 'state-equals', pattern: 'x.d.envMode', expected: '600' }, hintAfterAttempts: 2, hintText: 'chmod 600 <the file>, with sudo because root owns it.' },
      { instruction: 'Write the building manager\'s job description for the app: a unit file.', command: 'sudo nano /etc/systemd/system/springboot.service', snippet: { title: '/etc/systemd/system/springboot.service', text: UNIT_FILE },
        validation: { kind: 'state-equals', pattern: 'x.d.unitFile', expected: 'ok' }, hintAfterAttempts: 2, hintText: 'Paste the whole snippet. ExecStart must be the java -jar line.' },
      { instruction: 'Tell systemd to re-read its files. No output means success.', command: 'sudo systemctl daemon-reload', validation: { kind: 'regex', pattern: '^sudo\\s+systemctl\\s+daemon-reload\\s*$' }, hintAfterAttempts: 2, hintText: 'sudo systemctl daemon-reload' },
      { instruction: 'Switch it on for every boot and start it right now.', command: 'sudo systemctl enable --now springboot', expectedOutput: 'Created symlink /etc/systemd/system/multi-user.target.wants/springboot.service',
        validation: { kind: 'output-contains-all', args: ['Created symlink', 'springboot.service'] }, hintAfterAttempts: 2, hintText: '`enable` means "start at every boot", `--now` also starts it immediately.' },
      { instruction: 'Ask the manager how the app is doing.', command: 'systemctl status springboot', expectedOutput: 'Active: active (running)',
        validation: { kind: 'output-contains-all', args: ['springboot.service - Shop Spring Boot App', 'active (running)'] }, hintAfterAttempts: 2, hintText: 'systemctl status <service>. If it says activating or failed, read the journal lines at the bottom.' },
      { instruction: 'The big test: pull the plug. Reboot the server and touch nothing else.', command: 'sudo reboot', validation: { kind: 'regex', pattern: '^(sudo\\s+)?(reboot|shutdown\\s+-r\\s+now)\\s*$' }, hintAfterAttempts: 2, hintText: 'sudo reboot. Your connection will drop: that is expected.' },
      { instruction: 'Wait a few seconds (try `sleep 20`), then log in again.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'regex', pattern: SSH_RX }, hintAfterAttempts: 3, hintText: 'A real server needs 30 to 60 seconds to boot. If you see "Connection refused", wait and retry.' },
      { instruction: 'Without starting anything yourself, ask the app whether it is alive. The generator worked while you slept.', command: 'curl localhost:8080/api/health', expectedOutput: '{"status":"UP"}',
        validation: { kind: 'output-contains-all', args: ['"status":"UP"'] }, hintAfterAttempts: 2, hintText: 'curl http://localhost:8080/api/health' },
      { instruction: 'Read the logbook live. Ctrl+C only stops you from watching: the app keeps running.', command: 'journalctl -u springboot -f', validation: { kind: 'regex', pattern: '^(sudo\\s+)?journalctl\\b(?=.*-u\\s+springboot)(?=.*-f).*$' }, hintAfterAttempts: 2, hintText: 'journalctl -u <service> -f follows one service\'s log.' },
    ],
  },
  {
    id: 'lab-2-2', title: 'Lab 2.2 — Nginx reverse proxy (hire the receptionist)', environment: 'terminal', estimatedMinutes: 15,
    objective: 'Put a receptionist on doors 80 and 443 so visitors never need to know the kitchen\'s extension, and give her an HTTPS badge.',
    steps: [
      { instruction: 'Hire the receptionist: install nginx on the server.', command: 'sudo apt install -y nginx', expectedOutput: 'Setting up nginx ...', validation: { kind: 'output-contains-all', args: ['Setting up nginx'] }, hintAfterAttempts: 2, hintText: 'You must be on the server prompt (ubuntu@shop-server) and use sudo.' },
      { instruction: 'Visit the front desk with no port number. A fresh receptionist greets everybody with a placeholder page.', command: 'curl http://203.0.113.10', expectedOutput: 'Welcome to nginx!', validation: { kind: 'output-contains-all', args: ['Welcome to nginx!'] }, hintAfterAttempts: 2, hintText: 'curl http://203.0.113.10 (no :8080 this time).' },
      { instruction: 'Write the receptionist\'s instructions: send every visitor to the kitchen at extension 8080. Paste this into a new site file.', command: 'sudo nano /etc/nginx/sites-available/shop', snippet: { title: '/etc/nginx/sites-available/shop', text: SITE_FILE },
        validation: { kind: 'state-equals', pattern: 'x.d.siteFile', expected: 'ok' }, hintAfterAttempts: 2, hintText: 'sites-available is the drawer of drafts. Paste the whole server { ... } block.' },
      { instruction: 'Send the placeholder page home. Visitors who do not match any server_name get the default site, so it would hide yours.', command: 'sudo rm /etc/nginx/sites-enabled/default', validation: { kind: 'state-equals', pattern: 'x.d.defaultSiteEnabled', expected: false }, hintAfterAttempts: 2, hintText: 'sites-enabled holds shortcuts to the sites that are live. Remove the one called default.' },
      { instruction: 'Put your site live: link the draft into sites-enabled.', command: 'sudo ln -s /etc/nginx/sites-available/shop /etc/nginx/sites-enabled/', validation: { kind: 'file-exists', args: ['/etc/nginx/sites-enabled/shop', 'remote'] }, hintAfterAttempts: 2, hintText: 'ln -s TARGET LINKFOLDER makes a shortcut.' },
      { instruction: 'Always check the instructions before the receptionist reads them.', command: 'sudo nginx -t', expectedOutput: 'syntax is ok / test is successful', validation: { kind: 'output-contains-all', args: ['syntax is ok', 'test is successful'] }, hintAfterAttempts: 2, hintText: 'nginx -t tests the configuration. It needs sudo.' },
      { instruction: 'Hand her the new instructions without closing the desk.', command: 'sudo systemctl reload nginx', validation: { kind: 'regex', pattern: '^sudo\\s+systemctl\\s+reload\\s+nginx\\s*$' }, hintAfterAttempts: 2, hintText: '`reload` re-reads the settings without dropping visitors. `restart` would close the desk first.' },
      { instruction: 'Be a visitor: open a laptop tab (+) and ask for the health page with no port number.', command: 'curl http://203.0.113.10/api/health', expectedOutput: '{"status":"UP"}', validation: { kind: 'output-contains-all', args: ['"status":"UP"'] }, hintAfterAttempts: 2, hintText: 'No :8080. The receptionist forwards you inside.' },
      { instruction: 'Get the free HTTPS badge. (The labs pretend shop.example.com points at your server.)', command: 'sudo apt install -y certbot python3-certbot-nginx && sudo certbot --nginx -d shop.example.com', expectedOutput: 'Successfully received certificate.', validation: { kind: 'output-contains-all', args: ['Successfully received certificate'] }, hintAfterAttempts: 2, hintText: 'On the server prompt: install certbot, then run certbot with --nginx -d and the domain.' },
      { instruction: 'Check the padlock from outside (laptop tab). HTTP/2 is what a secure site speaks.', command: 'curl -I https://shop.example.com', expectedOutput: 'HTTP/2 200', validation: { kind: 'output-contains-all', args: ['HTTP/2 200'] }, hintAfterAttempts: 2, hintText: 'curl -I asks only for the headers.' },
    ],
  },
  {
    id: 'lab-2-3', title: 'Lab 2.3 — UFW guest list (the security guard)', environment: 'terminal', estimatedMinutes: 8,
    objective: 'Close the staff-only doors (8080 and 5432) to strangers, without locking yourself out.',
    steps: [
      { instruction: 'On the server, write the guest list FIRST: doors 22 (walkie-talkie), 80 and 443 (front desk).', command: 'sudo ufw allow 22,80,443/tcp', expectedOutput: 'Rule added', validation: { kind: 'output-contains-all', args: ['Rule added'] }, hintAfterAttempts: 2, hintText: 'ufw allow PORT[,PORT]/tcp. Put door 22 on the list before anything else.' },
      { instruction: 'Now switch the guard on.', command: 'sudo ufw enable', expectedOutput: 'Firewall is active and enabled on system startup', validation: { kind: 'output-contains-all', args: ['Firewall is active and enabled on system startup'] }, hintAfterAttempts: 2, hintText: 'sudo ufw enable' },
      { instruction: 'Read the list the guard is holding.', command: 'sudo ufw status numbered', validation: { kind: 'output-contains-all', args: ['22/tcp', '80/tcp', '443/tcp'] }, hintAfterAttempts: 2, hintText: 'ufw status numbered lists each rule. 8080 and 5432 are missing on purpose: not on the list means turned away.' },
      { instruction: 'From outside (laptop tab), knock on the staff door.', command: 'curl http://203.0.113.10:8080/api/health', expectedOutput: 'Connection timed out', validation: { kind: 'output-contains-all', args: ['timed out'] }, hintAfterAttempts: 2, hintText: 'Use a laptop prompt (learner@laptop). A timeout, not "refused", means a firewall is silently dropping you.' },
    ],
  },
]

export const CHAOS_2: ChaosIncident[] = [
  {
    id: 'chaos-2-1', title: 'The Receptionist Phones an Empty Cabin', injectionScript: 'nginxWrongUpstream(8088)',
    symptom: 'Visitors see 502 Bad Gateway, an nginx error page, even though the shop was fine a minute ago.',
    imagineAnalogy: 'The receptionist dials extension 8080, but the Java kitchen\'s phone line is dead (the app crashed), or the receptionist\'s phonebook says extension 8088 while the kitchen listens on 8080 (wrong proxy_pass port). Either way she tells visitors "I could not reach the kitchen": that is a 502.',
    diagnosticTrail: [
      { instruction: 'On the server, ask the front desk for just the headers.', command: 'curl -I http://localhost', validation: { kind: 'output-contains-all', args: ['502 Bad Gateway'] }, hintAfterAttempts: 2, hintText: 'You need the server prompt. A 502 comes from nginx, not from the app.' },
      { instruction: 'Skip the receptionist and knock on the kitchen door directly. Is the app alive?', command: 'curl -I http://127.0.0.1:8080', validation: { kind: 'output-contains-all', args: ['200 OK'] }, hintAfterAttempts: 2, hintText: 'If this works, the kitchen is fine and the phonebook is wrong.' },
      { instruction: 'Read the receptionist\'s phonebook entry.', command: 'grep proxy_pass /etc/nginx/sites-available/shop', validation: { kind: 'output-contains-all', args: ['8088'] }, hintAfterAttempts: 2, hintText: 'grep PATTERN FILE prints the matching lines.' },
    ],
    exactFix: [
      { instruction: 'Correct the port in the site file (8088 should be 8080).', command: 'sudo nano /etc/nginx/sites-available/shop', validation: { kind: 'state-equals', pattern: 'x.d.siteFile', expected: 'ok' }, hintAfterAttempts: 2, hintText: 'Change :8088 to :8080 in the proxy_pass line. Or: sudo sed -i s/8088/8080/ /etc/nginx/sites-available/shop' },
      { instruction: 'Test, then reload (never restart a live front desk).', command: 'sudo nginx -t && sudo systemctl reload nginx', validation: { kind: 'sequence', args: ['nginx\\s+-t', 'systemctl\\s+reload\\s+nginx'] }, hintAfterAttempts: 2, hintText: 'sudo nginx -t && sudo systemctl reload nginx' },
      { instruction: 'Confirm the front desk works again.', command: 'curl -I http://localhost', validation: { kind: 'output-contains-all', args: ['200 OK'] }, hintAfterAttempts: 2, hintText: 'curl -I http://localhost' },
    ],
    lesson: '502 means nginx is fine but its upstream is not answering. Check the kitchen directly (curl 127.0.0.1:8080). If the app is down, fix it and restart the service; if the port is wrong, fix proxy_pass, nginx -t, reload.',
    relatedScenarios: ['BF-11', 'BF-14', 'BF-16'],
  },
  {
    id: 'chaos-2-2', title: 'The Overzealous Guard Locked Everyone Out', injectionScript: 'ufwLockout()',
    symptom: 'After enabling the firewall, nothing new gets in. Even SSH times out. (A real-world classic.)',
    imagineAnalogy: 'The new security guard was told "deny anyone not on the list", but nobody put door 22 (the walkie-talkie) on the list. The boss is now locked outside his own building.',
    diagnosticTrail: [
      { instruction: 'In a laptop tab, try to log in.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'output-contains-all', args: ['timed out'] }, hintAfterAttempts: 2, hintText: 'Use a learner@laptop prompt. A timeout (not "refused") points at a firewall.' },
      { instruction: 'Use the hosting company\'s rescue console (button above the terminal: it works without the network), then read the guard\'s list.', command: 'sudo ufw status', validation: { kind: 'output-contains-all', args: ['Status: active'] }, hintAfterAttempts: 2, hintText: 'Press "Rescue console", then type the command there. Notice that 22 is missing from the list.' },
    ],
    exactFix: [
      { instruction: 'Put door 22 on the list.', command: 'sudo ufw allow 22/tcp', validation: { kind: 'output-contains-all', args: ['Rule added'] }, hintAfterAttempts: 2, hintText: 'sudo ufw allow 22/tcp' },
      { instruction: 'Make the guard re-read the list.', command: 'sudo ufw reload', validation: { kind: 'output-contains-all', args: ['Firewall reloaded'] }, hintAfterAttempts: 2, hintText: 'sudo ufw reload' },
      { instruction: 'In a laptop tab, prove you can get back in.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'regex', pattern: SSH_RX }, hintAfterAttempts: 2, hintText: 'Same login command as always.' },
    ],
    lesson: 'Always `ufw allow 22` BEFORE `ufw enable`. And know where your provider\'s rescue console is before you need it.',
    relatedScenarios: ['BF-12'],
  },
  {
    id: 'chaos-2-3', title: 'The Manager Restarting a Stalled Employee Forever', injectionScript: 'missingEnvFile()',
    symptom: 'systemctl status springboot flaps between activating and failed. The log repeats every few seconds. The app never stays up.',
    imagineAnalogy: 'The building manager tells the chef "if the oven won\'t light, keep retrying every 5 seconds", but the gas valve was never opened. The oven can never light, so the chef retries forever. The missing gas is the environment file: the service file points at /etc/springboot.env, but the file is gone.',
    diagnosticTrail: [
      { instruction: 'On the server, ask the manager for a status report.', command: 'systemctl status springboot', validation: { kind: 'output-contains-all', args: ['activating (auto-restart)'] }, hintAfterAttempts: 2, hintText: 'You need the server prompt (ssh in first if you are on the laptop).' },
      { instruction: 'Read the last 30 lines of the logbook.', command: 'journalctl -u springboot -n 30 --no-pager', validation: { kind: 'output-contains-all', args: ['environment files'] }, hintAfterAttempts: 2, hintText: 'journalctl -u springboot -n 30 --no-pager. Look for the line about environment files.' },
    ],
    exactFix: [
      { instruction: 'Recreate the secrets file with the three variables.', command: 'sudo nano /etc/springboot.env', snippet: { title: '/etc/springboot.env', text: ENV_FILE }, validation: { kind: 'state-equals', pattern: 'x.d.envKeys', expected: 3 }, hintAfterAttempts: 2, hintText: 'Paste the snippet, Ctrl+O, Ctrl+X.' },
      { instruction: 'Lock it down again.', command: 'sudo chmod 600 /etc/springboot.env', validation: { kind: 'state-equals', pattern: 'x.d.envMode', expected: '600' }, hintAfterAttempts: 2, hintText: 'sudo chmod 600 /etc/springboot.env' },
      { instruction: 'Restart the service.', command: 'sudo systemctl restart springboot', validation: { kind: 'process-running', pattern: 'java -jar /opt/myapp/app\\.jar' }, hintAfterAttempts: 2, hintText: 'sudo systemctl restart springboot' },
      { instruction: 'Confirm it stays up.', command: 'systemctl status springboot', validation: { kind: 'output-contains-all', args: ['active (running)'] }, hintAfterAttempts: 2, hintText: 'systemctl status springboot' },
    ],
    lesson: 'Restart=on-failure retries forever, so a missing file never fixes itself. When a service flaps, read the journal (journalctl -u) before touching anything.',
    relatedScenarios: ['BF-13'],
  },
]

export const STAGE_2: CourseStage = {
  id: 'stage-2-systemd-nginx', number: 2, title: 'Production Linux Hardening, systemd & Nginx', eraName: 'The Receptionist & Backup Generator',
  imagineCard: {
    headline: 'The Receptionist and the Backup Generator',
    analogy: [
      'Imagine your little shop has grown into a busy office building.',
      'systemd is the building\'s automatic backup generator and building manager. When the city\'s power flickers (the server reboots), the generator kicks in within seconds and every office light comes back on in the right order. Nobody has to run around with a flashlight. systemd also keeps a logbook of everything (journalctl).',
      'Nginx is the receptionist at the front desk (doors 80 and 443). Visitors never wander the hallways. They hand their request to the receptionist, who checks ID and SSL badge, then phones the right internal cabin, your Java kitchen at extension 8080, and relays the answer back. Strangers never learn the internal extension numbers.',
      'The UFW firewall is the security guard with a guest list: only doors 22 (walkie-talkie), 80 and 443 (front desk) may be used. Doors 8080 and 5432 are now staff-only doors, chained from the inside.',
      'Certbot and Let\'s Encrypt are the free government ID badge printer: they give your receptionist an official HTTPS badge so visitors trust the front desk.',
    ].join('\n\n'),
    mappingTable: {
      id: 'stage2-imagine-map', title: 'The office building, translated', columns: ['Concept', 'In the Analogy'],
      rows: [
        ['systemd + springboot.service', 'The backup generator and building manager (job description = the unit file)'],
        ['journalctl', 'The building\'s logbook'],
        ['/etc/springboot.env', 'A sealed envelope of secrets, readable only by the manager (chmod 600)'],
        ['Nginx (ports 80 and 443)', 'The receptionist at the front desk'],
        ['proxy_pass to 127.0.0.1:8080', 'Her phonebook entry for the Java kitchen\'s extension'],
        ['UFW', 'The security guard with a guest list'],
        ['Certbot / HTTPS', 'The free government ID badge printer'],
        ['502 Bad Gateway', '"I called the kitchen and nobody picked up"'],
      ],
    },
    illustrationPrompt: 'Warm flat illustration of a small office building at night. A friendly receptionist at a lit front desk with doors labelled 80 and 443, a green backup generator humming beside the building with a logbook on top, a security guard holding a clipboard guest list at the gate, and two chained side doors labelled 8080 and 5432. Pastel, friendly, no text other than the door numbers.',
  },
  architectureFlow: [
    {
      id: 'stage-2-flow', kind: 'ascii', title: 'Stage 2 request flow', caption: 'Visitors only ever meet the front desk. The kitchen and stockroom doors are chained from the inside.',
      highlightedPorts: [22, 80, 443, 8080, 5432], highlightedProtocols: ['HTTPS', 'HTTP', 'JDBC', 'SSH'],
      asciiArt: `Customer Browser ──HTTPS :443──▶ ┌────────────────── VPS ───────────────────────┐
  (padlock 🔒)                    │  Nginx front desk :443 (TLS terminated here) │
                                  │      │ proxy_pass http://127.0.0.1:8080      │
                                  │      ▼                                       │
                                  │  systemd ┌──────────────────────────────┐    │
                                  │  manager │ springboot.service           │    │
                                  │  restarts│  └─ java -jar /opt/myapp/... │    │
                                  │  on boot └───────────┬──────────────────┘    │
                                  │  journalctl -u       │ JDBC :5432            │
                                  │  springboot          ▼ (loopback only)       │
                                  │            ┌──────────────┐                  │
                                  │            │ PostgreSQL   │                  │
                                  │            │ socket 5432  │                  │
                                  │            └──────────────┘                  │
                                  │  UFW: ALLOW 22,80,443 / DENY 8080,5432       │
                                  └──────────────────────────────────────────────┘`,
    },
    {
      id: 'stage-2-mermaid', kind: 'mermaid-flowchart', title: 'Stage 2 as a flowchart', highlightedPorts: [22, 80, 443, 8080, 5432],
      mermaidCode: `flowchart LR
    U[Customer] -- "HTTPS :443" --> N[Nginx :443<br/>TLS + receptionist]
    N -- "proxy_pass HTTP :8080 loopback" --> J[Spring Boot JVM]
    S[systemd manager<br/>auto-restart + journalctl] -. supervises .-> J
    J -- "JDBC :5432 loopback" --> DB[(PostgreSQL)]
    FW[UFW guard list<br/>22 80 443 only] -. protects .-> N`,
      asciiArt: `Customer ──HTTPS :443──▶ Nginx ──proxy_pass :8080──▶ Spring Boot ──JDBC :5432──▶ PostgreSQL
systemd ─ supervises ─▶ Spring Boot      UFW allows only 22, 80, 443`,
    },
    {
      id: 'stage-2-before-after', kind: 'before-after-diff', title: 'What changed since Stage 1', caption: 'Each box on the right fixes a pain from Stage 1.',
      beforeAscii: `BEFORE (Stage 1)
┌──────────────────────────┐
│ Customer ──:8080────▶    │
│   java (dies on reboot)  │
│   nohup hack             │
│ password in jar          │
│ DB :5432 open to world   │
└──────────────────────────┘`,
      afterAscii: `AFTER (Stage 2)
┌──────────────────────────────────┐
│ Customer ──:443 HTTPS──▶        │
│   Nginx receptionist           │
│      └──▶ :8080 java           │
│   systemd auto-restart on boot │
│   UFW firewall, .env secrets   │
└──────────────────────────────────┘`,
    },
  ],
  labs: LABS_2,
  extraTables: [
    {
      id: 'stage2-command-map', title: 'The Stage 2 toolbox in plain English', columns: ['Command', 'What it does', 'Trap'],
      rows: [
        ['sudo systemctl daemon-reload', 'Make systemd re-read its files.', 'Forget it after editing a service file and the old version keeps running.'],
        ['sudo systemctl enable --now springboot', 'Start at every boot, and start it right now.', 'enable alone does not start it today.'],
        ['systemctl status springboot', 'How is the service doing, and what did it last say?', 'Read the log lines at the bottom: they hold the cause.'],
        ['journalctl -u springboot -n 50 --no-pager', 'The service\'s logbook, last 50 lines.', 'Add -f to follow live; Ctrl+C stops watching, not the app.'],
        ['sudo nginx -t', 'Test the receptionist\'s instructions.', 'Always run it before reload.'],
        ['sudo systemctl reload nginx', 'Apply new instructions without dropping visitors.', 'restart closes the desk first: a broken file means downtime.'],
        ['sudo ufw allow 22,80,443/tcp', 'Put doors on the guest list.', 'Do this BEFORE ufw enable or you lock yourself out.'],
        ['sudo certbot --nginx -d shop.example.com', 'Get and install a free HTTPS certificate.', 'Port 80 must be reachable from the internet while it runs.'],
      ],
    },
  ],
  chaosLabs: CHAOS_2,
  painPointTable: {
    id: 'stage2-pain', title: 'Pain points that unlock Stage 3', columns: ['#', 'Pain', 'Root Cause', 'Why Stage 2 Still Isn\'t Enough'],
    rows: [
      ['P2.1', 'Deploy = stop service (dropped requests), upload, start. Users see errors mid-deploy.', 'Single app.jar path; no version folders, no atomic swap.', 'No zero-downtime releases.'],
      ['P2.2', '20 commands per deploy; one typo in the systemctl restart sequence wastes half an hour.', 'Humans execute runbooks by hand.', 'No automation, no idempotency.'],
      ['P2.3', 'Disk alert at 2 AM: app.log is 40 GB; nobody rotated logs.', 'No logrotate, no backup automation.', 'No data-safety routine.'],
      ['P2.4', '"Worked on my Mac (Java 21), crashes on server (Java 17)" after a teammate\'s local build was uploaded.', 'Uncontrolled build environments.', 'No immutable artifact discipline.'],
    ],
  },
  cheatSheet: {
    id: 'stage2-cheatsheet', title: 'Stage 2 cheat sheet: files, ports and states', columns: ['Item', 'What it is (plain English)', 'Where you see it', 'Trap'],
    rows: [
      ['/etc/systemd/system/springboot.service', 'The building manager\'s job description for the app.', 'sudo nano, then daemon-reload', 'Edits do nothing until daemon-reload.'],
      ['/etc/springboot.env', 'The sealed envelope of secrets the service reads.', 'EnvironmentFile= in the unit file', 'chmod 600. If missing, the service loops forever.'],
      ['Restart=on-failure, RestartSec=5', 'Retry on crash, five seconds apart.', 'systemctl status: activating (auto-restart)', 'A permanent cause means a permanent loop.'],
      ['SuccessExitStatus=143', 'Treat a polite stop (SIGTERM) as success.', 'kill PID versus kill -9 PID', 'Without it, a normal stop looks like a failure.'],
      ['/etc/nginx/sites-available vs sites-enabled', 'The drawer of drafts vs the shortcuts that are live.', 'ln -s to enable', 'Unmatched visitors get the default site.'],
      ['proxy_pass http://127.0.0.1:8080;', 'The receptionist\'s phonebook entry.', 'The site file', 'Wrong port = 502.'],
      ['ufw allow 22 before ufw enable', 'Guest list first, guard second.', 'ufw status numbered', 'Reverse the order and you are locked out.'],
      ['Ports 80 / 443 / 8080 / 5432', 'Front desk (plain / secure), kitchen, stockroom.', 'ss -tlnp', 'Only 22, 80, 443 face the internet now.'],
    ],
  },
  unlockGate: {
    description: 'To open Stage 3: finish all three labs, reproduce and fix Chaos 2.1 (the 502), pass the quiz, and show from your laptop that the front desk answers while the kitchen door is closed.',
    requiredLabIds: LABS_2.map((l) => l.id),
    requiredChaosIds: ['chaos-2-1'],
    checks: [
      { id: 'gate-front-desk', label: 'From a laptop tab: curl the health page through the front desk (no :8080) and get {"status":"UP"}', commandPattern: '^curl\\s+(?!.*:8080)(-\\S+\\s+)*https?://(203\\.0\\.113\\.10|shop\\.example\\.com)/api/health\\s*$', rule: { kind: 'output-contains-all', args: ['"status":"UP"'] } },
      { id: 'gate-door-8080', label: 'From a laptop tab: knock on port 8080 directly and time out', commandPattern: '^curl\\s.*203\\.0\\.113\\.10:8080', rule: { kind: 'output-contains-all', args: ['timed out'] } },
    ],
    quiz: {
      id: 'quiz-2', title: 'Stage 2 check-in', passMark: 0.8,
      questions: [
        { id: 'q1', prompt: 'What does `systemctl enable --now springboot` do?', options: ['Deletes the service', 'Starts it at every boot and starts it right now', 'Only starts it today', 'Edits the unit file'], answerIndex: 1, explanation: 'enable creates the boot-time link; --now also starts it immediately.' },
        { id: 'q2', prompt: 'Which order avoids locking yourself out of the server?', options: ['ufw enable, then ufw allow 22', 'ufw allow 22, then ufw enable', 'Reboot, then ufw enable', 'It does not matter'], answerIndex: 1, explanation: 'Put the guest list together first. A guard with an empty list turns everyone away, including you.' },
        { id: 'q3', prompt: 'Visitors see "502 Bad Gateway". What does that tell you?', options: ['nginx is not installed', 'nginx works, but the upstream app is not answering where it expects', 'The certificate expired', 'The firewall blocked port 22'], answerIndex: 1, explanation: 'A 502 is nginx saying it could not get an answer from the service behind it.' },
        { id: 'q4', prompt: 'Why `reload` instead of `restart` for nginx?', options: ['reload is faster to type', 'reload keeps serving visitors and keeps the old working config if the new one is broken', 'restart deletes the logs', 'There is no difference'], answerIndex: 1, explanation: 'restart stops nginx first: a broken file then means no front desk at all.' },
        { id: 'q5', prompt: 'Where do the app\'s database secrets live now, and who may read them?', options: ['Inside the jar, everyone', '/etc/springboot.env, mode 600', 'In the nginx site file', 'In the browser'], answerIndex: 1, explanation: 'A root-owned file with mode 600, read by systemd and passed to the app as environment variables.' },
      ],
    },
  },
}

validateStage(STAGE_2)
