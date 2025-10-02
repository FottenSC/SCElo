export type Player = {
  id: number
  name: string
  twitter?: string
  created?: string
  rating: number
  rd: number
  volatility: number
}

export type PlayedMatch = {
  id: number
  player1_id: number
  player2_id: number
  winner_id: number
  is_fake_data: boolean
  player1_score: number
  player2_score?: number
}
