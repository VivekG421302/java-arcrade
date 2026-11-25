// Stage 1 — Manual Bare-Metal / VPS Deployment (The PuTTY & FileZilla Era). Source: spec sections 0.3, 1A-1D, 4.2, 4.3.
import type { ChaosIncident, CourseStage, InteractiveLab, PlaygroundSpec, TopologyNode, VirtualFileSystemNode } from '../types'
import { validateStage } from './validate'

const PEM_BODY = '-----BEGIN RSA PRIVATE KEY-----\nSHOP-SERVER-KEY\nMIIEowIBAAKCAQEAu3x1... (simulated key, nothing real here)\n-----END RSA PRIVATE KEY-----\n'
const PROPS = `# Spring Boot settings for the shop app (read from the folder the app is started in)
server.port=8080
spring.datasource.url=jdbc:postgresql://localhost:5432/shopdb
spring.datasource.username=shopuser
spring.datasource.password=ShopPass123!
spring.jpa.hibernate.ddl-auto=update
management.endpoints.web.exposure.include=health
`
const dir = (name: string, children: VirtualFileSystemNode[] = [], owner?: string, permissions?: string): VirtualFileSystemNode => ({ name, type: 'dir', children, owner, permissions })
const file = (name: string, content: string, permissions?: string, owner?: string): VirtualFileSystemNode => ({ name, type: 'file', content, permissions, owner })

/** Your laptop. */
export const LOCAL_FS: VirtualFileSystemNode = dir('/', [
  dir('home', [dir('learner', [
    dir('.ssh', [file('deploy.pem', PEM_BODY, '400')], 'learner', '700'),
    dir('Downloads', [], 'learner'),
    dir('shop-app', [
      file('pom.xml', '<project>\n  <groupId>com.shop</groupId>\n  <artifactId>shop-app</artifactId>\n  <version>1.0.0</version>\n  <parent>spring-boot-starter-parent 3.2.5</parent>\n  <!-- Spring Web, Spring Data JPA, PostgreSQL driver, Actuator -->\n</project>\n'),
      file('README.md', '# Shop app\nOne Spring Boot app, deployed 8 different ways in this course.\n'),
      dir('src', [dir('main', [
        dir('java', [dir('com', [dir('shop', [file('ShopApplication.java', 'package com.shop;\n\n@SpringBootApplication\npublic class ShopApplication {\n  public static void main(String[] args) { SpringApplication.run(ShopApplication.class, args); }\n}\n')])])]),
        dir('resources', [file('application.properties', PROPS)]),
      ])]),
    ], 'learner'),
  ], 'learner')], 'root'),
  dir('tmp', [], 'root', '777'),
])

/** The rented VPS: a bare Ubuntu 22.04 image, plus the /opt/myapp shelf the hosting company prepared. */
export const REMOTE_FS: VirtualFileSystemNode = dir('/', [
  dir('home', [dir('ubuntu', [file('.bashrc', '# ~/.bashrc: executed by bash for non-login shells.\n', '644', 'ubuntu'), dir('.ssh', [file('authorized_keys', 'ssh-rsa AAAAB3Nza... shop-deploy-key\n', '600', 'ubuntu')], 'ubuntu', '700')], 'ubuntu')], 'root'),
  dir('opt', [dir('myapp', [file('application.properties', PROPS, '644', 'ubuntu')], 'ubuntu', '755')], 'root'),
  dir('etc', [file('hostname', 'shop-server\n'), file('os-release', 'PRETTY_NAME="Ubuntu 22.04.4 LTS"\nNAME="Ubuntu"\nVERSION_ID="22.04"\n')], 'root'),
  dir('var', [dir('log', [])], 'root'),
  dir('tmp', [], 'root', '777'),
  dir('usr', [], 'root'),
], 'root')

const STAGE1_COMMANDS = ['ls', 'cd', 'pwd', 'cat', 'echo', 'mkdir', 'rm', 'cp', 'mv', 'chmod', 'chown', 'ps', 'kill', 'grep', 'tail', 'head', 'find', 'ssh', 'scp', 'sftp', 'curl', 'wget', 'apt', 'systemctl (PostgreSQL only)', 'java -jar', 'nohup', '&', 'ss', 'psql', 'nano', 'mvn']

export const TOPOLOGY_NODES: TopologyNode[] = [
  { id: 'customer', name: 'Customer browser', kind: 'laptop', x: 10, y: 16, edges: [{ to: 'app', protocol: 'HTTP', port: 8080, label: 'HTTP :8080' }] },
  { id: 'laptop', name: 'Your laptop', kind: 'laptop', x: 10, y: 74, edges: [{ to: 'vps', protocol: 'SSH', port: 22, label: 'SSH / SFTP :22' }] },
  { id: 'vps', name: 'VPS 203.0.113.10', kind: 'app', x: 42, y: 74, edges: [{ to: 'app', protocol: 'TCP', label: 'java -jar' }] },
  { id: 'app', name: 'Spring Boot :8080', kind: 'app', x: 76, y: 16, edges: [{ to: 'db', protocol: 'JDBC', port: 5432, label: 'JDBC :5432' }] },
  { id: 'db', name: 'PostgreSQL :5432', kind: 'database', x: 76, y: 74, edges: [] },
]

export const PLAYGROUND_STAGE1: PlaygroundSpec = {
  layout: 'split-vertical',
  terminal: { shell: 'bash', supportedCommands: STAGE1_COMMANDS, filesystem: LOCAL_FS, remoteFilesystem: REMOTE_FS, editor: 'nano' },
  topology: { nodes: TOPOLOGY_NODES, showHealthBadges: true },
}

// ---------------------------------------------------------------- labs

const SSH_RX = '^ssh\\s+(-i\\s+\\S+\\s+)?ubuntu@203\\.0\\.113\\.10\\s*$'

export const LABS: InteractiveLab[] = [
  {
    id: 'lab-1-1', title: 'Lab 1.1 — Build the artifact locally', environment: 'terminal', estimatedMinutes: 3,
    objective: 'Turn your code into one single file (a "fat jar") that contains everything needed to run the shop.',
    steps: [
      { instruction: 'You are on your laptop, inside the shop-app folder. Ask Maven (the builder) to compile and pack the code into a jar.', command: 'mvn clean package', expectedOutput: 'BUILD SUCCESS, and target/shop-app-1.0.0.jar (about 40 MB, with its own Tomcat inside) now exists.',
        validation: { kind: 'regex', pattern: '^mvn\\s+(clean\\s+)?(package|install)(\\s+-DskipTests)?\\s*$' }, hintAfterAttempts: 2, hintText: 'Maven needs two words: one to sweep away old build leftovers (clean) and one to build the jar (package).' },
      { instruction: 'Look at what the build produced: list the jar files inside the target folder, with human-friendly sizes.', command: 'ls -lh target/*.jar', expectedOutput: 'One .jar of about 40M.',
        validation: { kind: 'regex', pattern: '^ls\\s+(-\\S+\\s+)*target(/\\S*)?\\s*$' }, hintAfterAttempts: 2, hintText: '`ls` lists files, `-lh` adds details with readable sizes, and `target/*.jar` means "any jar inside target".' },
    ],
  },
  {
    id: 'lab-1-2', title: 'Lab 1.2 — FileZilla upload (the delivery van)', environment: 'filezilla-sftp', estimatedMinutes: 8,
    objective: 'Carry the jar from your laptop to a shelf in the rented shop, first by clicking (FileZilla), then by typing (scp).',
    steps: [
      { instruction: 'Open the FileZilla tab. In Quickconnect enter Host 203.0.113.10, Username ubuntu, Port 22, choose the key file deploy.pem, then press Quickconnect.', expectedOutput: 'Status: Connected to 203.0.113.10 and the right pane shows the server.',
        validation: { kind: 'state-equals', pattern: 'x.sftp.connected', expected: true }, hintAfterAttempts: 1, hintText: 'This server has no password, only a key. If FileZilla says "No supported authentication methods", you forgot to pick deploy.pem as the key file.' },
      { instruction: 'Drag shop-app-1.0.0.jar from the left pane (your laptop, target folder) onto the right pane showing /opt/myapp. On a phone, tap the file and press Upload.', expectedOutput: 'The jar shows up in /opt/myapp on the right.',
        validation: { kind: 'file-exists', args: ['/opt/myapp/shop-app-1.0.0.jar', 'remote'] }, hintAfterAttempts: 2, hintText: 'First double-click folders on the right until the path box says /opt/myapp. Then drag.' },
      { instruction: 'Rename the uploaded file to app.jar (right-click it on the right pane, Rename). A short name is easier to type at 2 AM.', expectedOutput: '/opt/myapp/app.jar exists.',
        validation: { kind: 'file-exists', args: ['/opt/myapp/app.jar', 'remote'] }, hintAfterAttempts: 2, hintText: 'Right-click the file in the RIGHT pane (the server side) and choose Rename.' },
      { instruction: 'Same delivery by typing instead of clicking: in a laptop terminal, scp the jar to the shop shelf using your key.', command: 'scp -i ~/.ssh/deploy.pem target/shop-app-1.0.0.jar ubuntu@203.0.113.10:/opt/myapp/app.jar', expectedOutput: 'A progress line ending in 100%.',
        validation: { kind: 'regex', pattern: '^scp\\s+-i\\s+\\S*deploy\\.pem\\s+target/\\S+\\.jar\\s+ubuntu@203\\.0\\.113\\.10:/opt/myapp/(app\\.jar)?\\s*$' }, hintAfterAttempts: 2, hintText: 'Pattern: scp -i KEY LOCAL_FILE user@IP:REMOTE_PATH. You must be in the laptop prompt (learner@laptop), inside shop-app.' },
      { instruction: 'Check the delivery without logging in: shout one instruction through the walkie-talkie and hang up.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10 "ls -lh /opt/myapp/app.jar"', expectedOutput: '-rw-r--r-- ... 40M ... /opt/myapp/app.jar',
        validation: { kind: 'output-contains-all', args: ['/opt/myapp/app.jar', '40M'] }, hintAfterAttempts: 2, hintText: 'Put the remote command in quotes after the user@ip part.' },
    ],
  },
  {
    id: 'lab-1-3', title: 'Lab 1.3 — PuTTY login & first reconnaissance', environment: 'terminal', estimatedMinutes: 10,
    objective: 'Log in to the empty shop through the walkie-talkie, look around, and stock the kitchen (Java) and stockroom (PostgreSQL).',
    steps: [
      { instruction: 'Log in to the server with your skeleton key. Your prompt should change from learner@laptop to ubuntu@shop-server.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', expectedOutput: 'Welcome to Ubuntu 22.04 ... prompt ubuntu@shop-server:~$',
        validation: { kind: 'regex', pattern: SSH_RX }, hintAfterAttempts: 2, hintText: 'You must show the key with -i, followed by user@address.' },
      { instruction: 'Ask the worker three questions at once: who am I, which machine is this, where am I standing?', command: 'whoami && hostname && pwd', expectedOutput: 'ubuntu / shop-server / /home/ubuntu',
        validation: { kind: 'output-contains-all', args: ['ubuntu', 'shop-server', '/home/ubuntu'] }, hintAfterAttempts: 2, hintText: '&& means "and then, if that worked". Type the three little commands joined by &&.' },
      { instruction: 'Find the shop\'s street address (IP address).', command: 'ip addr show | grep inet', expectedOutput: 'inet 203.0.113.10',
        validation: { kind: 'output-contains-all', args: ['203.0.113.10'] }, hintAfterAttempts: 2, hintText: '`ip addr show` lists network cards; the pipe | sends that list into `grep inet`, which keeps only lines with addresses.' },
      { instruction: 'Install Java in the kitchen. A brand-new server needs its package catalogue refreshed first, and changing the machine needs sudo.', command: 'sudo apt update && sudo apt install -y openjdk-17-jre-headless', expectedOutput: 'Setting up openjdk-17-jre-headless ...',
        validation: { kind: 'output-contains-all', args: ['Setting up openjdk-17-jre-headless'] }, hintAfterAttempts: 2, hintText: 'First `sudo apt update`, then `sudo apt install -y openjdk-17-jre-headless`, joined with &&.' },
      { instruction: 'Prove Java is installed by asking its version.', command: 'java -version', expectedOutput: 'openjdk version "17.0.x"',
        validation: { kind: 'output-contains-all', args: ['openjdk version "17.0'] }, hintAfterAttempts: 2, hintText: 'It is a single dash: java -version' },
      { instruction: 'Install the stockroom (PostgreSQL).', command: 'sudo apt install -y postgresql', expectedOutput: 'Setting up postgresql ...',
        validation: { kind: 'output-contains-all', args: ['Setting up postgresql'] }, hintAfterAttempts: 2, hintText: 'Same pattern as Java: sudo apt install -y <package>.' },
      { instruction: 'Check that the stockroom is open for business.', command: 'sudo systemctl status postgresql', expectedOutput: 'active (running) in green',
        validation: { kind: 'output-contains-all', args: ['active (running)'] }, hintAfterAttempts: 2, hintText: 'systemctl is the building manager\'s control panel: systemctl status <service>.' },
    ],
  },
  {
    id: 'lab-1-4', title: 'Lab 1.4 — Database user & schema creation', environment: 'terminal', estimatedMinutes: 8,
    objective: 'Give the kitchen its own key to the stockroom: a database user, a database, and permission to use it.',
    steps: [
      { instruction: 'Walk into the stockroom as its manager (the postgres user).', command: 'sudo -u postgres psql', expectedOutput: 'Prompt becomes postgres=#',
        validation: { kind: 'regex', pattern: '^sudo\\s+-u\\s+postgres\\s+psql\\s*$' }, hintAfterAttempts: 2, hintText: 'sudo -u <someone> runs a command as that someone. The program is psql.' },
      { instruction: 'Create the user the shop app will log in as.', command: "CREATE USER shopuser WITH PASSWORD 'ShopPass123!';", expectedOutput: 'CREATE ROLE',
        validation: { kind: 'regex', pattern: "^create\\s+(user|role)\\s+shopuser\\b.*password\\s+'ShopPass123!'\\s*;?$" }, hintAfterAttempts: 2, hintText: "SQL ends with a semicolon, and the password goes in single quotes: ... WITH PASSWORD 'ShopPass123!';" },
      { instruction: 'Create the shop\'s database, owned by that user.', command: 'CREATE DATABASE shopdb OWNER shopuser;', expectedOutput: 'CREATE DATABASE',
        validation: { kind: 'regex', pattern: '^create\\s+database\\s+shopdb\\s+owner\\s+shopuser\\s*;?$' }, hintAfterAttempts: 2, hintText: 'CREATE DATABASE <name> OWNER <user>;' },
      { instruction: 'Hand over all privileges on that database.', command: 'GRANT ALL PRIVILEGES ON DATABASE shopdb TO shopuser;', expectedOutput: 'GRANT',
        validation: { kind: 'regex', pattern: '^grant\\s+all(\\s+privileges)?\\s+on\\s+database\\s+shopdb\\s+to\\s+shopuser\\s*;?$' }, hintAfterAttempts: 2, hintText: 'GRANT ALL PRIVILEGES ON DATABASE <db> TO <user>;' },
      { instruction: 'Leave the stockroom.', command: '\\q', expectedOutput: 'Back at ubuntu@shop-server',
        validation: { kind: 'regex', pattern: '^\\\\q$' }, hintAfterAttempts: 1, hintText: 'The quit command starts with a backslash: \\q' },
      { instruction: 'Test the new key from the outside, over the network door (-h localhost). When it asks for the password, type ShopPass123! (the letters stay invisible, like a real server).', command: 'psql -h localhost -U shopuser -d shopdb -c "SELECT 1;"', expectedOutput: '1 row',
        validation: { kind: 'output-contains-all', args: ['(1 row)'] }, hintAfterAttempts: 2, hintText: '-h is the building, -U the user, -d the database, -c the one question to ask. Then type the password and press Enter.' },
    ],
  },
  {
    id: 'lab-1-5', title: 'Lab 1.5 — Run the app the naive way', environment: 'terminal', estimatedMinutes: 8,
    objective: 'Start the shop by hand, see it work, and notice that it is open to the whole world. This sets up the pain.',
    steps: [
      { instruction: 'Still on the server: go to the shelf and start the app in the background with &.', command: 'cd /opt/myapp && java -jar app.jar &', expectedOutput: "Tomcat started on port 8080 (http) with context path '/'",
        validation: { kind: 'process-running', pattern: 'java -jar app\\.jar' }, hintAfterAttempts: 2, hintText: 'cd to /opt/myapp first, then java -jar app.jar. The & at the end lets you keep typing while it runs.' },
      { instruction: 'Ask the kitchen if it is alive (this talks to door 8080 from inside the shop).', command: 'curl http://localhost:8080/api/health', expectedOutput: '{"status":"UP"}',
        validation: { kind: 'output-contains-all', args: ['"status":"UP"'] }, hintAfterAttempts: 2, hintText: 'curl is a tiny web browser for the terminal.' },
      { instruction: 'See who is standing at door 8080.', command: 'ss -tlnp | grep 8080', expectedOutput: 'LISTEN ... *:8080 ... users:(("java",pid=2142,...))',
        validation: { kind: 'output-contains-all', args: ['8080', 'users:(("java"'] }, hintAfterAttempts: 2, hintText: 'ss lists doors (sockets). -t TCP, -l listening, -n numbers, -p which program.' },
      { instruction: 'Now be a customer. Press + above the terminal to open a SECOND tab (that is your laptop: do NOT type exit in the PuTTY tab, you will see why in Lab 1.6) and fetch the orders from the outside.', command: 'curl http://203.0.113.10:8080/api/orders', expectedOutput: 'A JSON list of orders: the shop is open to the world!',
        validation: { kind: 'output-contains-all', args: ['Masala Chai Box'] }, hintAfterAttempts: 2, hintText: 'Your new tab starts as learner@laptop. Use the shop\'s public address instead of localhost.' },
    ],
  },
  {
    id: 'lab-1-6', title: 'Lab 1.6 — Survive the hangup: nohup', environment: 'terminal', estimatedMinutes: 6,
    objective: 'Make the app keep running after you leave, and learn that Ctrl+C only stops you from watching, not the app.',
    steps: [
      { instruction: 'Stop the app that is tied to your session. (Go back to the PuTTY tab, standing in /opt/myapp.)', command: "pkill -f 'java -jar app.jar'", expectedOutput: 'No output; the java process disappears.',
        validation: { kind: 'state-equals', pattern: 'processes.appPid', expected: 'null' }, hintAfterAttempts: 2, hintText: "pkill -f finds a process by its full command line: pkill -f 'java -jar app.jar'" },
      { instruction: 'Start it again, but tell it to ignore the hangup signal and write its log to a file.', command: 'nohup java -jar app.jar > app.log 2>&1 &', expectedOutput: '[1] 2317',
        validation: { kind: 'regex', pattern: '^(nohup|setsid)\\s+java\\s+-jar\\s+app\\.jar\\b.*&\\s*$' }, hintAfterAttempts: 2, hintText: 'You must be standing in /opt/myapp (cd /opt/myapp). nohup java -jar app.jar > app.log 2>&1 &' },
      { instruction: 'Watch the log live, then press Ctrl+C (or the Stop button) to stop watching.', command: 'tail -f app.log', expectedOutput: 'Log lines stream until you press Ctrl+C.',
        validation: { kind: 'regex', pattern: '^tail\\s+-f\\s+app\\.log\\s*$' }, hintAfterAttempts: 2, hintText: 'tail shows the end of a file; -f means "keep following it".' },
      { instruction: 'Is the app still alive after Ctrl+C?', command: 'ps aux | grep java', expectedOutput: 'The java -jar app.jar line is still there.',
        validation: { kind: 'output-contains-all', args: ['java -jar app.jar'] }, hintAfterAttempts: 2, hintText: 'ps aux lists every running program; grep java keeps the java lines.' },
    ],
  },
]

// ---------------------------------------------------------------- chaos labs

export const CHAOS: ChaosIncident[] = [
  {
    id: 'chaos-1-1', title: 'The Walkie-Talkie Ran Out of Batteries', injectionScript: "killProcessTree(appPid, signal='SIGHUP')",
    symptom: 'The app worked. You closed PuTTY. Now every request fails: curl: (7) Failed to connect ... Connection refused.',
    imagineAnalogy: 'You told the worker "keep the oven on", but the moment your walkie-talkie battery died, the worker\'s contract said "stop everything when the boss hangs up". SSH sends a hangup signal (SIGHUP) to every program started from that session, unless the program was told to ignore it.',
    diagnosticTrail: [
      { instruction: 'Reconnect to the server from a laptop prompt.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'regex', pattern: SSH_RX }, hintAfterAttempts: 2, hintText: 'Same login command as in Lab 1.3.' },
      { instruction: 'Ask the kitchen if it is alive.', command: 'curl http://localhost:8080/api/health', validation: { kind: 'output-contains-all', args: ['Connection refused'] }, hintAfterAttempts: 2, hintText: 'curl http://localhost:8080/api/health' },
      { instruction: 'Is any java program running?', command: 'ps aux | grep java', validation: { kind: 'regex', pattern: '^ps\\s+(aux|-ef|auxww)\\s*\\|\\s*grep\\s+java\\s*$' }, hintAfterAttempts: 2, hintText: 'You will only see the grep command itself: grep always finds itself. No "java -jar" line means the app is gone.' },
      { instruction: 'How did you start it last time? Search your command history.', command: "history | grep 'java -jar'", validation: { kind: 'output-contains-all', args: ['java -jar app.jar'] }, hintAfterAttempts: 2, hintText: "history lists every command you typed. Look for a java line without nohup." },
    ],
    exactFix: [
      { instruction: 'Start the app so that it ignores the hangup signal, and keep its log.', command: 'cd /opt/myapp && nohup java -jar app.jar > app.log 2>&1 &', validation: { kind: 'process-running', pattern: 'java -jar app\\.jar' }, hintAfterAttempts: 2, hintText: 'nohup in front, & at the end, from inside /opt/myapp.' },
      { instruction: 'Close and reopen the walkie-talkie: type exit, then log in again.', command: 'exit', validation: { kind: 'sequence', args: ['^exit$', '^ssh\\s'] }, hintAfterAttempts: 2, hintText: 'Type exit, then the same ssh command as before.' },
      { instruction: 'Prove the shop survived the hangup.', command: 'curl http://localhost:8080/api/health', validation: { kind: 'output-contains-all', args: ['"status":"UP"'] }, hintAfterAttempts: 2, hintText: 'If you still get Connection refused, the app did not start with nohup.' },
    ],
    lesson: 'A program started from your SSH session dies with it, unless you tell it to ignore the hangup (nohup / setsid). Stage 2 replaces this hack with a proper supervisor.',
    relatedScenarios: ['BF-01'],
  },
  {
    id: 'chaos-1-2', title: 'Two Chefs Fighting for One Kitchen Door', injectionScript: 'startZombieOnPort(8080, pid=2142)',
    symptom: 'java -jar app.jar crashes with BindException: Address already in use / Web server failed to start. Port 8080 was already in use.',
    imagineAnalogy: 'A new chef arrives and tries to hang his sign on kitchen door 8080, but the old chef\'s sign is still there. One door, one sign: Linux refuses.',
    diagnosticTrail: [
      { instruction: 'Log in to the server and try to start the app again from /opt/myapp.', command: 'cd /opt/myapp && java -jar app.jar', validation: { kind: 'output-contains-all', args: ['already in use'] }, hintAfterAttempts: 2, hintText: 'You need the PuTTY prompt (ubuntu@shop-server). Use ssh first if you are on the laptop.' },
      { instruction: 'Who is standing at door 8080?', command: 'ss -tlnp | grep 8080', validation: { kind: 'output-contains-all', args: ['pid=2142'] }, hintAfterAttempts: 2, hintText: 'ss -tlnp | grep 8080 shows the program and its pid.' },
      { instruction: 'What is that process?', command: 'ps aux | grep 2142', validation: { kind: 'output-contains-all', args: ['java -jar app.jar'] }, hintAfterAttempts: 2, hintText: 'ps aux | grep <the pid>' },
    ],
    exactFix: [
      { instruction: 'Politely ask the old chef to leave (graceful stop).', command: 'kill 2142', validation: { kind: 'regex', pattern: '^(sudo\\s+)?kill(\\s+-(9|15|KILL|TERM))?\\s+2142\\s*$' }, hintAfterAttempts: 2, hintText: 'kill <pid>. Use kill -9 only as a last resort.' },
      { instruction: 'Start the app again.', command: 'cd /opt/myapp && nohup java -jar app.jar > app.log 2>&1 &', validation: { kind: 'process-running', pattern: 'java -jar app\\.jar' }, hintAfterAttempts: 2, hintText: 'Same nohup command as before.' },
      { instruction: 'Confirm exactly one java is at the door.', command: 'ss -tlnp | grep 8080', validation: { kind: 'output-contains-all', args: ['users:(("java"'] }, hintAfterAttempts: 2, hintText: 'ss -tlnp | grep 8080' },
    ],
    lesson: 'One port, one program. When a start fails with "Address already in use", find the owner with ss -tlnp before you do anything else.',
    relatedScenarios: ['BF-02'],
  },
  {
    id: 'chaos-1-3', title: 'Knocking on the Wrong Door in the Wrong Building', injectionScript: "setPgListenAddresses('')",
    symptom: 'The app starts then dies: Connection to localhost:5432 refused. But PostgreSQL is "running".',
    imagineAnalogy: 'The kitchen staff were told to fetch stock from "the building at address localhost". But the stockroom only opens to people inside the building through a back hatch (a unix socket), not through the street door 5432.',
    diagnosticTrail: [
      { instruction: 'Is PostgreSQL running?', command: 'sudo systemctl status postgresql', validation: { kind: 'output-contains-all', args: ['active (running)'] }, hintAfterAttempts: 2, hintText: 'You need to be logged in to the server.' },
      { instruction: 'Is anything knocking-ready on door 5432?', command: 'ss -tlnp | grep 5432', validation: { kind: 'regex', pattern: '^(sudo\\s+)?ss\\s+-\\S+\\s*\\|\\s*grep\\s+5432\\s*$', expected: 'any-exit' }, hintAfterAttempts: 2, hintText: 'Empty output means nobody is listening on 5432: the street door is closed.' },
      { instruction: 'What address does the app use?', command: 'cat /opt/myapp/application.properties', validation: { kind: 'output-contains-all', args: ['jdbc:postgresql://localhost:5432/shopdb', 'shopuser'] }, hintAfterAttempts: 2, hintText: 'cat prints a file. The file is in /opt/myapp.' },
    ],
    exactFix: [
      { instruction: "Open PostgreSQL's settings file and set listen_addresses = 'localhost'. (nano: edit, Ctrl+O to save, Ctrl+X to leave. Root-owned files need sudo.)", command: 'sudo nano /etc/postgresql/14/main/postgresql.conf', validation: { kind: 'state-equals', pattern: 'x.pg.confListen', expected: 'localhost' }, hintAfterAttempts: 2, hintText: "Find the line listen_addresses = '' and put localhost between the quotes. Without sudo nano can't save." },
      { instruction: 'Settings are only read at startup: restart PostgreSQL.', command: 'sudo systemctl restart postgresql', validation: { kind: 'port-listening', expected: 5432 }, hintAfterAttempts: 2, hintText: 'sudo systemctl restart postgresql' },
      { instruction: 'Confirm door 5432 is now open.', command: 'ss -tlnp | grep 5432', validation: { kind: 'output-contains-all', args: ['127.0.0.1:5432'] }, hintAfterAttempts: 2, hintText: 'ss -tlnp | grep 5432' },
      { instruction: 'Start the app again.', command: 'cd /opt/myapp && nohup java -jar app.jar > app.log 2>&1 &', validation: { kind: 'process-running', pattern: 'java -jar app\\.jar' }, hintAfterAttempts: 2, hintText: 'Same nohup command as before.' },
    ],
    lesson: '"active (running)" is not the same as "reachable on the network". Check the door (ss -tlnp), then the config. Editing a config never helps until you restart.',
    relatedScenarios: ['BF-05', 'BF-03'],
  },
  {
    id: 'chaos-1-4', title: 'The Photocopied Skeleton Key', injectionScript: "loosenKeyPermissions('~/.ssh/deploy.pem', '644')",
    symptom: "ssh -i deploy.pem ... → Permissions 0644 for 'deploy.pem' are too open ... Permission denied (publickey).",
    imagineAnalogy: 'You left a photocopy of your shop\'s skeleton key on a public park bench. The security guard at the shop refuses to even look at your key now.',
    diagnosticTrail: [
      { instruction: 'In a laptop terminal (open a new tab with + if your tab shows ubuntu@shop-server), try to log in.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'output-contains-all', args: ['too open'] }, hintAfterAttempts: 2, hintText: 'You need a learner@laptop prompt, not the server prompt.' },
      { instruction: 'Look at who can read the key.', command: 'ls -l ~/.ssh/deploy.pem', validation: { kind: 'output-contains-all', args: ['-rw-r--r--'] }, hintAfterAttempts: 2, hintText: '-rw-r--r-- means everyone can read it.' },
    ],
    exactFix: [
      { instruction: 'Put the key back in your pocket: only you may read it.', command: 'chmod 400 ~/.ssh/deploy.pem', validation: { kind: 'regex', pattern: '^chmod\\s+(400|600)\\s+\\S*deploy\\.pem\\s*$', onFailMessage: "Permissions are still too open for ssh: it only accepts a key that nobody else can read (400 or 600)." }, hintAfterAttempts: 2, hintText: 'chmod 400 <the key file>' },
      { instruction: 'Check the new permissions.', command: 'ls -l ~/.ssh/deploy.pem', validation: { kind: 'output-contains-all', args: ['-r--------'] }, hintAfterAttempts: 2, hintText: '-r-------- means only the owner can read it.' },
      { instruction: 'Try logging in again.', command: 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', validation: { kind: 'regex', pattern: SSH_RX }, hintAfterAttempts: 2, hintText: 'Same login command as before.' },
    ],
    lesson: 'SSH refuses a private key that other people can read. chmod 400 makes it yours alone. Never commit keys to git.',
    relatedScenarios: ['BF-04'],
  },
]

// ---------------------------------------------------------------- the stage

export const STAGE_1: CourseStage = {
  id: 'stage-1-manual-vps', number: 1, title: 'Manual Bare-Metal / VPS Deployment', eraName: 'The PuTTY & FileZilla Era',
  imagineCard: {
    headline: 'Your First Empty Shop',
    analogy: [
      'Imagine you are opening a street-corner shop in a city you have never visited.',
      'The VPS (virtual private server) is the empty, unfurnished shop you rent from a real-estate company (AWS, DigitalOcean, Hetzner). You get a street address: that is the IP address.',
      'FileZilla (SFTP) is the delivery van you drive yourself. You load boxes (your .jar file) into the van, drive to the shop\'s address, and carry each box to a specific shelf (the /opt/myapp folder). PuTTY (SSH) is the walkie-talkie connecting you, standing outside, to a worker inside the shop. You speak commands ("switch on the lights", "start the oven") and the worker does them. You never enter the shop yourself.',
      'The database is the stockroom in the back of the shop. The port number is the door number: customers knock on door 8080 to reach your Java kitchen; your kitchen staff knock on door 5432 (PostgreSQL) to reach the stockroom. Same building (localhost), different doors.',
      'The .pem SSH key is the one-of-a-kind skeleton key the real-estate company mails you. If you photocopy it and leave it on a park bench (permissions 644), anyone can enter your shop, so Linux insists you keep it in your pocket only (chmod 400).',
    ].join('\n\n'),
    mappingTable: {
      id: 'stage1-imagine-map', title: 'The shop, translated', columns: ['Concept', 'In the Analogy'],
      rows: [
        ['VPS / IP address', 'The rented empty shop and its street address'],
        ['Port 8080 / 5432', 'Door numbers: kitchen door vs. stockroom door'],
        ['FileZilla (SFTP)', 'The delivery van you drive yourself'],
        ['PuTTY (SSH)', 'The walkie-talkie to a worker inside'],
        ['.pem key', 'The one-of-a-kind skeleton key (keep in your pocket: chmod 400)'],
        ['PostgreSQL', 'The stockroom in the back of the shop'],
        ['java -jar app.jar', 'Telling the kitchen to open for business'],
      ],
    },
    illustrationPrompt: 'Warm flat illustration of an empty street-corner shop with a "For Rent" sign, a person outside holding a walkie-talkie, a small delivery van carrying a box labelled JAR, a glowing door numbered 8080 at the front and a door numbered 5432 at the back, and a golden skeleton key in the person\'s pocket. Friendly, pastel, no text other than the door numbers.',
  },
  architectureFlow: [
    {
      id: 'stage-1-flow', kind: 'ascii', title: 'Stage 1 request flow', caption: 'Two roads into the shop: the van and the walkie-talkie both arrive on door 22. Customers use door 8080. The kitchen talks to the stockroom on door 5432.',
      highlightedPorts: [22, 8080, 5432], highlightedProtocols: ['SSH', 'SFTP', 'HTTP', 'JDBC'],
      asciiArt: `   LEARNER'S LAPTOP                          REMOTE VPS (Ubuntu 22.04)
 ┌───────────────────────┐                 ┌────────────────────────────────┐
 │  mvn clean package    │                 │                                │
 │  └──▶ target/app.jar  │                 │   FileZilla SFTP  :22 ──▶ /opt/ │
 │         │             │   SFTP upload   │                                │
 │         ▼             │ ──────────────▶ │   PuTTY SSH       :22 ──▶ bash │
 │  FileZilla (GUI van)  │                 │        │                       │
 │  PuTTY    (walkie-    │   SSH session   │        ▼                       │
 │           talkie)     │ ◀────────────── │   java -jar app.jar            │
 └───────────────────────┘                 │        │ listens on :8080      │
        ▲                                  │        ▼                       │
        │  http://203.0.113.10:8080/api/orders              ┌─────────────┐ │
        └───────────────────────────────────────────────────│ PostgreSQL  │ │
                                   HTTP :8080               │  :5432      │ │
                                                            └─────────────┘ │
                                             (same machine: "localhost")    │
                                             └────────────────────────────────┘`,
    },
    {
      id: 'stage-1-mermaid', kind: 'mermaid-flowchart', title: 'Stage 1 as a flowchart', highlightedPorts: [22, 8080, 5432],
      mermaidCode: `flowchart LR
    A[Learner Laptop<br/>mvn clean package] -- "SFTP :22 upload app.jar" --> B[VPS /opt/myapp]
    C[PuTTY SSH :22] -- "bash commands" --> B
    B -- "java -jar app.jar" --> D[Spring Boot JVM<br/>listening :8080]
    D -- "JDBC TCP :5432" --> E[PostgreSQL stockroom]
    F[Customer Browser] -- "HTTP :8080" --> D`,
      asciiArt: `Laptop ──SFTP :22──▶ VPS /opt/myapp
PuTTY  ──SSH  :22──▶ VPS bash ──java -jar──▶ Spring Boot :8080 ──JDBC :5432──▶ PostgreSQL
Customer browser ──HTTP :8080──▶ Spring Boot`,
    },
    {
      id: 'stage-1-before-after', kind: 'before-after-diff', title: 'Before vs. After: Stage 1 → Stage 2', caption: 'The five pains below are what Stage 2 (systemd + Nginx) fixes.',
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
  labs: LABS,
  extraTables: [
    {
      id: 'stage1-tool-translation', title: 'What you click vs. what really happens', description: 'FileZilla and PuTTY are just friendly faces on Linux commands.',
      columns: ['FileZilla / PuTTY GUI Action', 'Under-the-hood Linux equivalent'],
      rows: [
        ['Type sftp://203.0.113.10, user ubuntu, port 22, click Quickconnect', 'sftp ubuntu@203.0.113.10 then password/key auth'],
        ['Drag app.jar from left pane (local target/) to right pane (/opt/myapp/)', 'scp target/app.jar ubuntu@203.0.113.10:/opt/myapp/  or inside sftp>: put target/app.jar /opt/myapp/'],
        ['Right pane refresh shows file', 'ls -lh /opt/myapp'],
        ['Disconnect button', 'exit (closes the TCP session on port 22)'],
        ['PuTTY: Session 203.0.113.10:22 + Auth → private key', 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10'],
      ],
      rowSemantics: ['tool-translation', 'tool-translation', 'tool-translation', 'tool-translation', 'tool-translation'],
    },
    {
      id: 'stage1-expected-outputs', title: 'What you should see after the key steps', columns: ['Lab step', 'Command', 'Expected output (validation string)'],
      rows: [
        ['1.1.1', 'mvn clean package', 'BUILD SUCCESS and target/shop-app-1.0.0.jar (~40 MB "fat jar" with embedded Tomcat)'],
        ['1.3.1', 'ssh -i ~/.ssh/deploy.pem ubuntu@203.0.113.10', 'Banner "Welcome to Ubuntu 22.04", prompt ubuntu@shop-server:~$. Wrong key → Permission denied (publickey).'],
        ['1.3.4', 'sudo apt update && sudo apt install -y openjdk-17-jre-headless', 'Setting up openjdk-17-jre-headless ... then java -version prints openjdk version "17.0.x"'],
        ['1.5.1', 'cd /opt/myapp && java -jar app.jar &', "Tomcat started on port 8080 (http) with context path '/'"],
        ['1.5.2', 'curl http://localhost:8080/api/health', '{"status":"UP"}'],
        ['1.6.1', 'nohup java -jar app.jar > app.log 2>&1 &', '[1] 2317 and the log is written to app.log'],
      ],
    },
  ],
  chaosLabs: CHAOS,
  painPointTable: {
    id: 'stage1-pain', title: 'Pain points that unlock Stage 2', columns: ['#', 'Operational Pain Felt by Learner', 'Root Cause', 'Why the Manual VPS Era Fails at Production Scale'],
    rows: [
      ['P1.1', 'The power company reboots the VPS at 3 AM; the shop is dead in the morning and customers see Connection refused.', 'java -jar is tied to an SSH session or a manual shell: nothing restarts it.', 'No process supervision.'],
      ['P1.2', 'Users must type :8080 in the browser; no padlock icon; company policy forbids non-HTTPS.', 'Java serves raw HTTP on a non-standard port; no TLS termination.', 'No reverse proxy, no SSL.'],
      ['P1.3', 'Uploading a new JAR means pkill java, upload, restart: users mid-order get dropped errors.', 'No atomic swap, no rolling anything.', 'Downtime on every deploy.'],
      ['P1.4', 'The DB password sits inside application.properties, readable by any user on the box.', 'Secrets baked into the artifact.', 'Security violation.'],
      ['P1.5', 'Twenty typed commands per deploy: one typo (wrong IP, wrong folder) wastes 20 minutes.', 'Humans are the deployment engine.', 'Error-prone, non-repeatable.'],
    ],
  },
  cheatSheet: {
    id: 'stage1-cheatsheet', title: 'Stage 1 cheat sheet: ports, protocols and settings', columns: ['Item', 'What it is (plain English)', 'Where you see it', 'Trap'],
    rows: [
      ['22 (SSH / SFTP)', 'The door for the walkie-talkie and the delivery van.', 'ssh, scp, sftp, PuTTY, FileZilla', 'A key readable by others is refused (chmod 400).'],
      ['8080 (HTTP)', 'The kitchen door customers knock on.', 'curl http://203.0.113.10:8080/api/orders', 'Only one program can own it: BindException: Address already in use.'],
      ['5432 (PostgreSQL / JDBC)', 'The stockroom door the kitchen knocks on.', 'jdbc:postgresql://localhost:5432/shopdb', "listen_addresses = '' means only the back hatch works; edit then restart."],
      ['3306 (MySQL / JDBC)', 'The stockroom door if you chose MySQL.', 'jdbc:mysql://localhost:3306/shopdb', 'The MySQL track arrives in a later phase.'],
      ['localhost', '"This same building."', 'JDBC URL, curl from the server', 'On your laptop, localhost is your laptop, not the shop.'],
      ['chmod 400 / 644', 'Who may read a file: only me / everybody.', 'ls -l shows -r-------- / -rw-r--r--', 'Keys 400, ordinary files 644.'],
      ['nohup … &', 'Ignore the hangup, run in the background.', 'nohup java -jar app.jar > app.log 2>&1 &', 'Without it, closing PuTTY kills the app (SIGHUP).'],
      ['spring.datasource.*', 'The kitchen\'s directions to the stockroom.', 'application.properties next to the jar', 'Passwords in plain text: fixed in Stage 2.'],
    ],
  },
  unlockGate: {
    description: 'To open Stage 2: finish all six labs, reproduce and fix Chaos 1.1 (the hangup), pass the quiz, and show `ss -tlnp` with both 8080 and 5432 listening.',
    requiredLabIds: LABS.map((l) => l.id),
    requiredChaosIds: ['chaos-1-1'],
    checks: [
      { id: 'gate-ss-both-ports', label: 'Run ss -tlnp on the server while both 8080 (app) and 5432 (database) are listening', commandPattern: '^(sudo\\s+)?ss\\s+-\\S+', rule: { kind: 'output-contains-all', args: [':8080', ':5432'] } },
    ],
    quiz: {
      id: 'quiz-1', title: 'Stage 1 check-in', passMark: 0.8,
      questions: [
        { id: 'q1', prompt: 'Why did the app die when PuTTY closed?', options: ['The server ran out of memory', 'Closing the SSH session sent a hangup signal (SIGHUP) to the programs started from it', 'Port 8080 was blocked by a firewall', 'Java always stops when nobody is typing'], answerIndex: 1, explanation: 'SSH sends SIGHUP to every program attached to the session when it closes. nohup or setsid tell a program to ignore it.' },
        { id: 'q2', prompt: 'Which permission must a .pem key have before ssh accepts it?', options: ['644', '777', '400', '000'], answerIndex: 2, explanation: '400 (or 600): only you may read it. 644 lets everybody read the key, and ssh refuses it.' },
        { id: 'q3', prompt: 'In the shop analogy, what is port 5432?', options: ['The delivery van', 'The door customers use to reach the Java kitchen', 'The stockroom door (PostgreSQL)', 'The walkie-talkie'], answerIndex: 2, explanation: 'Customers use 8080 for the Java app; the kitchen uses 5432 to reach PostgreSQL.' },
        { id: 'q4', prompt: 'Which one makes a program ignore the hangup signal?', options: ['nohup', 'chmod', 'scp', 'curl'], answerIndex: 0, explanation: 'nohup ("no hangup") keeps the program alive after you disconnect.' },
        { id: 'q5', prompt: 'A new app cannot start because "the old chef\'s sign is still on door 8080". What error does Java show?', options: ['Permission denied (publickey)', 'BindException: Address already in use', 'Unable to access jarfile', 'No such file or directory'], answerIndex: 1, explanation: 'Only one program can listen on a port. Find the owner with ss -tlnp and stop it.' },
      ],
    },
  },
}

validateStage(STAGE_1)
