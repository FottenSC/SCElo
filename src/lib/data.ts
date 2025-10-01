import { useEffect, useState } from 'react'
import type { Player, PlayedMatch } from '@/types/models'
import { supabase } from '@/supabase/client'

export async function fetchPlayers(): Promise<Player[]> {
  try {
    const { data, error } = await supabase.from('players').select('id, name')
    if (error) throw error
    return (data ?? []) as Player[]
  } catch (e) {
    console.warn('fetchPlayers failed:', e)
    return []
  }
}

export async function fetchMatches(): Promise<PlayedMatch[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id, aId, bId, winnerId, at')
      .order('at', { ascending: false })
    if (error) throw error
    return (data ?? []) as PlayedMatch[]
  } catch (e) {
    console.warn('fetchMatches failed:', e)
    return []
  }
}

export function usePlayersAndMatches() {
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [matches, setMatches] = useState<PlayedMatch[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, m] = await Promise.all([fetchPlayers(), fetchMatches()])
        if (!active) return
        setPlayers(p)
        setMatches(m)
      } catch (err) {
        if (!active) return
        setError((err as Error).message)
      }
    })()
    return () => {
      active = false
    }
  }, [])

  const loading = players === null || matches === null
  return { players: players ?? [], matches: matches ?? [], loading, error }
}
