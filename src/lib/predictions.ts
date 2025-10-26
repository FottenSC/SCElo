import { update, type Rating } from './glicko2'
import type { Player, RatingPrediction } from '@/types/models'

/**
 * Calculate predicted rating changes for a player against an opponent
 * Returns both win and loss scenarios
 */
export function predictRatingChange(player: Player, opponent: Player): RatingPrediction {
  // Coerce null ratings (new season or inactive players) to Glicko defaults
  const playerBaseRating = player.rating ?? 1500
  const playerRating: Rating = {
    rating: playerBaseRating,
    rd: player.rd ?? 350,
    vol: player.volatility ?? 0.06
  }
  
  const opponentRating: Rating = {
    rating: opponent.rating ?? 1500,
    rd: opponent.rd ?? 350,
    vol: opponent.volatility ?? 0.06
  }
  
  // Calculate rating after a win (score = 1)
  const afterWin = update(playerRating, [{ opponent: opponentRating, score: 1 }])
  const winRatingChange = afterWin.rating - playerBaseRating
  
  // Calculate rating after a loss (score = 0)
  const afterLoss = update(playerRating, [{ opponent: opponentRating, score: 0 }])
  const loseRatingChange = afterLoss.rating - playerBaseRating
  
  return {
    winRatingChange,
    loseRatingChange,
    winNewRating: afterWin.rating,
    loseNewRating: afterLoss.rating
  }
}

/**
 * Calculate rating changes for both players in a matchup
 */
export function predictMatchRatingChanges(player1: Player, player2: Player) {
  return {
    player1: predictRatingChange(player1, player2),
    player2: predictRatingChange(player2, player1)
  }
}

/**
 * Format rating change for display (e.g., "+15.2", "-8.5")
 */
export function formatRatingChange(change: number): string {
  const sign = change >= 0 ? '+' : ''
  return `${sign}${change.toFixed(1)}`
}
