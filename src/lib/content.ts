import data from '../content.json'

export type Section = { id: string; title: string; md: string }
export type Phase = { id: number; title: string; sections: Section[] }
export type TestCase = { input: string; output: string }
export type LcQuestion = {
  n: number; title: string; lc: number; difficulty: string; target: string; category: string
  statement: string; tests: TestCase[]; approach: string; code: string; defs?: string; starter: string
}
export type AntiPattern = { n: number; title: string; lang: string; bad: string; good: string; why: string }
export type AntiRow = { n: number; domain: string; pattern: string; severity: string; cause: string; fix: string }
export type Scenario = { n: number; title: string; question: string; answer: string }
export type ScenarioRow = { n: number; symptom: string; cause: string; fix: string }

export const content = data as unknown as {
  phases: Phase[]
  questions: LcQuestion[]
  antiPatterns: AntiPattern[]
  antiMatrix: AntiRow[]
  scenarios: Scenario[]
  scenarioMatrix: ScenarioRow[]
}
export const PHASES = content.phases
export const leetUrl = (title: string) => `https://leetcode.com/problemset/?search=${encodeURIComponent(title.replace(/\s*\(.*\)/, ''))}`
export const PASS_THRESHOLD = 0.8
