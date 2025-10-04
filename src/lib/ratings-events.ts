/**
 * Event-Sourced Rating Calculator
 * 
 * Uses rating_events table to track all rating changes.
 * This allows for:
 * - Rating resets while keeping history
 * - Future decay implementations
 * - Audit trail of all changes
 * - Ability to replay rating history
 */

import { supabase } from '@/supabase/client'
import type { RatingEvent } from '@/types/models'

export interface RecalculationProgress {
  totalMatches: number
  processedMatches: number
  currentMatch: number
  status: 'idle' | 'running' | 'complete' | 'error'
}

type WorkerInputPlayer = { id: number }
type WorkerInputMatch = { id: number; player1_id: number; player2_id: number; winner_id: number }
type WorkerMatchEvent = {
  player_id: number
  match_id: number
  event_type: 'match'
  rating: number
  rd: number
  volatility: number
  rating_change: number
  opponent_id: number
  result: 0 | 0.5 | 1
}
type WorkerProgressMessage = { type: 'progress'; processedMatches: number }
type WorkerResultMessage = { type: 'result'; events: WorkerMatchEvent[] }
type WorkerErrorMessage = { type: 'error'; error: string }
type WorkerMessage = WorkerProgressMessage | WorkerResultMessage | WorkerErrorMessage

/**
 * Recalculate all ratings from scratch and store as events.
 * This creates a new "epoch" of ratings, preserving old history.
 */
export async function recalculateAllRatingsAsEvents(
  onProgress?: (progress: RecalculationProgress) => void,
  resetReason: string = 'Full recalculation'
): Promise<{ success: boolean; error?: string; eventsCreated: number }> {
  try {
    console.log('🚀 Starting event-sourced rating recalculation...')
    
    // Step 1: Fetch all players
    console.log('📊 Step 1: Fetching players...')
    const { data: players, error: playersError } = await supabase
      .from('players')
      .select('id, name')
      .order('id')
    
    if (playersError) throw playersError
    if (!players || players.length === 0) {
      throw new Error('No players found')
    }
    console.log(`✅ Fetched ${players.length} players`)
    
    // Step 2: Fetch all completed matches (where winner_id is not null)
    console.log('🎮 Step 2: Fetching matches...')
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id, player1_id, player2_id, winner_id')
      .not('winner_id', 'is', null)
      .order('id')
    
    if (matchesError) throw matchesError
    if (!matches || matches.length === 0) {
      throw new Error('No matches found')
    }
    console.log(`✅ Fetched ${matches.length} matches`)
    
    // Step 3: Create reset events for all players
    console.log('🔄 Step 3: Creating reset events for all players...')
    const resetEvents: Omit<RatingEvent, 'id' | 'created_at'>[] = players.map(player => ({
      player_id: player.id,
      match_id: null,
      event_type: 'reset' as const,
      rating: 1500,
      rd: 350,
      volatility: 0.06,
      rating_change: null,
      opponent_id: null,
      result: null,
      reason: resetReason
    }))
    
    const { error: resetError } = await supabase
      .from('rating_events')
      .insert(resetEvents)
    
    if (resetError) throw resetError
    console.log(`✅ Created ${resetEvents.length} reset events`)
    
    // Step 4: Prepare rating computation (worker handles state initialization)
    console.log('⚙️ Step 4: Preparing rating computation...')
    
    // Step 5: Process matches via Web Worker to avoid blocking UI
    console.log(`🧮 Step 5: Processing ${matches.length} matches in worker...`)
    const matchEventsFromWorker = await computeMatchEventsWithWorker(
      players.map(p => ({ id: p.id })),
      matches.map(match => ({
        id: match.id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        winner_id: match.winner_id as number
      })),
      matches.length,
      (progress: WorkerProgressMessage) => {
        const currentMatch = matches[Math.min(progress.processedMatches, matches.length - 1)]
        if (!currentMatch) return
        onProgress?.({
          totalMatches: matches.length,
          processedMatches: progress.processedMatches,
          currentMatch: currentMatch.id,
          status: 'running'
        })
      }
    )
    
    const matchEvents: Omit<RatingEvent, 'id' | 'created_at'>[] = matchEventsFromWorker.map((event: WorkerMatchEvent) => ({
      ...event,
      reason: null
    }))
    
    console.log(`✅ Worker produced ${matchEvents.length} match events`)
    const INSERT_BATCH_SIZE = 50
    
    // Step 6: Batch insert match events
    console.log(`💾 Step 6: Inserting ${matchEvents.length} events in batches...`)
    for (let i = 0; i < matchEvents.length; i += INSERT_BATCH_SIZE) {
      const batch = matchEvents.slice(i, i + INSERT_BATCH_SIZE)
      const batchNum = Math.floor(i / INSERT_BATCH_SIZE) + 1
      const totalBatches = Math.ceil(matchEvents.length / INSERT_BATCH_SIZE)
      
      console.log(`  Inserting batch ${batchNum}/${totalBatches} (${batch.length} events)`)
      
      const { error: insertError } = await supabase
        .from('rating_events')
        .insert(batch)
      
      if (insertError) {
        console.error('Failed to insert batch:', insertError)
        throw insertError
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    
    console.log('✅ All events inserted')
    
    // Step 7: Sync player table with latest ratings
    console.log('🔄 Step 7: Syncing player table...')
    const { error: syncError } = await supabase.rpc('sync_player_ratings_from_events')
    
    if (syncError) {
      console.warn('⚠️ Failed to sync player ratings:', syncError)
    } else {
      console.log('✅ Player ratings synced')
    }
    
  // Step 8: Update matches with rating changes (for backwards compatibility)
  console.log('📝 Step 8: Updating matches table...')
  const matchUpdates = new Map<number, { rating_change_p1?: number; rating_change_p2?: number }>()
    
    matchEvents.forEach(event => {
      if (!event.match_id) return
      
      const update = matchUpdates.get(event.match_id) || {}
      const match = matches.find(m => m.id === event.match_id)
      if (!match) return
      
      if (event.player_id === match.player1_id) {
        update.rating_change_p1 = event.rating_change || 0
      } else if (event.player_id === match.player2_id) {
        update.rating_change_p2 = event.rating_change || 0
      }
      
      matchUpdates.set(event.match_id, update)
    })
    
    const matchUpdateArray = Array.from(matchUpdates.entries()).map(([id, changes]) => ({ id, ...changes }))

    // Important: Use update per row to avoid insert path requirements from upsert (NOT NULL columns)
    let updatedCount = 0
    for (let i = 0; i < matchUpdateArray.length; i++) {
      const row = matchUpdateArray[i]
      if (!row) continue

      const { id, rating_change_p1, rating_change_p2 } = row as {
        id: number
        rating_change_p1?: number
        rating_change_p2?: number
      }

      const payload: { rating_change_p1?: number | null; rating_change_p2?: number | null } = {}

      if (rating_change_p1 !== undefined) payload.rating_change_p1 = rating_change_p1 ?? null
      if (rating_change_p2 !== undefined) payload.rating_change_p2 = rating_change_p2 ?? null

      if (Object.keys(payload).length === 0) continue

      const { error: updateError } = await supabase
        .from('matches')
        .update(payload)
        .eq('id', id)

      if (updateError) {
        console.warn(`⚠️ Failed to update match ${id}:`, updateError)
      } else {
        updatedCount++
      }

      // Periodic small yield and progress log
      if (i % 50 === 0) {
        console.log(`  ✏️ Updated ${updatedCount} / ${matchUpdateArray.length} matches`)
        await new Promise(resolve => setTimeout(resolve, 25))
      }
    }
    
    console.log('✅ Matches updated')
    
    onProgress?.({
      totalMatches: matches.length,
      processedMatches: matches.length,
      currentMatch: 0,
      status: 'complete'
    })
    
    const totalEvents = resetEvents.length + matchEvents.length
    console.log(`🎉 Recalculation complete! Created ${totalEvents} events`)
    
    return {
      success: true,
      eventsCreated: totalEvents
    }
    
  } catch (error) {
    console.error('❌ Recalculation failed:', error)
    
    onProgress?.({
      totalMatches: 0,
      processedMatches: 0,
      currentMatch: 0,
      status: 'error'
    })
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      eventsCreated: 0
    }
  }
}

/**
 * Get player rating history from events
 */
export async function getPlayerRatingHistoryFromEvents(playerId: number, limit = 20) {
  const { data, error } = await supabase
    .rpc('get_player_rating_history_from_events', {
      p_player_id: playerId,
      p_limit: limit
    })
  
  if (error) {
    console.error('Failed to fetch rating history:', error)
    return []
  }
  
  return data || []
}

/**
 * Get player's peak rating from events
 */
export async function getPlayerPeakRatingFromEvents(playerId: number) {
  const { data, error } = await supabase
    .from('rating_events')
    .select('rating, created_at')
    .eq('player_id', playerId)
    .order('rating', { ascending: false })
    .limit(1)
    .single()
  
  if (error) return null
  return data
}

async function computeMatchEventsWithWorker(
  players: WorkerInputPlayer[],
  matches: WorkerInputMatch[],
  totalMatches: number,
  onProgress?: (progress: WorkerProgressMessage) => void
): Promise<WorkerMatchEvent[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('../workers/ratingWorker.ts', import.meta.url), {
      type: 'module'
    })

    const cleanup = () => {
      worker.terminate()
    }

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data

      if (message.type === 'progress') {
        onProgress?.(message)

        if (message.processedMatches === 0 || message.processedMatches % 50 === 0) {
          console.log(
            `  📦 Worker processed ${Math.min(message.processedMatches, totalMatches)} / ${totalMatches} matches`
          )
        }

        return
      }

      if (message.type === 'result') {
        cleanup()
        resolve(message.events)
        return
      }

      if (message.type === 'error') {
        cleanup()
        reject(new Error(message.error))
      }
    }

    worker.onerror = (event) => {
      cleanup()
      reject(new Error(event.message || 'Worker encountered an error'))
    }

    worker.postMessage({ players, matches })
  })
}
