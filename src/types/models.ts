export type Player = {
  id: number
  name: string
  twitter?: string
  created?: string
  rating: number
  rd: number
  volatility: number
}

export type Match = {
  id: number
  player1_id: number
  player2_id: number
  winner_id: number | null // null = upcoming match, not null = completed match
  is_fake_data: boolean
  player1_score: number
  player2_score?: number
  rating_change_p1?: number
  rating_change_p2?: number
  event_id?: number | null
  match_order?: number
}

// Alias for backwards compatibility
export type PlayedMatch = Match

export type Event = {
  id: number
  title: string
  event_date: string
  stream_url?: string
  description?: string
  created_at?: string
}

export type RatingPrediction = {
  winRatingChange: number
  loseRatingChange: number
  winNewRating: number
  loseNewRating: number
}
