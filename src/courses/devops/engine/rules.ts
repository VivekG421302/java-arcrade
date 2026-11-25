// Evaluates a TerminalCommandRule (spec 4.1) after the learner runs a command, or after any state change (GUI actions, editor saves).
import type { TerminalCommandRule } from '../types'
import type { ExecResult } from './shellTypes'
import type { World } from './world'

export interface RuleCtx {
  command: string                  // what the learner typed (or a GUI action label)
  result: ExecResult | null        // null for pure state checks
  w: World
  log: string[]                    // every line typed since this step became active, in order (for `sequence`)
}
export interface RuleResult {
  passed: boolean
  /** The learner clearly tried this step's command (same program) but it did not satisfy the rule: counts towards hints and shows onFailMessage. */
  attempt: boolean
}

const norm = (s: string) => s.trim().replace(/\s+/g, ' ')
const flag = (r: TerminalCommandRule) => (r.caseSensitive ? '' : 'i')
export const STATE_KINDS = new Set<TerminalCommandRule['kind']>(['file-exists', 'process-running', 'port-listening', 'state-equals'])
/** State rules can pass without a command (the world is already in the right shape), so the lab may auto-advance past them. */
export const isStateRule = (r: TerminalCommandRule) => STATE_KINDS.has(r.kind)

const getPath = (root: unknown, path: string): unknown => path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), root)

const firstWord = (s: string) => /^(?:sudo\s+(?:-u\s+\w+\s+)?)?([\w.~/-]+)/.exec(s.replace(/^\^/, '').trim())?.[1]?.toLowerCase()

export function evaluateRule(rule: TerminalCommandRule, ctx: RuleCtx): RuleResult {
  const { w, result } = ctx
  const cmd = norm(ctx.command)
  const ok = result ? result.ok || rule.expected === 'any-exit' : true
  switch (rule.kind) {
    case 'exact': {
      const hit = rule.caseSensitive ? cmd === norm(rule.pattern ?? '') : cmd.toLowerCase() === norm(rule.pattern ?? '').toLowerCase()
      return { passed: hit && ok, attempt: !hit ? firstWord(cmd) === firstWord(rule.pattern ?? '') : !ok }
    }
    case 'regex': {
      const re = new RegExp(rule.pattern ?? '', flag(rule))
      const hit = re.test(cmd)
      return { passed: hit && ok, attempt: hit ? !ok : firstWord(cmd) !== undefined && firstWord(cmd) === firstWord(rule.pattern ?? '') }
    }
    case 'file-exists': {
      const [path, host] = rule.args ?? []
      const there = !!w.fs[(host as 'local' | 'remote') ?? 'remote'][path]
      return { passed: there === (rule.expected ?? true), attempt: false }
    }
    case 'process-running': {
      const re = new RegExp(rule.pattern ?? '', flag(rule))
      const running = w.procs.some((p) => re.test(p.cmd))
      return { passed: running === (rule.expected ?? true), attempt: false }
    }
    case 'port-listening': {
      const port = String(rule.expected ?? rule.pattern)
      const pid = w.state.listeners[port]
      const kind = rule.args?.[0]
      const proc = pid != null ? w.procs.find((p) => p.pid === pid) : undefined
      return { passed: pid != null && (!kind || proc?.kind === kind || (kind === 'java' && proc?.kind === 'app')), attempt: false }
    }
    case 'state-equals': {
      const v = getPath({ ...w.state, x: w.x }, rule.pattern ?? '')
      return { passed: String(v) === String(rule.expected), attempt: false }
    }
    case 'output-contains-all': {
      const text = result?.text ?? ''
      const hay = rule.caseSensitive ? text : text.toLowerCase()
      return { passed: !!result && (rule.args ?? []).every((a) => hay.includes(rule.caseSensitive ? a : a.toLowerCase())), attempt: false }
    }
    case 'sequence': {
      let i = 0
      for (const line of ctx.log) {
        if (i < (rule.args ?? []).length && new RegExp(rule.args![i], flag(rule)).test(norm(line))) i++
      }
      return { passed: i === (rule.args ?? []).length, attempt: false }
    }
  }
}
