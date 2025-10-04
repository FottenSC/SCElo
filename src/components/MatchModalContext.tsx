import * as React from 'react'

interface MatchModalContextValue {
  matchId: number | null
  openMatch: (matchId: number) => void
  closeMatch: () => void
}

const MatchModalContext = React.createContext<MatchModalContextValue | undefined>(undefined)

export function useMatchModal() {
  const context = React.useContext(MatchModalContext)
  if (!context) {
    throw new Error('useMatchModal must be used within MatchModalProvider')
  }
  return context
}

interface MatchModalProviderProps {
  children: React.ReactNode
}

export function MatchModalProvider({ children }: MatchModalProviderProps) {
  const [matchId, setMatchId] = React.useState<number | null>(null)

  const openMatch = React.useCallback((id: number) => {
    setMatchId(id)
  }, [])

  const closeMatch = React.useCallback(() => {
    setMatchId(null)
  }, [])

  const value = React.useMemo(
    () => ({ matchId, openMatch, closeMatch }),
    [matchId, openMatch, closeMatch]
  )

  return (
    <MatchModalContext.Provider value={value}>
      {children}
    </MatchModalContext.Provider>
  )
}
