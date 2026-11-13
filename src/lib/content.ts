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

export type CourseId = 'java' | 'rust' | 'postgres'
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
  unit: 'Module' | 'Phase'     // what one gated step of the roadmap is called in the UI
  lang: 'java' | 'rust' | 'sql' // syntax highlighting + runner language
  ide: boolean                 // has a runnable in-app IDE (SQL has none yet)
  off: number                  // Supabase phase_id offset, so every course shares one table (Java 201+, Rust 301+, PostgreSQL 401+)
  sfx: string                  // localStorage suffix for this course's progress
  file: string                 // file name shown in the IDE
  build: string                // what the terminal says it ran
}

export const COURSES = data as unknown as Record<CourseId, CourseData>
export const COURSE_IDS: CourseId[] = ['java', 'rust', 'postgres']
export const COURSE_META: Record<CourseId, CourseMeta> = {
  java: { id: 'java', name: 'Java', title: 'Java Developer Mastery Roadmap', tagline: 'Eleven modules, from the story of Java and plain-English backend ideas to Spring, databases and production.', unit: 'Module', lang: 'java', ide: true, off: 200, sfx: ':mod', file: 'Main.java', build: 'javac Main.java && java Main' },
  rust: { id: 'rust', name: 'Rust', title: 'Rust Systems & Backend Mastery Roadmap', tagline: 'Seven modules from the memory model and ownership to async runtimes, web services, databases and production Rust.', unit: 'Module', lang: 'rust', ide: true, off: 300, sfx: ':rustmod', file: 'main.rs', build: 'rustc main.rs && ./main' },
  postgres: { id: 'postgres', name: 'PostgreSQL', title: 'PostgreSQL & pgAdmin 4 Zero-to-Production Roadmap', tagline: 'Modules from the process architecture and pgAdmin 4 to data modelling, constraints and partitioning, each chapter told as a pain, a fix and what the fix cost.', unit: 'Module', lang: 'sql', ide: false, off: 400, sfx: ':pgmod', file: 'query.sql', build: 'psql -f query.sql' },
}
export const PASS_THRESHOLD = 0.8
export const leetUrl = (title: string) => `https://leetcode.com/problemset/?search=${encodeURIComponent(title.replace(/\s*\(.*\)/, ''))}`
