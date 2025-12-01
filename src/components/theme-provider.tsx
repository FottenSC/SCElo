import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

type ThemeContextValue = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined)

function getSystemPreference(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light'
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  const resolved = theme === 'system' ? getSystemPreference() : theme

  // Remove both classes first
  root.classList.remove('light', 'dark')

  // Add the appropriate class
  if (resolved === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.add('light')
  }
}

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'vite-ui-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme
    const stored = window.localStorage.getItem(storageKey) as Theme | null
    return stored ?? defaultTheme
  })

  // Apply theme on mount and when it changes
  useEffect(() => {
    applyTheme(theme)
    try {
      window.localStorage.setItem(storageKey, theme)
    } catch { }
  }, [theme, storageKey])

  // React to system changes when using system theme
  useEffect(() => {
    if (theme !== 'system' || typeof window === 'undefined') return
    const mql = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    try {
      mql.addEventListener('change', handler)
    } catch {
      // Safari
      // @ts-ignore
      mql.addListener(handler)
    }
    return () => {
      try {
        mql.removeEventListener('change', handler)
      } catch {
        // @ts-ignore
        mql.removeListener(handler)
      }
    }
  }, [theme])

  const value = useMemo<ThemeContextValue>(() => ({ theme, setTheme }), [theme])

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
