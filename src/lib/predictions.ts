import { update, type Rating } from './glicko2'
import type { Player, RatingPrediction } from '@/types/models'

/**
 * Calculate predicted rating changes for a player against an opponent
 * Returns both win and loss scenarios
 */
export function predictRatingChange(player: Player, opponent: Player): RatingPrediction {
  const playerRating: Rating = {
    rating: player.rating,
    rd: player.rd,
    vol: player.volatility
  }
  
  const opponentRating: Rating = {
    rating: opponent.rating,
    rd: opponent.rd,
    vol: opponent.volatility
  }
  
  // Calculate rating after a win (score = 1)
  const afterWin = update(playerRating, [{ opponent: opponentRating, score: 1 }])
  const winRatingChange = afterWin.rating - player.rating
  
  // Calculate rating after a loss (score = 0)
  const afterLoss = update(playerRating, [{ opponent: opponentRating, score: 0 }])
  const loseRatingChange = afterLoss.rating - player.rating
  
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
