export type Player = {
  id: string
  name: string
}

export type PlayedMatch = {
  id: string
  aId: string
  bId: string
  // winner is either aId or bId
  winnerId: string
  // optional timestamp (ms since epoch)
  at?: number
}
