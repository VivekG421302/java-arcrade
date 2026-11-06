import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { PASS_THRESHOLD, type Phase } from '../lib/content'
import { useAuth } from './useAuth'
import { useCourse } from './useCourse'

export type Status = 'locked' | 'in_progress' | 'completed'
export type Row = { phase_id: number; status: Status; test_score: number | null; attempts: number; completed_at: string | null }

const load = <T,>(k: string, d: T): T => {
  try { const v = localStorage.getItem(k); return v ? (JSON.parse(v) as T) : d } catch { return d }
}
const save = (k: string, v: unknown) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }
const today = () => new Date().toISOString().slice(0, 10)

export const MAX_ATTEMPTS = 3
const LOCK_MS = 24 * 3600 * 1000

type Ctx = {
  statusOf: (id: number) => Status
  row: (id: number) => Row | undefined
  isRead: (sectionId: string) => boolean
  toggleRead: (sectionId: string) => void
  readPct: (p: Phase) => number
  lockedUntil: (id: number) => number
  attemptsLeft: (id: number) => number
  submit: (phaseId: number, answers: unknown, score: number) => Promise<boolean>
  streak: number
  current: number
}
const C = createContext<Ctx>(null!)

export function ProgressProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { course, data: courseData } = useCourse()
  const PHASES = courseData.phases
  const uid = user?.id ?? 'guest'
  const off = course === 'rust' ? 100 : 0          // Supabase phase_id offset so both courses share one table
  const sfx = course === 'rust' ? ':rust' : ''      // localStorage suffix (Java keys stay unchanged)
  const [rows, setRows] = useState<Record<number, Row>>({})
  const [read, setRead] = useState<Record<string, boolean>>({})
  const [streak, setStreak] = useState(1)
  const [, bump] = useState(0)

  useEffect(() => {
    setRows(load(`rows:${uid}${sfx}`, {}))
    setRead(load(`read:${uid}`, {}))
    const days = Array.from(new Set([...load<string[]>(`days:${uid}`, []), today()])).sort()
    save(`days:${uid}`, days)
    let s = 0
    for (let d = new Date(); days.includes(d.toISOString().slice(0, 10)); d.setDate(d.getDate() - 1)) s++
    setStreak(s)
    if (supabase && user) {
      supabase.from('phase_progress').select('*').eq('user_id', user.id).then(({ data }) => {
        if (!data) return
        const r: Record<number, Row> = {}
        data.filter((d) => (off ? d.phase_id > off : d.phase_id <= 100)).forEach((d) => (r[d.phase_id - off] = { ...(d as Row), phase_id: d.phase_id - off }))
        setRows((prev) => ({ ...prev, ...r }))
      })
    }
  }, [uid, course]) // eslint-disable-line react-hooks/exhaustive-deps

  const statusOf = useCallback(
    (id: number): Status =>
      rows[id]?.status === 'completed' ? 'completed' : id === 1 || rows[id - 1]?.status === 'completed' ? 'in_progress' : 'locked',
    [rows]
  )

  const lockedUntil = (id: number) => {
    const u = load<number>(`lock:${uid}${sfx}:${id}`, 0)
    return u > Date.now() ? u : 0
  }
  const sessKey = (id: number) => `att:${uid}${sfx}:${id}`
  const attemptsLeft = (id: number) =>
    lockedUntil(id) ? 0 : MAX_ATTEMPTS - Number(sessionStorage.getItem(sessKey(id)) ?? 0)

  const submit: Ctx['submit'] = async (phaseId, answers, score) => {
    const passed = score >= PASS_THRESHOLD
    const n = Number(sessionStorage.getItem(sessKey(phaseId)) ?? 0) + 1
    if (!passed && n >= MAX_ATTEMPTS) {
      save(`lock:${uid}${sfx}:${phaseId}`, Date.now() + LOCK_MS)
      sessionStorage.removeItem(sessKey(phaseId))
    } else sessionStorage.setItem(sessKey(phaseId), String(passed ? 0 : n))

    const prev = rows[phaseId]
    const pct = Math.round(score * 100)
    const next: Row = {
      phase_id: phaseId,
      status: passed || prev?.status === 'completed' ? 'completed' : 'in_progress',
      test_score: Math.max(prev?.test_score ?? 0, pct),
      attempts: (prev?.attempts ?? 0) + 1,
      completed_at: prev?.completed_at ?? (passed ? new Date().toISOString() : null),
    }
    const all = { ...rows, [phaseId]: next }
    setRows(all)
    save(`rows:${uid}${sfx}`, all)
    bump((x) => x + 1)

    if (supabase && user) {
      const upserts: object[] = [{ user_id: user.id, ...next, phase_id: off + phaseId }]
      if (passed && PHASES.some((p) => p.id === phaseId + 1) && !rows[phaseId + 1])
        upserts.push({ user_id: user.id, phase_id: off + phaseId + 1, status: 'in_progress', attempts: 0 })
      await supabase.from('phase_progress').upsert(upserts, { onConflict: 'user_id,phase_id' })
      await supabase.from('test_attempts').insert({ user_id: user.id, phase_id: off + phaseId, answers, score: pct, passed })
    }
    return passed
  }

  const value = useMemo<Ctx>(
    () => ({
      statusOf,
      row: (id) => rows[id],
      isRead: (s) => !!read[s],
      toggleRead: (s) => {
        const n = { ...read, [s]: !read[s] }
        setRead(n)
        save(`read:${uid}`, n)
      },
      readPct: (p) => Math.round((p.sections.filter((s) => read[s.id]).length / p.sections.length) * 100),
      lockedUntil,
      attemptsLeft,
      submit,
      streak,
      current: PHASES.find((p) => statusOf(p.id) === 'in_progress')?.id ?? PHASES.length,
    }),
    [rows, read, streak, statusOf, uid, course] // eslint-disable-line react-hooks/exhaustive-deps
  )
  return <C.Provider value={value}>{children}</C.Provider>
}
export const useProgress = () => useContext(C)
