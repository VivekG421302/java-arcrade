// Tracks the learner's progress through a stage and validates every action against the active step's TerminalCommandRule.
// Enforces the unlock gate (spec 4.4.5): labs complete + chaos labs fixed + quiz pass + stage-specific checks.
import type { ChaosIncident, CourseStage, InteractiveLab, LabStep } from '../types'
import { evaluateRule, isStateRule } from './rules'
import type { SimEvent, Simulator } from './session'

export type TargetRef = { kind: 'lab' | 'chaos'; id: string }
export interface Progress {
  v: 1
  imagineRead: boolean
  labs: Record<string, { step: number; done: boolean }>
  chaos: Record<string, { injected: boolean; step: number; done: boolean }>
  attempts: Record<string, number>
  gate: Record<string, boolean>
  quiz: { passed: boolean; best: number }
  focus: TargetRef | null
  stageComplete: boolean
}
export interface Feedback { kind: 'pass' | 'fail' | 'done'; text: string; at: number }
export interface StepView {
  ref: TargetRef
  title: string
  step: LabStep
  index: number
  total: number
  phase: 'lab' | 'diagnose' | 'fix'
  attempts: number
  hintOpen: boolean
}

const fresh = (): Progress => ({ v: 1, imagineRead: false, labs: {}, chaos: {}, attempts: {}, gate: {}, quiz: { passed: false, best: 0 }, focus: null, stageComplete: false })

export class Tracker {
  p: Progress
  version = 0
  feedback: Feedback | null = null
  private log: string[] = []
  private listeners = new Set<() => void>()
  private readonly key: string

  constructor(readonly stage: CourseStage, private sim: Simulator) {
    this.key = `devops:v1:progress:${stage.id}`
    this.p = this.load()
    sim.onEvent = (e) => this.onEvent(e)
    if (!this.p.focus) this.p.focus = { kind: 'lab', id: this.firstOpenLab()?.id ?? stage.labs[0].id }
  }

  // ---- store plumbing ----
  subscribe = (l: () => void) => { this.listeners.add(l); return () => { this.listeners.delete(l) } }
  getVersion = () => this.version
  private commit() { this.version++; try { localStorage.setItem(this.key, JSON.stringify(this.p)) } catch { /* ignore */ } this.listeners.forEach((l) => l()) }
  private load(): Progress {
    try { const d = JSON.parse(localStorage.getItem(this.key) ?? 'null'); if (d?.v === 1) return { ...fresh(), ...d } } catch { /* fall through */ }
    return fresh()
  }

  // ---- lookups ----
  lab(id: string): InteractiveLab | undefined { return this.stage.labs.find((l) => l.id === id) }
  incident(id: string): ChaosIncident | undefined { return this.stage.chaosLabs.find((c) => c.id === id) }
  stepsOf(ref: TargetRef): LabStep[] {
    if (ref.kind === 'lab') return this.lab(ref.id)?.steps ?? []
    const c = this.incident(ref.id)
    return c ? [...c.diagnosticTrail, ...c.exactFix] : []
  }
  private stepIndex(ref: TargetRef) { return ref.kind === 'lab' ? this.p.labs[ref.id]?.step ?? 0 : this.p.chaos[ref.id]?.step ?? 0 }
  private isDone(ref: TargetRef) { return ref.kind === 'lab' ? !!this.p.labs[ref.id]?.done : !!this.p.chaos[ref.id]?.done }
  private firstOpenLab() { return this.stage.labs.find((l) => !this.p.labs[l.id]?.done) }

  labDone = (id: string) => !!this.p.labs[id]?.done
  allLabsDone = () => this.stage.labs.every((l) => this.labDone(l.id))
  labUnlocked(id: string) { const i = this.stage.labs.findIndex((l) => l.id === id); return i <= 0 || this.labDone(this.stage.labs[i - 1].id) }
  chaosUnlocked = () => this.allLabsDone()
  chaosDone = (id: string) => !!this.p.chaos[id]?.done
  quizUnlocked = () => this.allLabsDone() && this.stage.unlockGate.requiredChaosIds.every((id) => this.chaosDone(id))

  gateItems() {
    const g = this.stage.unlockGate
    return [
      ...g.requiredLabIds.map((id) => ({ id, label: this.lab(id)?.title ?? id, done: this.labDone(id) })),
      ...g.requiredChaosIds.map((id) => ({ id, label: `Fix ${this.incident(id)?.title ?? id}`, done: this.chaosDone(id) })),
      ...g.checks.map((c) => ({ id: c.id, label: c.label, done: !!this.p.gate[c.id] })),
      { id: 'quiz', label: `Pass the quiz (${Math.round(g.quiz.passMark * 100)}%)`, done: this.p.quiz.passed },
    ]
  }
  isComplete = () => this.gateItems().every((i) => i.done)

  current(): StepView | null {
    const ref = this.p.focus
    if (!ref || this.isDone(ref)) return null
    const steps = this.stepsOf(ref)
    const index = this.stepIndex(ref)
    const step = steps[index]
    if (!step) return null
    const inc = ref.kind === 'chaos' ? this.incident(ref.id) : undefined
    const attempts = this.p.attempts[`${ref.id}#${index}`] ?? 0
    return {
      ref, step, index, total: steps.length, attempts, hintOpen: attempts >= step.hintAfterAttempts,
      title: ref.kind === 'lab' ? this.lab(ref.id)!.title : inc!.title,
      phase: ref.kind === 'lab' ? 'lab' : index < inc!.diagnosticTrail.length ? 'diagnose' : 'fix',
    }
  }

  // ---- actions ----
  focus(ref: TargetRef) {
    if (ref.kind === 'lab' ? !this.labUnlocked(ref.id) : !this.chaosUnlocked()) return
    this.p.focus = ref
    this.log = []
    this.autoAdvance()
    this.commit()
  }
  markImagineRead() { if (!this.p.imagineRead) { this.p.imagineRead = true; this.commit() } }
  /** Reveal the hint right away (the learner asked); attempts are bumped to the step's threshold. */
  askHint() {
    const c = this.current()
    if (!c) return
    this.p.attempts[`${c.ref.id}#${c.index}`] = Math.max(c.attempts, c.step.hintAfterAttempts)
    this.commit()
  }

  inject(id: string) {
    const c = this.incident(id)
    if (!c || !this.chaosUnlocked()) return
    this.p.chaos[id] = { injected: true, step: 0, done: false }
    this.p.focus = { kind: 'chaos', id }
    this.log = []
    this.feedback = null
    this.commit()
    this.sim.inject(c.injectionScript)
  }

  submitQuiz(answers: number[]) {
    const q = this.stage.unlockGate.quiz
    const correct = q.questions.filter((x, i) => answers[i] === x.answerIndex).length
    const score = correct / q.questions.length
    this.p.quiz = { passed: this.p.quiz.passed || score >= q.passMark, best: Math.max(this.p.quiz.best, score) }
    this.checkComplete()
    this.commit()
    return { score, correct, passed: score >= q.passMark }
  }

  resetProgress() {
    this.p = fresh()
    this.p.focus = { kind: 'lab', id: this.stage.labs[0].id }
    this.feedback = null
    this.log = []
    this.commit()
  }

  // ---- validation ----
  onEvent(e: SimEvent) {
    const w = this.sim.world
    const typed = !e.command.startsWith('[') && e.command !== '^C'
    if (typed) this.log.push(e.command)
    // stage-wide gate observations
    if (e.result && typed) {
      for (const c of this.stage.unlockGate.checks) {
        if (!this.p.gate[c.id] && new RegExp(c.commandPattern).test(e.command.trim()) && evaluateRule(c.rule, { command: e.command, result: e.result, w, log: this.log }).passed) this.p.gate[c.id] = true
      }
    }
    const cur = this.current()
    if (cur) {
      const res = evaluateRule(cur.step.validation, { command: e.command, result: e.result, w, log: this.log })
      const k = `${cur.ref.id}#${cur.index}`
      if (res.passed) this.advance(cur)
      else if (res.attempt && typed) {
        this.p.attempts[k] = (this.p.attempts[k] ?? 0) + 1
        const msg = cur.step.validation.onFailMessage
        this.feedback = { kind: 'fail', text: msg && e.result?.ok ? msg : 'Not quite what this step needs. Read the instruction again, or open the hint.', at: Date.now() }
        if (msg && e.result?.ok) this.sim.current.lines.push({ t: 'err', s: msg })
      }
    }
    this.checkComplete()
    this.commit()
  }

  private advance(cur: StepView) {
    const ref = cur.ref
    const next = cur.index + 1
    this.log = []
    if (ref.kind === 'lab') this.p.labs[ref.id] = { step: next, done: next >= cur.total }
    else this.p.chaos[ref.id] = { injected: true, step: next, done: next >= cur.total }
    const finished = next >= cur.total
    this.feedback = { kind: finished ? 'done' : 'pass', text: finished ? (ref.kind === 'chaos' ? `Fixed! ${this.incident(ref.id)!.lesson}` : `${cur.title} complete.`) : 'Step complete.', at: Date.now() }
    if (finished && ref.kind === 'lab') {
      const nx = this.stage.labs[this.stage.labs.findIndex((l) => l.id === ref.id) + 1]
      if (nx) this.p.focus = { kind: 'lab', id: nx.id }
    } else if (!finished) this.autoAdvance()
  }

  /** Steps whose rule only looks at the world (file exists, port listening, ...) pass as soon as the world is right. */
  private autoAdvance() {
    for (let guard = 0; guard < 12; guard++) {
      const c = this.current()
      if (!c || !isStateRule(c.step.validation)) return
      if (!evaluateRule(c.step.validation, { command: '', result: null, w: this.sim.world, log: [] }).passed) return
      const ref = c.ref, next = c.index + 1, total = c.total
      if (ref.kind === 'lab') this.p.labs[ref.id] = { step: next, done: next >= total }
      else this.p.chaos[ref.id] = { injected: true, step: next, done: next >= total }
      if (next >= total) return
    }
  }

  private checkComplete() {
    if (!this.p.stageComplete && this.isComplete()) {
      this.p.stageComplete = true
      this.feedback = { kind: 'done', text: `Stage ${this.stage.number} complete: the next stage is unlocked.`, at: Date.now() }
    }
  }
}
