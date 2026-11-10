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
export type Project = { n: number; title: string; level: string; stack: string[]; what: string; flow: string; solves: string }

export type CourseId = 'java' | 'rust'
export type CourseData = {
  phases: Phase[]
  questions: LcQuestion[]
  antiPatterns: AntiPattern[]
  antiMatrix: AntiRow[]
  scenarios: Scenario[]
  scenarioMatrix: ScenarioRow[]
  projects: Project[]
}
export type CourseMeta = {
  id: CourseId
  name: string
  title: string
  tagline: string
  lang: 'java' | 'rust'        // syntax highlighting + runner language
  file: string                 // file name shown in the IDE
  build: string                // what the terminal says it ran
}

export const COURSES = data as unknown as Record<CourseId, CourseData>
export const COURSE_IDS: CourseId[] = ['java', 'rust']
export const COURSE_META: Record<CourseId, CourseMeta> = {
  java: { id: 'java', name: 'Java', title: 'Java Developer Mastery Roadmap', tagline: 'A plain-English backend study guide, then the question bank, code review and production scenarios.', lang: 'java', file: 'Main.java', build: 'javac Main.java && java Main' },
  rust: { id: 'rust', name: 'Rust', title: 'Rust Systems & Backend Mastery Roadmap', tagline: 'Six phases from ownership and the borrow checker to async services and production Rust.', lang: 'rust', file: 'main.rs', build: 'rustc main.rs && ./main' },
}
export const PASS_THRESHOLD = 0.8
export const leetUrl = (title: string) => `https://leetcode.com/problemset/?search=${encodeURIComponent(title.replace(/\s*\(.*\)/, ''))}`
