export type Player = {
  id: number
  name: string
  twitter?: string
  created?: string
  rating: number
  rd: number
  volatility: number
  last_match_date?: string
  matches_played?: number
  peak_rating?: number
  peak_rating_date?: string
}

export type PlayerRating = {
  id: number
  player_id: number
  match_id: number
  rating: number
  rd: number
  volatility: number
  rating_change?: number
  created_at: string
}

export type PlayerRatingHistory = PlayerRating & {
  player_name: string
  event_id?: number | null
}

export type RatingEvent = {
  id: number
  player_id: number
  match_id?: number | null
  event_type: 'match' | 'reset' | 'decay' | 'manual_adjustment'
  rating: number
  rd: number
  volatility: number
  rating_change?: number | null
  opponent_id?: number | null
  result?: number | null // 0=loss, 0.5=draw, 1=win
  reason?: string | null
  created_at: string
}

export type RatingEventHistory = RatingEvent & {
  opponent_name?: string | null
}

export type Match = {
  id: number
  player1_id: number
  player2_id: number
  winner_id: number | null // null = upcoming match, not null = completed match
  player1_score: number
  player2_score?: number
  rating_change_p1?: number
  rating_change_p2?: number
  event_id?: number | null
  match_order?: number
  vod_link?: string | null
}

// Alias for backwards compatibility
export type PlayedMatch = Match

export type Event = {
  id: number
  title: string
  event_date: string
  stream_url?: string
  vod_link?: string | null
  description?: string
  created_at?: string
}

export type RatingPrediction = {
  winRatingChange: number
  loseRatingChange: number
  winNewRating: number
  loseNewRating: number
}
