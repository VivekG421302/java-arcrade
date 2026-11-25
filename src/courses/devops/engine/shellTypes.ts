import type { Fs } from './fs'
import type { World } from './world'

export interface SshCtx { id: number; user: string; cwd: string }

export type Repl =
  | { kind: 'psql'; user: string; db: string; buf: string }
  | { kind: 'sftp'; lcwd: string; rcwd: string }
  | { kind: 'password'; label: string; replay: string }   // `psql -h localhost -U shopuser` asking for the password

/** One terminal tab. `ssh` is the PuTTY-style session nested inside it. */
export interface Shell {
  id: number
  localCwd: string
  localHistory: string[]
  ssh: SshCtx | null
  repl: Repl | null
}

export interface OutLine { t: 'out' | 'err' | 'sys'; s: string }

/** The terminal pane keeps the prompt blocked until Ctrl+C: `tail -f` and a foreground `java -jar`. */
export interface Hold { kind: 'follow' | 'fg'; label: string; host: 'local' | 'remote'; path?: string; pid?: number }

export interface ExecResult {
  out: OutLine[]
  /** The command did what it was meant to. Distinct from exit status: a backgrounded app that crashes right away exits 0 but is not ok. */
  ok: boolean
  exit: number
  text: string                      // ANSI-stripped stdout+stderr, what validation rules match against
  hold?: Hold
  edit?: { host: 'local' | 'remote'; path: string; sudo: boolean }
  clear?: boolean
  closeTab?: boolean
  secret?: boolean                  // next line typed is a password (masked)
}

export interface CmdCtx {
  w: World
  sh: Shell
  argv: string[]                    // argv[0] is the command name
  stdin: string | null
  stdout: string[]
  stderr: string[]
  host: 'local' | 'remote'
  user: string
  home: string
  cwd: string
  fs: Fs
  sudo: boolean
  immune: boolean                   // started under nohup / setsid: ignores SIGHUP
  bg: boolean
  redir: { stdout: boolean; stderr: boolean; errToOut: boolean }
  pipeNext: string[] | null
  env: Record<string, string>
  result: Partial<ExecResult>
  setCwd: (p: string) => void
  abs: (p: string) => string
  out: (s: string) => void
  err: (s: string) => void
  tip: (s: string) => void
  /** A line printed by the shell itself (job notices like `[1] 2317`): never captured by `>` redirects. */
  note: (s: string, when?: 'pre' | 'post') => void
  exec: (sh: Shell, line: string) => Promise<ExecResult>
  /** Run another command in this same context (used by sudo / nohup / setsid wrappers). */
  run: (argv: string[], patch?: Partial<CmdCtx>) => Promise<number>
}

export type CmdFn = (c: CmdCtx) => number | Promise<number>

export const ANSI = { green: '\x1b[1;32m', red: '\x1b[1;31m', dim: '\x1b[2m', off: '\x1b[0m' }
// eslint-disable-next-line no-control-regex
export const stripAnsi = (s: string) => s.replace(/\x1b\[[0-9;]*m/g, '')

/** Runs an engine-side SQL script (the app wires this to the existing PGlite worker; tests may leave it unset). */
export interface SqlBridge { run: ((sql: string) => Promise<{ stdout: string; stderr: string }>) | null }
export const sqlBridge: SqlBridge = { run: null }
