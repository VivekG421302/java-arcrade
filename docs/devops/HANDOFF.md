# DevOps Mastery module: handoff for the next Claude session

Paste this whole file into a new chat, together with the repo link and a temporary GitHub token. Then continue the work from "What to do next".

- Repo: https://github.com/VivekG421302/java-arcrade (branch `main`)
- The owner (Vivek, "GIMIK") is a Java backend engineer who prefers direct communication, complete working deliverables, and surgical fixes over broad rewrites.
- State at the time of writing: Phases 1 and 2 are done and pushed. **Phase 3a (Stage 3 engine primitives: symlink-aware paths + script runner) is built, verified and committed locally but was NOT pushed (that session had no token). Push it first (section 4).** The blank-page fix is commit `9cb0d38`. **The owner then pushed 5 commits that rework the DevOps page layout** (roadmap | practical-zone split with tabs, collapsible sides, a shared navbar, constant-size View/Hint strip, IDE-style drag-resizable panes): see `components/DevOpsChrome.tsx`, `PracticalZone.tsx`, `Splitter.tsx`, `pages/StagePage.tsx`, `pages/DevOpsShell.tsx`. **Run `git log --oneline -15` first and trust the code over this file for anything about the UI layout** (the sticky-playground description in older notes no longer applies). Build and `npm run verify:devops` passed on `f3664dc` (208 checks); with Phase 3a the verifier runs **228 checks**.

## 0. First five minutes (do these before anything else)

1. Clone with the token passed **inline** (never write the token into `.git/config`, a file, or memory; do not echo it back):
   `git clone https://x-access-token:$TOKEN@github.com/VivekG421302/java-arcrade.git && cd java-arcrade && git remote set-url origin https://github.com/VivekG421302/java-arcrade.git`
2. `npm install` (about 10 s). If you need the UI smoke test, `npm i --no-save jsdom` (do not add it to package.json).
3. Read `CLAUDE.md` in the repo root. It has the architecture, rules for this module, how to add a stage, and the decisions already taken.
4. Run `npm run build` and `npm run verify:devops`. Expect: build passes, "All 228 checks passed" (208 if Phase 3a is missing).
5. The curriculum spec is in the repo at `docs/devops/fullstack-devops-mastery-spec.md` (about 1,780 lines, 139 KB). If it is missing, ask the owner to attach `fullstack-devops-mastery-spec.md`. Do not invent curriculum.

## 1. The project in one paragraph

A new course module, "Full-Stack Deployment & DevOps Mastery: Spring Boot + PostgreSQL/MySQL", inside the owner's existing React 18 + Vite + TypeScript + Tailwind learning app (Java, Rust and PostgreSQL courses already exist). It teaches 8 deployment stages (manual VPS, systemd+Nginx, shell automation, Docker, Compose, cloud, CI/CD, Kubernetes) using one shop app. Everything runs **100% in the browser at $0** (localStorage; static hosting on Vercel; no backend). Each stage has: an "Imagine..." analogy card first, diagrams (Mermaid plus ASCII toggle, before/after), labs checked by terminal-command rules, chaos labs (inject a failure, diagnose, fix), a pain-point table, an unlock gate (labs + required chaos lab + quiz + checks), and a split-screen playground (live topology map with health badges + a simulated terminal + FileZilla).

## 2. Working agreements (the owner asked for these)

- **Push verified work to `main` after every increment.** Before pushing: `git fetch` and `git rebase FETCH_HEAD` (the owner pushes content commits to `main` too; this has happened twice), then `npm run build` and `npm run verify:devops` must pass. Never force-push. Pass the token inline to `git push` only, and redact it from output (`sed "s/$TOKEN/***/g"`).
- Build one phase (one stage) at a time. After a phase: summarize what was built, what was reused, decisions where the spec contradicted itself, and what is not done. The owner then says go for the next phase.
- Prefer surgical fixes. Give complete, working deliverables. Type-check (`npx tsc --noEmit`) before saying anything is done.
- Update `CLAUDE.md` (Status and decisions) at the end of each phase.
- Remind the owner to revoke the temporary token when the session ends.

## 3. What exists (all on `main`)

- **Phase 1, Stage 1** (Manual VPS, PuTTY and FileZilla): 6 labs, 4 chaos labs, quiz, gate. PostgreSQL track only.
- **Phase 2, Stage 2** (systemd + Nginx hardening): 3 labs, 3 chaos labs (502 wrong upstream, UFW lockout with a rescue console, restart loop from a missing EnvironmentFile), quiz, gate. Stage 2 is locked until Stage 1's gate is complete.
- **Bug fix just shipped:** the `/devops` page was blank on the first client-side navigation and fixed by a reload. Root cause: the DevOps routes are a `lazy()` chunk placed outside `<Layout>`, and the app's only `<Suspense>` lives inside Layout, so React 18 threw "A component suspended while responding to synchronous input" and unmounted everything. Fix: `src/courses/devops/Entry.tsx` (statically imported by `App.tsx`) owns the Suspense boundary and an error boundary, and reloads once automatically on stale-chunk errors after a deploy. **Rule: any `lazy()` element outside Layout needs its own Suspense.**
- **Phase 3a (engine only, no UI or content change, Stage 3 is still `live: false`):** symlinks now work in the middle of a path (`/opt/myapp/current/app.jar`); `ln` (`-s -f -n -T`, stores the target text as typed, relative targets resolve from the link's folder), `readlink` (`-f -e -m`), `mv` (`-T -f -n -v`, and `mv x current` now moves INTO the folder a link points at, the classic trap), `ls` (opens a link to a folder unless `-l`; `link/` always opens; links print cyan, dangling links red), `cd` through links, `> file` writes through a link; the script runner `engine/script.ts` (`bash file`, `bash -c`, `./file` with the x-bit check and a `chmod +x` hint, `sudo ./file`); the `[[ ]]`, `[ ]`, `test` builtin; `$?` now carries the previous line's status (also inside one line: `a; echo $?`). `bash` and `sh` are gated by `LOCKED` until Stage 3. 20 new verifier checks cover all of it (end of `engine/verify.ts`).
- Engine, content and UI layout are documented in `CLAUDE.md`. Existing app files touched (small): `src/App.tsx`, `src/components/CourseSwitcher.tsx`, `src/hooks/useIde.tsx`, `src/pages/Landing.tsx`.

## 4. What to do next: Phase 3, Stage 3 ("Shell Scripting & Zero-Downtime Artifact Automation")

Spec map (line numbers in `docs/devops/fullstack-devops-mastery-spec.md`): Stage 3 is lines 360-496 (imagine card 362, layout 372, lab 396, chaos labs 463, pain points 486). Stages 4 to 8 follow at 497, 620, 742, 837, 972. Reference sections: command encyclopedia 1136, 50 break-fix scenarios 1300, capstones 1358, **TypeScript schema 1490, per-stage terminal command unlock list 1714, rendering rules 1727**, glossary 1739, validation checklist 1770.

**First action next session: push Phase 3a.** Clone, `git log --oneline -3` (the top commit is "Phase 3a"); if the commit is missing because the work only existed in the previous sandbox, redo it from section 3 (it is about 450 lines: `engine/script.ts`, edits to `fs.ts`, `corecmds.ts`, `shell.ts`, `shellTypes.ts`, `verify.ts`). Then `git fetch`, `git rebase FETCH_HEAD`, build, verify, push.

Done in Phase 3a: symlink-aware paths, `ln -sfn`, `readlink`, `mv -T`, script runner (`set -euo pipefail`, variables, `$?`, `$1`, `${1:?msg}`, `${V:-x}`, `$(cmd)`, `$((n))`, `if/elif/else`, `for`, functions, `cmd || { ...; }`, `cmd || exit N`), `[[ ]]`. Still to do for Stage 3:
- `rsync` (`-av`, local to local copy with the `sending incremental file list` summary; `No space left on device` when the disk is full), still in `LOCKED` for stage 3. systemd must (a) check that the jar in `ExecStart` exists after following symlinks and fail like java does (`Unable to access jarfile /opt/myapp/current/app.jar`, exit status 1) for Chaos 3.2; today `attempt()` in `systemd.ts` never checks it, and `ExecStart` still points at `/opt/myapp/app.jar`.
- Script gaps found while building 3a: no here-doc (`cat > f <<'EOF'`), no `printf`, `$(...)` output is not word-split when unquoted (a `for` list is), no `while`/`case`/`trap`/`read`, `[[ a && b ]]` is not supported. Add what the Stage 3 scripts need (the spec scripts use none of these except `date +%Y%m%d-%H%M%S`, `gzip`, `find -mtime -delete`, `sudo`, `pg_dump`).
- `crontab -e` (editor flow), `crontab -l`, a cron scheduler tied to the simulated clock; `logrotate` (`-d`, `-f`) with `/etc/logrotate.d/shop`; `pg_dump | gzip > /backups/...`; `df -h`/`du` to show disk effects.
- Chaos labs for Stage 3 per the spec (read lines 463-485), plus badges/edges if new states are needed.
- Then: `data/stage3.ts`, `enterStage3` in `engine/`, register in `runtime.ts` `STAGES`, flip `live: true` in `data/catalog.ts`, extend `engine/verify.ts` with a Stage 3 walkthrough, update `CLAUDE.md`.

After Stage 3: Stages 4 to 8 (Docker, Compose, cloud, CI/CD, Kubernetes) need new simulators (docker/compose engine with images, networks, volumes, healthchecks; an AWS-style console view; a GitHub Actions run viewer; kubectl with pods/deployments). Plan each as its own phase, reusing the per-stage runtime pattern.

## 5. Known gaps and ideas (not started)

- **MySQL track** (the course title says PostgreSQL/MySQL): Stage 1 and 2 are PostgreSQL only; `apt install mysql-*` prints "coming in a later phase". Offer it as a contained follow-up phase.
- Never tested in a real browser or on a phone: only jsdom smoke tests. If a Playwright browser can be installed in the session, do a visual and touch pass (terminal input on mobile, FileZilla pane, sticky playground on desktop, dark/light).
- No "mini browser with padlock" from the spec (curl shows `HTTP/2 200` instead).
- Progress is localStorage only (no Supabase sync) by design.
- Tab completion lists no candidates; no `vim`; `nano` is a simplified overlay (Ctrl+O/Ctrl+X, accepts paste).
- Accessibility pass (focus order, live regions) beyond the basics has not been done.

## 6. Lessons learned (avoid repeating these)

- **Phase 3a notes.** `c.emit(line)` keeps a script's stdout/stderr in order on screen; with a redirect the lines are split into stdout/stderr like any command. `c.runLine(text, env)` runs one line as if typed (as `c.user`, so `sudo ./deploy.sh` works) and ticks the clock 2 s, so state changes between script lines. `$?` is a placeholder (`\u0000Q`) that `runList` fills per command; scripts pass real numbers through `env['?']`. In real `ln`, `ln -s X link` where `link` is a link to a folder creates the link INSIDE that folder unless `-n`/`-T` is given: the engine does the same on purpose (Lab 3.1 uses `ln -sfn`). The verifier helper `text2` now strips ANSI because `ls` colours links.

- **Scripted edits can fail silently.** Python `str.replace` returns the original text when nothing matches. Always `assert old in text` first. This hid a whole block of Stage 2 wiring until the verifier caught it.
- **Never run `pkill -f <pattern>` where the pattern also appears in your own command line**: it kills your own shell.
- A single shell command times out after 300 s: use `timeout 60 node ...` and write output to files.
- The simulator is deterministic (simulated clock starts 2026-11-24 09:00 UTC; app PIDs 2142, 2317, 2488...). Keep it so; curriculum text quotes these values.
- Validation rules read the world, never hard-coded output. `x.d.*` holds derived file facts for rules (see `systemd.ts` `derive`). `expected: 'any-exit'` lets a rule pass on non-zero exit. `onFailMessage` is shown only for near-misses that exit 0, so only write it where it is always true.
- Tools that unlock later are blocked by `LOCKED` in `shell.ts` and `apt`, compared with `world.state.stage`.
- The existing app's `body` has `overflow: hidden`; pages scroll in inner containers (the DevOps shell has its own scroll area).
- The existing "terminal" in the app is only a run-output pane; the interactive shell is new. The reusable existing primitive is `runSql()` (PGlite worker, about 15 MB first load): `psql -c` uses it, but `SELECT 1` is canned so Lab 1.4 never downloads PGlite.

## 7. How to test (recipes that worked)

- `npm run verify:devops`: bundles `src/courses/devops/engine/verify.ts` with esbuild (a Vite dependency) and plays every lab and chaos step from the data files through the real `Simulator` and `Tracker`. Add new stage walkthroughs there.
- Quick transcript peek: write a throwaway `/tmp/peek.ts` that builds a `Simulator`, run it through a tiny esbuild script placed inside the repo (module resolution needs it), then delete both.
- UI smoke test: `npm i --no-save jsdom`, esbuild-bundle a tsx harness (`platform: node`, `jsx: automatic`, `external: ['jsdom']`) that mounts `StagePage`/`Hub` inside `MemoryRouter` and `CourseProvider`, stubs `IntersectionObserver`, drives inputs with the native value setter plus `input`/`keydown` events inside `act()`. Delete the harness afterwards.
- The harness for the blank-page bug mounted the real routes under a `MemoryRouter`, clicked a `Link`, and compared a lazy route with and without a Suspense boundary.

## 8. Prompt to start the next chat

"Continue the DevOps Mastery module. Repo: https://github.com/VivekG421302/java-arcrade. Temporary token: <paste>. Read docs/devops/HANDOFF.md and CLAUDE.md first, run the build and `npm run verify:devops`, push Phase 3a if it is not on main yet, then build Phase 3b (rsync, systemd jar check, releases world, `enterStage3`). Push verified work to main as you go."
