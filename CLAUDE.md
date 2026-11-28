# CLAUDE.md

Guidance for working in this repo (`VivekG421302/java-arcrade`): a React 18 + Vite + TypeScript + Tailwind learning app, hosted statically on Vercel.

## Working style

- Prefer surgical fixes over broad rewrites. Deliver complete, working code, and type-check before calling anything done.
- Zero server cost: everything must run client-side in the browser. Persistence is `localStorage` / IndexedDB (Supabase is optional and only used by the existing courses).
- Match existing conventions: Tailwind slate/sky palette, `dark:` variants with `bg-[#0f1115]` family surfaces, lucide icons, 44px minimum touch targets, `data-tip` tooltips, visible focus, no all-caps eyebrow labels.
- Never commit secrets. Do not paste or store access tokens in files or memory.
- **Push verified work to `main`** after each increment (the owner asked for this habit). Before pushing: `git fetch` and rebase onto `origin/main` (the owner also pushes content commits), then `npm run build` and `npm run verify:devops` must pass. Never force-push. Pass any token inline for the one command; never write it into `.git/config` or a file.
- **Any `lazy()` element rendered outside `<Layout>` needs its own `<Suspense>`** (Layout holds the app's only boundary). The DevOps module does this in `src/courses/devops/Entry.tsx`; without it the first client-side navigation shows a blank page until reload.
- When scripting edits (python `str.replace`), **assert the old text is present**: a non-matching replace fails silently and the bug only shows up later.

## Commands

```bash
npm run dev             # content build + vite
npm run build           # content build + tsc --noEmit + vite build (must pass)
npm run verify:devops   # headless end-to-end run of the DevOps module (see below)
```

## Repo orientation

- `CourseId` (`java | rust | postgres`) is a closed union wired into `content.json` (generated from `content/*.md` by `scripts/build-content.mjs`), Supabase progress offsets and many `Record<CourseId, …>` maps. **Do not add new ids to it** for modules that do not come from that markdown pipeline.
- `src/App.tsx`: routes. Course pages live under `<Layout />`; the DevOps module is a sibling `devops/*` route.
- `src/components/Workspace.tsx` + `hooks/useIde.tsx`: optional code IDE panel (editor + run output; PGlite for SQL). The IDE is forced closed on `/devops`.
- `src/lib/sqlRunner.ts`: `runSql(source)` runs a script in the in-browser PostgreSQL (PGlite worker, ~15 MB first load, resets per run). Reuse it; do not add a second SQL engine.
- Scripts that share TS code with Node use bundling (`scripts/verify-devops.mjs` uses esbuild, already a Vite dependency) or `node --experimental-strip-types`.

## DevOps Mastery module (`src/courses/devops/`)

Course: "Full-Stack Deployment & DevOps Mastery: Spring Boot + PostgreSQL/MySQL". Source of truth is `fullstack-devops-mastery-spec.md` (8 stages, each with Imagine card, diagrams, labs, chaos labs, pain-point table, unlock gate). Routes: `/devops` (hub), `/devops/stage/:n`. Entry points: the course switcher and a link on the Landing page.

### Layout

```
types.ts            Spec section 4.1 interfaces (+ UnlockGate, GateCheck, QuizSpec extensions)
data/stage1.ts      Stage content as typed data + the two virtual filesystems (laptop, VPS)
data/catalog.ts     The 8-stage ladder shown in the hub (`live: true` once a stage has content)
data/validate.ts    Build-time checks (table row widths, rule patterns); runs on import
engine/             Framework-free simulator (no React)
  fs.ts             flat-map POSIX-ish filesystem, permissions, globbing
  world.ts          World = fs + process table + hidden state; syncWorld() derives SimulatedServerState
  parse.ts          bash-subset parser (quotes, && || ; | &, > >> 2>&1, ~ and $VAR)
  shell.ts          executor, prompts, REPLs, Ctrl+C, Tab completion
  corecmds.ts / netcmds.ts / svccmds.ts / app.ts   commands (core, ssh/scp/curl/ss, apt/java/mvn/psql/nano) and the app + HTTP model
  stage2cmds.ts     systemctl (all verbs), journalctl, nginx, ufw, certbot, reboot
  systemd.ts        unit parsing, EnvironmentFile, Restart= loops, journal, enable/disable, reboot; registers the syncWorld hooks
  nginx.ts          config parser with nginx-style [emerg] errors, test/reload/restart, Host/port routing, 502, certbot's edits
  stage2world.ts    Stage 2 starting world (enterStage2) and fullyHardened() baseline for chaos labs; canonical unit/env/site files
  rules.ts          TerminalCommandRule evaluator
  tracker.ts        step validation, attempts/hints, chaos phases, gate, quiz
  session.ts        Simulator: world + terminal tabs + localStorage persistence + events
  chaos.ts          injection scripts (named by ChaosIncident.injectionScript)
  badges.ts         topology health badges, derived ONLY from world state
  sftpGui.ts        FileZilla pane actions on the same filesystems
  verify.ts         headless walkthrough used by `npm run verify:devops`
runtime.ts          STAGES registry, one Simulator + Tracker per stage, React hooks (useSim/useTracker/useStageDef via StageCtx); wires psql to runSql
components/ pages/  UI (DevOpsChrome = navbar + stage drawer, PracticalZone = FileZilla/Terminal/View/Hint as tabs or a 4-up grid, TerminalPane, FileZillaPane, TopologyMap, StepBar, LabPanel, ChaosPanel, GatePanel, …)
routes.tsx          lazy-loaded at /devops/*
```

Docs: `docs/devops/fullstack-devops-mastery-spec.md` is the curriculum source of truth (copy of the owner's spec); `docs/devops/HANDOFF.md` is the session-handoff file (state, next steps, lessons, test recipes).

### Rules for this module

1. **State machine first.** Every command's output and every badge comes from `World` (files, processes, config), never from hard-coded text. A failure must happen because the world is in that state, and print the real tool's error.
2. **Validation is data.** Steps use `TerminalCommandRule` (`exact | regex | file-exists | process-running | port-listening | state-equals | output-contains-all | sequence`). `state-equals` paths resolve against `{...state, x: world.x}`. `expected: 'any-exit'` lets a regex rule pass on a non-zero exit (e.g. `grep` finding nothing). `onFailMessage` is only shown for near-misses that exited successfully, so write it only where it is always true.
3. **Imagine first.** Each stage opens with the `ImagineAnalogyBlock`; technical sections stay locked until it is read.
4. **Progressive unlock.** `UnlockGate` = all labs + required chaos labs + quiz + stage checks. Stage N+1 opens only when Stage N's gate is complete.
5. **Keep it deterministic.** Simulated time starts at 2026-11-24 09:00 UTC; app PIDs follow 2142, 2317, 2488… so the curriculum text matches what learners see.
6. **Shared world across tabs.** Closing a terminal tab or typing `exit` in an SSH session SIGHUPs processes started without `nohup`/`setsid`. This is the Chaos 1.1 lesson; do not "fix" it.
7. **Add every new lab/chaos step to `engine/verify.ts`'s walkthrough** (it plays the commands straight from the data files, so most new steps are covered automatically). Run `npm run verify:devops` and `npm run build` before committing.

### Adding a stage

1. Add `data/stageN.ts` exporting a `CourseStage` (call `validateStage`) and a `PlaygroundSpec` (topology nodes, optional `rescueConsole`).
2. Add an `enterStageN(world)` starting point in `engine/` and a `fullyDone(world)` baseline if chaos labs need one. Extend `World`/`Extras` and commands only as the stage needs, and derive new `SimulatedServerState` fields plus rule-facing facts (`x.d.*`) in `syncWorld`/the derive hook.
3. Add chaos injections to `engine/chaos.ts` (names match `injectionScript`); extend `badges.ts` and `TopologyMap` edge states.
4. Register the stage in `runtime.ts` `STAGES` (own storage key, `init: enterStageN`) and flip `live: true` in `data/catalog.ts`.
5. Extend `engine/verify.ts` with a walkthrough that plays the stage's own commands.
6. Tools that unlock later are gated by `LOCKED` in `shell.ts` and `apt` (compared with `world.state.stage`), so earlier worlds keep failing like a missing program.

### Status

- **Phase 1 (done):** Stage 1, Manual VPS (PuTTY and FileZilla era): 6 labs, 4 chaos labs, quiz, gate, PostgreSQL track.
- **Decisions to remember:**
  - Build output is `shop-app-1.0.0.jar`; uploads are renamed to `app.jar` (FileZilla rename or `scp … :/opt/myapp/app.jar`), so later commands stay literal.
  - `systemctl` works for PostgreSQL only in Stage 1; other units answer "could not be found".
  - Chaos 1.1 is the only required chaos lab for the Stage 1 gate; 1.2 to 1.4 are recommended.
  - `cd x && cmd &` keeps the `cd` in the current shell (deliberate simplification, differs from real bash).
  - The MySQL track is not implemented; `apt install mysql-*` explains that it is coming.
  - Progress and simulator state live in `localStorage` (`devops:v1:*`) only.
- **Phase 2 (done):** Stage 2, systemd + Nginx hardening (receptionist and generator): 3 labs, 3 chaos labs (502 wrong upstream, UFW lockout with a rescue console, restart loop from a missing EnvironmentFile), quiz, gate. Stage 2 is locked until Stage 1's gate is complete; each stage has its own simulator (`devops:v1:sim:stage-2`) and progress.
- **Stage 2 decisions to remember:**
  - The Stage 2 world starts after Stage 1: database and jar exist, nothing runs, and the new build reads secrets from `${DB_URL}`, `${DB_USER}`, `${DB_PASSWORD}` (fills Stage 1's pain P1.4).
  - nginx install enables the placeholder `default` site, as real Ubuntu does; Lab 2.2 removes it because an IP visitor matches no `server_name` and the default wins.
  - `restart nginx` with a broken config leaves nginx down; `reload` keeps the old config. `kill` (SIGTERM, exit 143) is a clean stop under `SuccessExitStatus=143`; `kill -9` is a crash that systemd restarts.
  - certbot is non-interactive: no HTTPS redirect unless `--redirect`; `shop.example.com` is the only domain that "resolves" (to 203.0.113.10). Certbot fails with a firewall timeout if UFW blocks port 80.
  - `reboot` kills every SSH session, restarts enabled units, and SSH is refused for about 18 simulated seconds (`sleep 20` passes the time).
  - The rescue console tab is a remote shell that does not use the network, so UFW cannot block it.
  - The simplified nano accepts pasted text; steps that need a file show a `snippet` with a Copy button.
- **Next:** Phase 3, Stage 3 (shell automation: deploy script, versioned releases with an atomic symlink swap, logrotate, backups, cron). It needs `ln -sfn`/`readlink`/`mv -T`, `crontab`, `logrotate`, `pg_dump`, a script runner (`bash script.sh` with `set -e`) and an editor-friendly way to write multi-line scripts.
