import { useEffect, useState } from 'react'
import type { Player, PlayedMatch, Event, Match } from '@/types/models'
import { supabase } from '@/supabase/client'
import { getPlayerAvatarUrl, preloadAvatars } from '@/lib/avatar'

export async function fetchPlayers(): Promise<Player[]> {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('id, name, twitter, created, rating, rd, volatility')
      .order('rating', { ascending: false })
    if (error) throw error
    
    const players = (data ?? []) as Player[]
    
    // Preload avatar images for top players in the background
    if (players.length > 0 && typeof window !== 'undefined') {
      // Preload top 10 players' avatars
      const topPlayerAvatars = players
        .slice(0, 10)
        .map(p => getPlayerAvatarUrl(p.twitter, 48, p.name))
      
      // Use setTimeout to avoid blocking the main thread
      setTimeout(() => preloadAvatars(topPlayerAvatars), 100)
    }
    
    return players
  } catch (e) {
    console.warn('fetchPlayers failed:', e)
    return []
  }
}

export async function fetchMatches(): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, winner_id, is_fake_data, player1_score, player2_score, rating_change_p1, rating_change_p2, event_id, match_order')
      .order('id', { ascending: false })
    if (error) throw error
    return (data ?? []) as Match[]
  } catch (e) {
    console.warn('fetchMatches failed:', e)
    return []
  }
}

export async function fetchCompletedMatches(): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, winner_id, is_fake_data, player1_score, player2_score, rating_change_p1, rating_change_p2, event_id, match_order')
      .not('winner_id', 'is', null)
      .order('id', { ascending: false })
    if (error) throw error
    return (data ?? []) as Match[]
  } catch (e) {
    console.warn('fetchCompletedMatches failed:', e)
    return []
  }
}

export async function fetchUpcomingMatches(): Promise<Match[]> {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, winner_id, is_fake_data, player1_score, player2_score, rating_change_p1, rating_change_p2, event_id, match_order')
      .is('winner_id', null)
      .order('match_order', { ascending: true })
    if (error) throw error
    return (data ?? []) as Match[]
  } catch (e) {
    console.warn('fetchUpcomingMatches failed:', e)
    return []
  }
}

export async function fetchEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .order('event_date', { ascending: false })
    if (error) throw error
    return (data ?? []) as Event[]
  } catch (e) {
    console.warn('fetchEvents failed:', e)
    return []
  }
}

export async function fetchUpcomingEvents(): Promise<Event[]> {
  try {
    const { data, error } = await supabase
      .from('events')
      .select('*')
      .gte('event_date', new Date().toISOString())
      .order('event_date', { ascending: true })
    if (error) throw error
    return (data ?? []) as Event[]
  } catch (e) {
    console.warn('fetchUpcomingEvents failed:', e)
    return []
  }
}

export function usePlayersAndMatches() {
  const [players, setPlayers] = useState<Player[] | null>(null)
  const [matches, setMatches] = useState<Match[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const [p, m] = await Promise.all([fetchPlayers(), fetchCompletedMatches()])
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
