import data from '../exercises.json'
import type { CourseId } from './content'

/** A hands-on exercise placed between two sections of a module. Solved when a run prints every value in `expect` (see lib/solved.ts). */
export type Exercise = {
  id: string; module: number; after: number      // module = position in the course; after = shown after this section (1-based)
  title: string; level: string; task: string; hint: string
  expect: string[][]; starter: string; solution: string
}

const ALL = data as unknown as Partial<Record<CourseId, Exercise[]>>
export const exercisesOf = (course: CourseId): Exercise[] => ALL[course] ?? []
export const exerciseById = (course: CourseId, id: string | null) => (id ? exercisesOf(course).find((e) => e.id === id) : undefined)
