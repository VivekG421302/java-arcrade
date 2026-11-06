import { createContext, useContext, useMemo, type ReactNode } from 'react'
import { COURSES, COURSE_IDS, COURSE_META, type CourseData, type CourseId, type CourseMeta } from '../lib/content'
import { usePersisted } from './usePersisted'

type Ctx = { course: CourseId; setCourse: (c: CourseId) => void; data: CourseData; meta: CourseMeta }
const C = createContext<Ctx>(null!)

/** The active course (Java or Rust), remembered between visits. Everything course-specific reads from here. */
export function CourseProvider({ children }: { children: ReactNode }) {
  const [saved, setCourse] = usePersisted<CourseId>('ui:course', 'java')
  const course: CourseId = COURSE_IDS.includes(saved) ? saved : 'java'
  const value = useMemo<Ctx>(() => ({ course, setCourse, data: COURSES[course], meta: COURSE_META[course] }), [course, setCourse])
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useCourse = () => useContext(C)
