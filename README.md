# Java Mastery Platform

A phase-gated learning app that renders `content/roadmap.md` (Part 1 roadmap, Part 2 LeetCode bank, Part 3 anti-patterns, Part 4 production scenarios).
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
