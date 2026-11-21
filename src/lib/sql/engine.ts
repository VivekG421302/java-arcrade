// Runs a SQL script like `psql -f query.sql` against a PGlite database and prints the result the way psql does.
// No browser or bundler imports here: the in-app worker (worker.ts) and the Node verifier (scripts/verify-exercises.mjs) share this exact code.

type Field = { name: string; dataTypeID: number }
type Res = { rows: unknown[][]; fields: Field[]; command?: string; rowCount?: number; affectedRows?: number }
type Notice = { severity?: string; message: string }
export type SqlDb = { exec: (sql: string, opts?: Record<string, unknown>) => Promise<Res[]> }
export type ScriptResult = { stdout: string; stderr: string; failed: boolean }

export type Stmt = { text: string; line: number; meta: boolean }

/** Splits a script at `;` the way psql does: semicolons inside comments, 'strings', "identifiers" and $tag$ bodies$tag$ do not end a statement. */
export function splitStatements(sql: string): Stmt[] {
  const nl: number[] = []
  for (let k = 0; k < sql.length; k++) if (sql[k] === '\n') nl.push(k)
  const lineAt = (idx: number) => { let lo = 0, hi = nl.length; while (lo < hi) { const mid = (lo + hi) >> 1; if (nl[mid] < idx) lo = mid + 1; else hi = mid } return lo + 1 }

  const out: Stmt[] = []
  const n = sql.length
  let i = 0, from = -1
  const end = (upto: number) => { if (from >= 0) { out.push({ text: sql.slice(from, upto).trim(), line: lineAt(from), meta: false }); from = -1 } }
  while (i < n) {
    const c = sql[i]
    if (c === '-' && sql[i + 1] === '-') { const j = sql.indexOf('\n', i); i = j < 0 ? n : j; continue }
    if (c === '/' && sql[i + 1] === '*') {   // block comments nest in PostgreSQL
      let depth = 1, j = i + 2
      while (j < n && depth) { if (sql[j] === '/' && sql[j + 1] === '*') { depth++; j += 2 } else if (sql[j] === '*' && sql[j + 1] === '/') { depth--; j += 2 } else j++ }
      i = j; continue
    }
    if (from < 0) {
      if (/\s/.test(c)) { i++; continue }
      if (c === '\\') { const j = sql.indexOf('\n', i); const e = j < 0 ? n : j; out.push({ text: sql.slice(i, e).trim(), line: lineAt(i), meta: true }); i = e; continue }   // psql meta-command
      from = i
    }
    if (c === ';') { end(i); i++; continue }
    if (c === "'") {
      const esc = /[eE]/.test(sql[i - 1] ?? '') && !/\w/.test(sql[i - 2] ?? '')   // E'...' allows backslash escapes
      let j = i + 1
      while (j < n) {
        if (esc && sql[j] === '\\') { j += 2; continue }
        if (sql[j] === "'") { if (sql[j + 1] === "'") { j += 2; continue } break }
        j++
      }
      i = j + 1; continue
    }
    if (c === '"') {
      let j = i + 1
      while (j < n) { if (sql[j] === '"') { if (sql[j + 1] === '"') { j += 2; continue } break } j++ }
      i = j + 1; continue
    }
    if (c === '$' && !/\w/.test(sql[i - 1] ?? '')) {
      const m = /^\$([A-Za-z_\u0080-\uffff][\w\u0080-\uffff]*)?\$/.exec(sql.slice(i, i + 80))
      if (m) { const close = sql.indexOf(m[0], i + m[0].length); i = close < 0 ? n : close + m[0].length; continue }
    }
    i++
  }
  end(n)
  return out
}

const NUMERIC = new Set([20, 21, 23, 26, 700, 701, 1700])   // int8, int2, int4, oid, float4, float8, numeric: psql right-aligns these
const MAX_SHOWN = 200

const cell = (v: unknown): string => (v === null || v === undefined ? '' : Array.isArray(v) ? `{${v.join(',')}}` : typeof v === 'object' ? JSON.stringify(v) : String(v))

/** psql's default "aligned" layout: centred header, `-+-` rule, right-aligned numbers and a "(n rows)" footer. */
export function formatTable(fields: Field[], rows: unknown[][], total = rows.length): string {
  const head = fields.map((f) => f.name)
  const body = rows.map((r) => head.map((_, i) => cell(r[i])))
  const w = head.map((h, i) => Math.max(h.length, ...body.map((r) => r[i].length)))
  const num = fields.map((f) => NUMERIC.has(f.dataTypeID))
  const line = (cols: string[], header: boolean) =>
    cols.map((t, i) => {
      const room = w[i] - t.length
      const s = header ? ' '.repeat(Math.floor(room / 2)) + t + ' '.repeat(room - Math.floor(room / 2)) : num[i] ? ' '.repeat(room) + t : t + ' '.repeat(room)
      return ` ${s} `
    }).join('|').replace(/\s+$/, '')
  const out = [line(head, true), w.map((x) => '-'.repeat(x + 2)).join('+'), ...body.map((r) => line(r, false))]
  out.push(total === rows.length ? `(${total} row${total === 1 ? '' : 's'})` : `(${total} rows, the first ${rows.length} are shown)`)
  return out.join('\n')
}

const OBJECTS = 'TABLE|INDEX|VIEW|SCHEMA|FUNCTION|PROCEDURE|SEQUENCE|TYPE|DOMAIN|EXTENSION|TRIGGER|ROLE|USER|GROUP|DATABASE|POLICY|RULE|AGGREGATE|OPERATOR|COLLATION|CAST|STATISTICS|PUBLICATION|SUBSCRIPTION|TABLESPACE|LANGUAGE|SERVER|EVENT TRIGGER|FOREIGN TABLE|MATERIALIZED VIEW|CONSTRAINT|COLUMN'
const TAG_RE = new RegExp(`^(CREATE|ALTER|DROP)\\s+(?:OR\\s+REPLACE\\s+|(?:GLOBAL|LOCAL|TEMP|TEMPORARY|UNLOGGED|UNIQUE|RECURSIVE|TRUSTED|PROCEDURAL)\\s+)*(${OBJECTS})\\b`, 'i')

/** The line psql prints after a statement that returns no rows, e.g. `CREATE TABLE` or `INSERT 0 3`. */
function commandTag(text: string, r: Res): string {
  const cmd = (r.command ?? text.split(/\s+/)[0]).toUpperCase()
  const n = r.rowCount ?? r.affectedRows ?? 0
  if (cmd === 'INSERT') return `INSERT 0 ${n}`
  if (['UPDATE', 'DELETE', 'MERGE', 'COPY', 'MOVE', 'FETCH', 'SELECT'].includes(cmd)) return `${cmd} ${n}`
  if (cmd === 'TRUNCATE') return 'TRUNCATE TABLE'
  const m = TAG_RE.exec(text)
  return m ? `${m[1].toUpperCase()} ${m[2].toUpperCase().replace(/\s+/g, ' ')}` : cmd
}

const SILENT = new Set(['SELECT', 'SHOW', 'EXPLAIN', 'VALUES', 'TABLE', 'WITH'])

function formatError(s: Stmt, e: unknown): string {
  const err = e as { message?: string; severity?: string; position?: string; detail?: string; hint?: string; where?: string }
  const pos = Number(err.position)
  let abs = s.line, extra = ''
  if (Number.isFinite(pos) && pos > 0) {
    const before = s.text.slice(0, pos - 1)
    const rel = before.split('\n').length
    abs = s.line + rel - 1
    const label = `LINE ${rel}: `
    const col = before.length - (before.lastIndexOf('\n') + 1)
    extra = `\n${label}${s.text.split('\n')[rel - 1]}\n${' '.repeat(label.length + col)}^`
  }
  return `psql:query.sql:${abs}: ${err.severity ?? 'ERROR'}:  ${err.message ?? String(e)}${extra}` +
    (err.detail ? `\nDETAIL:  ${err.detail}` : '') + (err.hint ? `\nHINT:  ${err.hint}` : '') + (err.where ? `\nCONTEXT:  ${err.where}` : '')
}

const parserCache = new WeakMap<object, Record<number, (v: string) => string>>()
/** Every built-in type (arrays included) is read back as the text PostgreSQL itself prints, so jsonb, timestamps, arrays and numbers look exactly like psql. */
async function textParsers(db: SqlDb) {
  let p = parserCache.get(db)
  if (!p) {
    p = {}
    const [r] = await db.exec('SELECT oid::int FROM pg_type', { rowMode: 'array' })
    for (const row of r.rows) p[Number(row[0])] = (v: string) => v
    parserCache.set(db, p)
  }
  return p
}

const RESET = String.raw`
DO $reset$ DECLARE r record; BEGIN
  FOR r IN SELECT nspname FROM pg_namespace WHERE nspname NOT LIKE 'pg\_%' AND nspname <> 'information_schema' LOOP
    EXECUTE format('DROP SCHEMA %I CASCADE', r.nspname);
  END LOOP;
  FOR r IN SELECT rolname FROM pg_roles WHERE rolname NOT LIKE 'pg\_%' AND rolname <> 'postgres' LOOP
    EXECUTE format('DROP OWNED BY %I', r.rolname);
    EXECUTE format('DROP ROLE %I', r.rolname);
  END LOOP;
END $reset$;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO PUBLIC;
COMMENT ON SCHEMA public IS 'standard public schema';`

/** Back to a fresh database: drops everything a script created (schemas, roles), ends any open transaction and clears session settings. */
export async function resetDb(db: SqlDb) {
  await db.exec('ROLLBACK').catch(() => undefined)   // only a warning when no transaction is open
  await db.exec('DISCARD ALL')
  await db.exec(RESET)
}

/** Runs every statement in order (like `psql -f`: an error does not stop the script) and returns what psql would have printed. */
export async function runScript(db: SqlDb, source: string): Promise<ScriptResult> {
  const parsers = await textParsers(db)
  const out: string[] = []
  const err: string[] = []
  const opts = { rowMode: 'array', parsers, onNotice: (nt: Notice) => out.push(`${nt.severity ?? 'NOTICE'}:  ${nt.message}`) }
  for (const s of splitStatements(source)) {
    if (s.meta) { err.push(`psql:query.sql:${s.line}: ERROR:  the psql command ${s.text.split(/\s+/)[0]} is not available here; use SQL instead (for example SELECT * FROM pg_tables WHERE schemaname = 'public')`); continue }
    try {
      const [r] = await db.exec(s.text, opts)
      if (!r) continue
      if (r.fields.length) {
        out.push(formatTable(r.fields, r.rows.slice(0, MAX_SHOWN), r.rows.length) + '\n')
        if (!SILENT.has((r.command ?? '').toUpperCase())) out.push(commandTag(s.text, r))
      } else out.push(commandTag(s.text, r))
    } catch (e) {
      if (!(e instanceof Error) || !('severity' in e)) throw e   // not a database error (e.g. the engine itself died): let the caller restart it
      err.push(formatError(s, e))
    }
  }
  return { stdout: out.join('\n') + (out.length ? '\n' : ''), stderr: err.join('\n') + (err.length ? '\n' : ''), failed: err.length > 0 }
}
