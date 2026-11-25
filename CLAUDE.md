# CLAUDE.md

Guidance for working in this repo (`VivekG421302/java-arcrade`): a React 18 + Vite + TypeScript + Tailwind learning app, hosted statically on Vercel.

## Working style

- Prefer surgical fixes over broad rewrites. Deliver complete, working code, and type-check before calling anything done.
- Zero server cost: everything must run client-side in the browser. Persistence is `localStorage` / IndexedDB (Supabase is optional and only used by the existing courses).
- Match existing conventions: Tailwind slate/sky palette, `dark:` variants with `bg-[#0f1115]` family surfaces, lucide icons, 44px minimum touch targets, `data-tip` tooltips, visible focus, no all-caps eyebrow labels.
- Never commit secrets. Do not paste or store access tokens in files or memory.

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
  corecmds.ts / netcmds.ts / svccmds.ts / app.ts   commands (core, ssh/scp/curl/ss, apt/systemctl/java/mvn/psql/nano)
  rules.ts          TerminalCommandRule evaluator
  tracker.ts        step validation, attempts/hints, chaos phases, gate, quiz
  session.ts        Simulator: world + terminal tabs + localStorage persistence + events
  chaos.ts          injection scripts (named by ChaosIncident.injectionScript)
  badges.ts         topology health badges, derived ONLY from world state
  sftpGui.ts        FileZilla pane actions on the same filesystems
  verify.ts         headless walkthrough used by `npm run verify:devops`
runtime.ts          singletons + React hooks (useSim, useTracker); wires psql to runSql
components/ pages/  UI (Playground, TerminalPane, FileZillaPane, TopologyMap, StepBar, LabPanel, ChaosPanel, GatePanel, …)
routes.tsx          lazy-loaded at /devops/*
```

### Rules for this module

1. **State machine first.** Every command's output and every badge comes from `World` (files, processes, config), never from hard-coded text. A failure must happen because the world is in that state, and print the real tool's error.
2. **Validation is data.** Steps use `TerminalCommandRule` (`exact | regex | file-exists | process-running | port-listening | state-equals | output-contains-all | sequence`). `state-equals` paths resolve against `{...state, x: world.x}`. `expected: 'any-exit'` lets a regex rule pass on a non-zero exit (e.g. `grep` finding nothing). `onFailMessage` is only shown for near-misses that exited successfully, so write it only where it is always true.
3. **Imagine first.** Each stage opens with the `ImagineAnalogyBlock`; technical sections stay locked until it is read.
4. **Progressive unlock.** `UnlockGate` = all labs + required chaos labs + quiz + stage checks. Stage N+1 opens only when Stage N's gate is complete.
5. **Keep it deterministic.** Simulated time starts at 2026-11-24 09:00 UTC; app PIDs follow 2142, 2317, 2488… so the curriculum text matches what learners see.
6. **Shared world across tabs.** Closing a terminal tab or typing `exit` in an SSH session SIGHUPs processes started without `nohup`/`setsid`. This is the Chaos 1.1 lesson; do not "fix" it.
7. **Add every new lab/chaos step to `engine/verify.ts`'s walkthrough** (it plays the commands straight from the data files, so most new steps are covered automatically). Run `npm run verify:devops` and `npm run build` before committing.

### Adding a stage

1. Add `data/stageN.ts` exporting a `CourseStage` (call `validateStage`) and any new filesystem content.
2. Extend `World`/`Extras` and commands only as the stage needs (e.g. systemd units, nginx), then derive new `SimulatedServerState` fields in `syncWorld`.
3. Add chaos injections to `engine/chaos.ts`; extend `badges.ts` (`502_BAD_GATEWAY`, `CrashLoopBackOff` are already defined).
4. Generalise `runtime.ts` (currently one `Tracker` for stage 1) to a tracker per stage, and `routes`/`StagePage` to look the stage up by number.
5. Flip `live: true` in `data/catalog.ts`.

### Status

- **Phase 1 (done):** Stage 1, Manual VPS (PuTTY and FileZilla era): 6 labs, 4 chaos labs, quiz, gate, PostgreSQL track.
- **Decisions to remember:**
  - Build output is `shop-app-1.0.0.jar`; uploads are renamed to `app.jar` (FileZilla rename or `scp … :/opt/myapp/app.jar`), so later commands stay literal.
  - `systemctl` works for PostgreSQL only in Stage 1; other units answer "could not be found".
  - Chaos 1.1 is the only required chaos lab for the Stage 1 gate; 1.2 to 1.4 are recommended.
  - `cd x && cmd &` keeps the `cd` in the current shell (deliberate simplification, differs from real bash).
  - The MySQL track is not implemented; `apt install mysql-*` explains that it is coming.
  - Progress and simulator state live in `localStorage` (`devops:v1:*`) only.
- **Next:** Phase 2, Stage 2 (systemd + Nginx hardening).
