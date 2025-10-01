import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  signInWithGithub: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      setLoading(false)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })
    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      loading,
      async signInWithGithub() {
        // Ensure redirect goes back to the correct base path (e.g., GitHub Pages /eloSite/)
        const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo },
        })
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }),
    [session, loading],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
