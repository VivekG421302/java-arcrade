// Runs Java on a Judge0 server (public CE instance by default). Browsers cannot run javac, so this needs internet.
// Override with VITE_JUDGE0_URL (e.g. your own Judge0) and VITE_JAVA_LANG_ID (91 = Java 17 on Judge0 CE 1.13.1).
const BASE = ((import.meta.env.VITE_JUDGE0_URL as string | undefined) || 'https://ce.judge0.com').replace(/\/$/, '')
export type Lang = 'java' | 'rust'
// Judge0 CE ids: 91 = Java 17, 73 = Rust 1.40 (older instances). Override per deployment.
const LANG_ID: Record<Lang, number> = { java: Number(import.meta.env.VITE_JAVA_LANG_ID || 91), rust: Number(import.meta.env.VITE_RUST_LANG_ID || 73) }

export type RunResult = { stdout: string; stderr: string; compile: string; status: string; time: string | null; memory: number | null }

export async function runCode(lang: Lang, source: string, stdin = ''): Promise<RunResult> {
  let token: string
  try {
    const res = await fetch(`${BASE}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ source_code: source, language_id: LANG_ID[lang], stdin }),
    })
    if (!res.ok) throw new Error(`compiler service replied ${res.status}${res.status === 429 ? ' (rate limited, try again shortly)' : ''}`)
    token = (await res.json()).token
  } catch (e) {
    throw new Error(e instanceof TypeError ? `Could not reach the compiler service at ${BASE}. Check your connection or set VITE_JUDGE0_URL.` : String(e instanceof Error ? e.message : e))
  }

  for (let i = 0; i < 40; i++) {
    await new Promise((r) => setTimeout(r, 700))
    const res = await fetch(`${BASE}/submissions/${token}?base64_encoded=false&fields=stdout,stderr,compile_output,message,status,time,memory`)
    if (!res.ok) throw new Error(`compiler service replied ${res.status}`)
    const j = await res.json()
    if (j.status && j.status.id > 2) {
      return {
        stdout: j.stdout ?? '',
        stderr: [j.stderr, j.message].filter(Boolean).join('\n'),
        compile: j.compile_output ?? '',
        status: j.status.description,
        time: j.time,
        memory: j.memory,
      }
    }
  }
  throw new Error('Timed out waiting for the compiler service.')
}

/** Line numbers mentioned in errors: `Main.java:12: error`, `at Main.main(Main.java:7)` (Java) or `--> main.rs:5:9`, `panicked at main.rs:7:5` (Rust). */
export function errorLines(r: Pick<RunResult, 'stderr' | 'compile' | 'status'>): number[] {
  if (/^accepted$/i.test(r.status)) return []
  const lines = new Set<number>()
  for (const m of `${r.compile}\n${r.stderr}`.matchAll(/(?:Main\.java|main\.rs):(\d+)/g)) lines.add(Number(m[1]))
  return [...lines].sort((a, b) => a - b)
}
