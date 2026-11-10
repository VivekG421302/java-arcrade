# Java Mastery Platform

A phase-gated learning app that renders `content/roadmap.md` (Part 1 study guide in `public/study-guide.html` for Java, roadmap phases for Rust; Part 2 LeetCode bank, Part 3 anti-patterns, Part 4 production scenarios).
React 18 + Vite + TypeScript, Tailwind, React Router, Supabase (auth + progress), Prism (VS Code Dark+ tokens), Framer Motion, lucide-react (icons), react-markdown.

## Setup
```bash
npm install
cp .env.example .env        # add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
npm run dev                 # regenerates src/content.json from the markdown, then starts Vite
```
1. Create a Supabase project, open **SQL Editor**, and run `supabase/schema.sql` (tables + row-level security + profile trigger).
2. In **Authentication → Providers**, keep Email enabled (disable "Confirm email" for quicker local testing).
3. No env vars? The app still works in **guest mode**: progress is stored in localStorage.

## Question bank content
Each of the 100 questions has a problem statement, test cases (input and expected output), the expected complexity and a Java solution, all in `content/problems/*.txt` (one block per question; format described at the top of `scripts/problems.mjs`). `npm run content` merges them into `src/content.json`.
Every solution is compiled and run against its test cases by `node scripts/verify-problems.mjs` (needs JDK 11+; currently 100/100 pass). Run it after editing any solution.

## How it works
- **Content**: `scripts/build-content.mjs` parses the markdown into `src/content.json` (6 phases / 17 sections, 100 questions, 10 deep-dive + 40 matrix anti-patterns, 10 + 20 scenarios). To update content, edit `content/roadmap.md` and re-run `npm run dev` / `npm run build`. Inline LaTeX (`$O(N \log N)$`) is converted to plain text.
- **Gating** (`src/hooks/useProgress.tsx`): only Phase 1 starts unlocked; Phase N unlocks when Phase N-1 is `completed`. Pass mark is 80%.
- **Tests** (`src/lib/tests.ts`): 5 per phase (4 MCQ + 1 code). 4/5 = 80%, so one miss is allowed. Questions show one at a time (less cognitive load, simpler keyboard flow, full width for code). Edit or add questions there.
- **Attempts**: 3 failed attempts per browser session, then a 24-hour lock (stored in localStorage per user).
- **Supabase tables**: `phase_progress` (status, best score, attempts, completed_at) and `test_attempts` (answers jsonb, score, passed).
- **Notes**: the original prompt's schema had `profiles.full_text`; this uses `full_name`. Grading runs in the browser, so a determined user could write their own rows; move grading to an Edge Function if integrity matters.

## Differences from the spec
- Components are consolidated into fewer files (`components/Layout.tsx`, `content.tsx`, `ui.tsx`, `TestRunner.tsx`) rather than one file each.
- The Question Bank uses "Show more" paging (40 at a time) instead of a virtualized list; 100 rows is light enough.
- The right-hand TOC lists the sections of the current phase (toggle in the top bar, xl screens).

## PWA and favicon
Installable (manifest + `public/sw.js`, offline shell cache, icons in `public/icons`, `public/favicon.svg`). The service worker only registers in production builds (`npm run build && npm run preview`). `vercel.json` rewrites deep links to `index.html`.

## Daily 12:00 reminder
Click the bell in the top bar to allow notifications. Three layers, so it works in as many situations as possible:
1. **App open**: a timer checks every minute and on tab focus; notifies once per day at or after 12:00 local time.
2. **Installed Chromium PWA**: Periodic Background Sync wakes the worker now and then and sends the reminder if it is past noon. Browsers decide the timing, so this is best-effort.
3. **Server push (the reliable one, works with the app closed)**: needs a one-time setup:
   ```bash
   npx web-push generate-vapid-keys                       # put the public key in .env as VITE_VAPID_PUBLIC_KEY
   supabase secrets set VAPID_PUBLIC_KEY=... VAPID_PRIVATE_KEY=... VAPID_SUBJECT=mailto:you@example.com CRON_SECRET=$(openssl rand -hex 16)
   supabase functions deploy daily-reminder --no-verify-jwt
   ```
   Then run `supabase/reminder-cron.sql` (fill in the project ref and secret). The function runs every 30 minutes and notifies each subscription at 12:00 in that device's own timezone (IST included). Server push requires being signed in, because subscriptions are stored per user. Duplicates are avoided with a shared notification tag.

On iPhone/iPad, notifications only work after you "Add to Home Screen" (iOS 16.4+).

## Java IDE (prototype)
Open it from a question ("Practice in IDE") or with the terminal icon in the top bar. The app shrinks into a phone-sized view and an IDE opens beside it, on the same screen.
- **Hide the app view**: the panel-left icon in the IDE header slides the app out to the left; click it again to bring it back.
- **Terminal**: dock it at the bottom, right, top or left, or toggle it. `Ctrl+Enter` runs the code.
- **Starter code**: every question gets a stubbed class plus a `Main` with the sample tests as comments (generated by `npm run content`; all 100 compile). Your code is kept per question in localStorage; the reset button restores the starter.
- **How code runs**: browsers cannot run `javac`, so code is sent to a [Judge0](https://github.com/judge0/judge0) server (public CE by default, rate limited; set `VITE_JUDGE0_URL` for your own). It needs an internet connection, and the entry point must be `public class Main`.
- Built for laptop-sized screens; on small screens the IDE is not laid out.
- To remove the feature: delete `components/Workspace.tsx`, `CodeEditor.tsx`, `hooks/useIde.tsx`, `lib/runner.ts` and unwrap `<Workspace>` in `App.tsx`.

### Keyboard shortcuts
Hover or focus any button (or long-press on touch) to see its tooltip with the shortcut. On macOS use Option instead of Alt and Command instead of Ctrl.

| Action | Keys |
| --- | --- |
| Open / close the IDE | Alt+I |
| Run | Ctrl+Enter |
| Previous / next problem | Alt+P / Alt+N |
| Toggle terminal | Alt+T |
| Cycle terminal position (bottom, right, top, left) | Alt+D |
| Hide / show the app view | Alt+H |
| Narrower / wider app view | Alt+[ / Alt+] |
| Smaller / bigger terminal | Alt+- / Alt+= |
| Reset code to starter | Alt+Z |
| Smaller / bigger editor text | Alt+, / Alt+. |
| Wrap long lines | Alt+W |
| Switch course (Java / Rust) | Alt+O |
| Focus the editor / leave it | Alt+C / Esc |
| Toggle Java solution / open LeetCode (for the problem in the IDE) | Alt+S / Alt+L |
| Open the app menu | Alt+M |
| Jump to search (Question Bank) | / |

Resize handles (between the two screens and between editor and terminal): drag, double-click to reset, or focus and use the arrow keys (Enter resets). Sizes are remembered.

### Layout behaviour
- **Sidebar**: on a wide screen with the IDE closed it sits beside the content and shares the space (no dimming). On small screens, or whenever the IDE is open (so the app is phone-sized), it opens as an overlay covering the app view, and closes when you pick something, tap outside it, press Esc or use the menu button.
- **Small screens**: the app and the IDE are two full-screen views. The panel icon in the IDE header (or the terminal icon in the top bar) switches between them. A symbol keyboard (brackets, operators, `->`, Tab, caret arrows and common Java snippets) sits above the native keyboard while you edit.
- **Errors**: lines named in compiler errors or stack traces are highlighted in the editor and the line number turns red; `Main.java:12` in the terminal jumps to that line. Editing clears the highlight.

### Preferences (saved in localStorage)
Everything you adjust is remembered per browser: theme, reminder on/off, the docked sidebar and its expanded sections, the IDE (open/closed, current problem, app-view width, terminal position, size and open state, editor text size and wrapping), the Question Bank difficulty filter, your code per problem, reading progress and test results. Line wrapping defaults to on for small screens until you choose otherwise. The reset button in the top-bar settings menu clears the layout and preference keys (not your code or progress).

Cursors follow the action: grab/grabbing on scrollable chip rows (drag to scroll), resize cursors on the drag handles, not-allowed on disabled controls, progress while code is running.

## Courses: Java and Rust
The app hosts two complete, independent courses. Pick one from the dropdown in the middle of the top bar, on the home page, or with Alt+O; the choice is remembered.

| | Java | Rust |
| --- | --- | --- |
| Roadmap | `content/roadmap.md` | `content/rust/roadmap.md` (6 phases, 17 sections) |
| 100 problems | `content/problems/*.txt` | `content/rust/problems/*.txt` (statements and test cases are shared; each course has its own solutions, approaches and starters) |
| Anti-patterns / scenarios | in the roadmap file (Parts 3 and 4) | in the Rust roadmap file (Parts 3 and 4) |
| Projects | `content/projects/java.md` | `content/rust/projects.md` |
| Phase tests | `JAVA_TESTS` in `src/lib/tests.ts` | `RUST_TESTS` in `src/lib/tests.ts` |

- **Separate progress and code.** Rust phases are stored as phase ids 101-106 in `phase_progress` / `test_attempts` (no schema change), locally under `rows:<user>:rust`. Your code is kept per course (`code:<n>` for Java, `code:rust:<n>` for Rust).
- **Rust in the IDE.** Rust highlighting, a Rust starter per problem (stubbed `impl` plus a `main` with the sample tests as comments), `rustc main.rs` in the terminal and error lines parsed from `--> main.rs:LINE`. Judge0 CE's default Rust is 1.40, so the solutions avoid newer APIs (they use `std::i32::MAX`, no `matches!`, etc.); set `VITE_RUST_LANG_ID` if your Judge0 has a newer toolchain.
- **Index-based variants.** A few problems cannot be written with safe owning pointers, so the Rust course changes their representation and says so in the statement: Copy List with Random Pointer (arena), both Linked List Cycle problems (`next` index vector) and Clone Graph (`Rc<RefCell<Node>>`).
- **Verification.** `node scripts/verify-rust.mjs` compiles every Rust solution (each in its own module) and runs its test check; all 100 pass on editions 2015, 2018 and 2021 (`--edition 2015|2018|2021`). The Java equivalent is `node scripts/verify-problems.mjs`. Rust code samples in the roadmap were compiled as well.

## Projects (Part 5)
Each course ends with eight projects to build, each describing **what it should do**, **how the tech flows** through it and **the problems it solves**.

## IDE theme
The IDE follows the app theme (settings menu, `…`): a dark editor in dark mode and a light one in light mode, including the terminal, popovers and the symbol keyboard. Syntax colours come from two palettes (VS Code Dark+ and a tuned Light+). Every colour was checked for at least 4.6:1 contrast against its background, including on the red error-line row, and line numbers use dedicated readable greys. Code blocks in the lessons stay dark in both themes.
