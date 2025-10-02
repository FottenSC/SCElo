import { defaultRating, update, type Rating } from '@/lib/glicko2'
import type { Player, PlayedMatch } from '@/types/models'

export type PlayerRating = Rating & { player: Player }

/**
 * NOTE: Ratings are now stored in the database and updated when matches are added.
 * The functions in this file are kept for:
 * 1. Server-side/backend code that adds new matches and updates player ratings
 * 2. Historical reference and potential recalculation needs
 * 
 * The frontend UI now displays ratings directly from the database.
 */

/**
 * Compute Glicko-2 ratings for all players based on match history.
 * Walks through matches in chronological order and updates ratings.
 * 
 * This function should be used when adding new matches to update player ratings.
 * 
 * @param players - Array of all players
 * @param matches - Array of all matches
 * @returns Array of player ratings with player information
 */
export function computeRatings(players: Player[], matches: PlayedMatch[]): PlayerRating[] {
  // Return empty array if no players
  if (!players || players.length === 0) {
    return []
  }

  // Initialize ratings map - every player starts with default rating
  const ratings = new Map<number, Rating>()
  players.forEach(p => {
    if (p && typeof p.id === 'number') {
      ratings.set(p.id, defaultRating())
    }
  })

  // Sort matches by ID (chronological order) and filter out invalid matches
  const validMatches = (matches || [])
    .filter(m => {
      // Ensure match has required fields and both players exist in ratings
      return m && 
             typeof m.id === 'number' &&
             typeof m.player1_id === 'number' &&
             typeof m.player2_id === 'number' &&
             typeof m.winner_id === 'number' &&
             ratings.has(m.player1_id) &&
             ratings.has(m.player2_id) &&
             (m.winner_id === m.player1_id || m.winner_id === m.player2_id)
    })
    .sort((a, b) => a.id - b.id)

  // Process each match and update ratings
  validMatches.forEach(match => {
    const player1Rating = ratings.get(match.player1_id)
    const player2Rating = ratings.get(match.player2_id)

    // This should never happen due to filtering, but be defensive
    if (!player1Rating || !player2Rating) {
      return
    }

    // Determine scores (1 = win, 0 = loss)
    const player1Score = match.winner_id === match.player1_id ? 1 : 0
    const player2Score = match.winner_id === match.player2_id ? 1 : 0

    // Update ratings using Glicko-2 algorithm
    try {
      const player1NewRating = update(player1Rating, [
        { opponent: player2Rating, score: player1Score as 0 | 1 }
      ])
      const player2NewRating = update(player2Rating, [
        { opponent: player1Rating, score: player2Score as 0 | 1 }
      ])

      ratings.set(match.player1_id, player1NewRating)
      ratings.set(match.player2_id, player2NewRating)
    } catch (err) {
      console.error(`Error updating ratings for match ${match.id}:`, err)
    }
  })

  // Build result array with player info and ratings
  return players
    .filter(p => p && typeof p.id === 'number')
    .map(player => {
      const rating = ratings.get(player.id) ?? defaultRating()
      return {
        player,
        rating: rating.rating,
        rd: rating.rd,
        vol: rating.vol
      }
    })
}

/**
 * Sort player ratings by rating value in descending order (highest first)
 * 
 * @param arr - Array of player ratings
 * @returns Sorted array (new array, does not mutate input)
 */
export function sortByRatingDesc(arr: PlayerRating[]): PlayerRating[] {
  if (!arr || arr.length === 0) {
    return []
  }
  
  return [...arr].sort((a, b) => {
    // Sort by rating descending
    const ratingDiff = b.rating - a.rating
    if (ratingDiff !== 0) return ratingDiff
    
    // If ratings are equal, sort by RD ascending (more certain first)
    const rdDiff = a.rd - b.rd
    if (rdDiff !== 0) return rdDiff
    
    // If still equal, sort by player name
    return a.player.name.localeCompare(b.player.name)
  })
}
