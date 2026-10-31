import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AuthCtx = {
  user: User | null
  enabled: boolean
  signIn: (email: string, password: string) => Promise<string | null>
  signUp: (email: string, password: string, name: string) => Promise<string | null>
  signOut: () => Promise<void>
}
const Ctx = createContext<AuthCtx>(null!)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    if (!supabase) return
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user ?? null))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null))
    return () => data.subscription.unsubscribe()
  }, [])

  const value: AuthCtx = {
    user,
    enabled: !!supabase,
    signIn: async (email, password) => (await supabase!.auth.signInWithPassword({ email, password })).error?.message ?? null,
    signUp: async (email, password, name) =>
      (await supabase!.auth.signUp({ email, password, options: { data: { full_name: name } } })).error?.message ?? null,
    signOut: async () => void (await supabase?.auth.signOut()),
  }
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}
export const useAuth = () => useContext(Ctx)
