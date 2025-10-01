import { defaultRating, update, type Rating } from '@/lib/glicko2'
import type { Player, PlayedMatch } from '@/types/models'

export type PlayerRating = Rating & { player: Player }

// Compute ratings by walking through matches in order; for demo, treat each match as a single outcome
export function computeRatings(players: Player[], matches: PlayedMatch[]): PlayerRating[] {
  const ratings = new Map<string, Rating>()
  for (const p of players) ratings.set(p.id, defaultRating())

  // Optional: sort by time if provided
  const sorted = [...matches].sort((a, b) => (a.at ?? 0) - (b.at ?? 0))

  for (const m of sorted) {
    const a = ratings.get(m.aId)!
    const b = ratings.get(m.bId)!

    const aWin = m.winnerId === m.aId ? 1 : 0
    const bWin = 1 - aWin as 0 | 1

    const aNew = update(a, [{ opponent: b, score: aWin as 0 | 1 }])
    const bNew = update(b, [{ opponent: a, score: bWin as 0 | 1 }])

    ratings.set(m.aId, aNew)
    ratings.set(m.bId, bNew)
  }

  return players.map((p) => ({ player: p, ...(ratings.get(p.id) ?? defaultRating()) }))
}

export function sortByRatingDesc(arr: PlayerRating[]) {
  return [...arr].sort((a, b) => b.rating - a.rating)
}
