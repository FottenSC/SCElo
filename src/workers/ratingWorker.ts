/// <reference lib="webworker" />

import { update as updateGlicko, defaultRating, type Rating } from '@/lib/glicko2'

type PlayerState = Rating & { id: number; matchCount: number }

type PlayerPayload = {
  id: number
}

type MatchPayload = {
  id: number
  player1_id: number
  player2_id: number
  winner_id: number
}

type WorkerRequest = {
  players: PlayerPayload[]
  matches: MatchPayload[]
}

type WorkerResponse = {
  type: 'result'
  events: Array<{
    player_id: number
    match_id: number
    event_type: 'match'
    rating: number
    rd: number
    volatility: number
    rating_change: number
    opponent_id: number
    result: 0 | 0.5 | 1
  }>
}

type ProgressMessage = {
  type: 'progress'
  processedMatches: number
}

type ErrorMessage = {
  type: 'error'
  error: string
}

type WorkerMessage = WorkerResponse | ProgressMessage | ErrorMessage

const ctx = self as unknown as DedicatedWorkerGlobalScope

ctx.onmessage = function (event: MessageEvent<WorkerRequest>) {
  try {
    const { players, matches } = event.data

    const playerStates = new Map<number, PlayerState>()
    players.forEach(player => {
      playerStates.set(player.id, {
        ...defaultRating(),
        id: player.id,
        matchCount: 0
      })
    })

    const matchEvents: WorkerResponse['events'] = []

    for (let i = 0; i < matches.length; i++) {
      const match = matches[i]
      if (!match) continue

      if (i % 10 === 0) {
        const progress: ProgressMessage = {
          type: 'progress',
          processedMatches: i
        }
        ctx.postMessage(progress as WorkerMessage)
      }

      const p1State = playerStates.get(match.player1_id)
      const p2State = playerStates.get(match.player2_id)

      if (!p1State || !p2State) {
        continue
      }

      const p1Score = match.winner_id === match.player1_id ? 1 : 0
      const p2Score = match.winner_id === match.player2_id ? 1 : 0

      const prevP1Rating = p1State.rating
      const prevP2Rating = p2State.rating

      let newP1Rating: Rating
      let newP2Rating: Rating
      try {
        newP1Rating = updateGlicko(p1State, [
          { opponent: p2State, score: p1Score as 0 | 1 }
        ])

        newP2Rating = updateGlicko(p2State, [
          { opponent: p1State, score: p2Score as 0 | 1 }
        ])
      } catch (e) {
        // If glicko update fails for any reason, skip this match but keep the worker alive
        continue
      }

      matchEvents.push({
        player_id: match.player1_id,
        match_id: match.id,
        event_type: 'match',
        rating: newP1Rating.rating,
        rd: newP1Rating.rd,
        volatility: newP1Rating.vol,
        rating_change: newP1Rating.rating - prevP1Rating,
        opponent_id: match.player2_id,
        result: p1Score as 0 | 1
      })

      matchEvents.push({
        player_id: match.player2_id,
        match_id: match.id,
        event_type: 'match',
        rating: newP2Rating.rating,
        rd: newP2Rating.rd,
        volatility: newP2Rating.vol,
        rating_change: newP2Rating.rating - prevP2Rating,
        opponent_id: match.player1_id,
        result: p2Score as 0 | 1
      })

      playerStates.set(match.player1_id, {
        ...newP1Rating,
        id: match.player1_id,
        matchCount: p1State.matchCount + 1
      })

      playerStates.set(match.player2_id, {
        ...newP2Rating,
        id: match.player2_id,
        matchCount: p2State.matchCount + 1
      })
    }

    const response: WorkerResponse = {
      type: 'result',
      events: matchEvents
    }
    ctx.postMessage(response as WorkerMessage)
  } catch (error) {
    const message: ErrorMessage = {
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    }
    ctx.postMessage(message as WorkerMessage)
  }
}

export {}
