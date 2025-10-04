import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './client'

type AuthContextValue = {
  session: Session | null
  loading: boolean
  isAdmin: boolean
  signInWithGithub: () => Promise<void>
  signInWithTwitter: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data } = await supabase.auth.getSession()
      if (!active) return
      setSession(data.session)
      
      // Check admin status from app_metadata
      if (data.session?.user) {
        const appMetadata = data.session.user.app_metadata as { role?: string }
        if (active) {
          setIsAdmin(appMetadata?.role === 'admin')
        }
      } else {
        setIsAdmin(false)
      }
      
      setLoading(false)
    })()
    const { data: sub } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
      setSession(newSession)
      
      // Check admin status on auth change from app_metadata
      if (newSession?.user) {
        const appMetadata = newSession.user.app_metadata as { role?: string }
        setIsAdmin(appMetadata?.role === 'admin')
      } else {
        setIsAdmin(false)
      }
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
      isAdmin,
      async signInWithGithub() {
        // Ensure redirect goes back to the correct base path (e.g., GitHub Pages /eloSite/)
        const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
        await supabase.auth.signInWithOAuth({
          provider: 'github',
          options: { redirectTo },
        })
      },
      async signInWithTwitter() {
        const redirectTo = new URL(import.meta.env.BASE_URL, window.location.origin).toString()
        await supabase.auth.signInWithOAuth({
          provider: 'twitter',
          options: { redirectTo },
        })
      },
      async signOut() {
        await supabase.auth.signOut()
      },
    }),
    [session, loading, isAdmin],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
