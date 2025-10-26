/**
 * Season Management Utilities
 * 
 * Handles season creation, archival, and querying.
 * 
 * Key Concepts:
 * - Active Season: Always has id = 0
 * - Archived Seasons: Have permanent IDs (1, 2, 3, etc.)
 * - Inactive Players: Have NULL ratings in active season
 * - Snapshots: Store final standings for archived seasons
 */

import { supabase } from '@/supabase/client'
import type { Season, SeasonPlayerSnapshot } from '@/types/models'

/**
 * Ensure active season exists (id = 0)
 * Called at app startup to guarantee we have an active season
 */
export async function ensureActiveSeasonExists(): Promise<Season> {
  try {
    // Check if active season exists
    const { data: activeSeason, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      // PGRST116 = no rows returned (expected if not found)
      throw fetchError
    }

    if (activeSeason) {
      console.log('✅ Active season exists:', activeSeason.name)
      return activeSeason
    }

    // Active season doesn't exist - create it
    console.log('🆕 Creating active season (id = 0)...')
    const { data: newSeason, error: createError } = await supabase
      .from('seasons')
      .insert({
        id: 0,
        name: 'Active Season',
        status: 'active',
        start_date: new Date().toISOString(),
        description: 'Current active season - use id=0 to reference this'
      })
      .select()
      .single()

    if (createError) throw createError

    console.log('✅ Active season created')
    return newSeason
  } catch (error) {
    console.error('❌ Failed to ensure active season exists:', error)
    throw error
  }
}

/**
 * Get active season
 */
export async function getActiveSeason(): Promise<Season | null> {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .single()

    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error('Failed to fetch active season:', error)
    return null
  }
}

/**
 * Get all seasons (active first, then archived in reverse order)
 */
export async function getAllSeasons(): Promise<Season[]> {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .order('id', { ascending: false }) // 0 first, then 3, 2, 1
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch seasons:', error)
    return []
  }
}

/**
 * Get archived seasons only
 */
export async function getArchivedSeasons(): Promise<Season[]> {
  try {
    const { data, error } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'archived')
      .order('id', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch archived seasons:', error)
    return []
  }
}

/**
 * Archive the current season and create a new active season
 * 
 * Process:
 * 1. Get current season (id = 0)
 * 2. Create snapshots for all active players (rating IS NOT NULL)
 * 3. Assign permanent ID to current season (highest existing ID + 1)
 * 4. Update all matches/events with new season ID
 * 5. Create new active season (id = 0)
 * 6. Reset all players' ratings to NULL
 */
export async function archiveSeasonAndStartNew(
  newSeasonName: string = 'Active Season',
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; newSeasonId?: number; error?: string }> {
  try {
    onProgress?.('Fetching current active season...')
    
    // Get current season
    const { data: currentSeason, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .single()
    
    if (seasonError) throw seasonError
    if (!currentSeason) throw new Error('Active season not found')
    
    console.log(`📋 Current season: ${currentSeason.name}`)
    
    // Get all players with ratings (active players)
    onProgress?.('Fetching active players...')
    const { data: activePlayers, error: playersError } = await supabase
      .from('players')
      .select('*')
      .not('rating', 'is', null)
    
    if (playersError) throw playersError
    console.log(`👥 Found ${activePlayers?.length || 0} active players`)
    
    // Get all matches for current season (to count)
    onProgress?.('Counting matches...')
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('id')
      .eq('season_id', 0)
    
    if (matchesError) throw matchesError
    console.log(`🎮 Found ${matches?.length || 0} matches in season`)
    
    // Find next available season ID (highest positive ID + 1)
    onProgress?.('Determining new season ID...')
    const { data: maxIdData, error: maxError } = await supabase
      .from('seasons')
      .select('id')
      .gt('id', 0)
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    if (maxError && maxError.code !== 'PGRST116') throw maxError
    const nextSeasonId = (maxIdData?.id || 0) + 1
    console.log(`🆔 Next season ID: ${nextSeasonId}`)
    
    // Create snapshots for all active players
    onProgress?.('Creating player snapshots...')
    if (activePlayers && activePlayers.length > 0) {
      const snapshots = activePlayers
        .sort((a, b) => b.rating - a.rating) // Sort by rating descending
        .map((player, index) => ({
          season_id: nextSeasonId,
          player_id: player.id,
          final_rating: player.rating,
          final_rd: player.rd,
          final_volatility: player.volatility,
          matches_played_count: player.matches_played || 0,
          peak_rating: player.peak_rating,
          peak_rating_date: player.peak_rating_date,
          final_rank: index + 1 // Rank is 1-indexed
        }))
      
      const { error: snapshotError } = await supabase
        .from('season_player_snapshots')
        .insert(snapshots)
      
      if (snapshotError) throw snapshotError
      console.log(`✅ Created ${snapshots.length} snapshots`)
    }
    
    // Delete old active season record
    onProgress?.('Archiving old season...')
    const { error: deleteError } = await supabase
      .from('seasons')
      .delete()
      .eq('status', 'active')
    
    if (deleteError) throw deleteError
    
    // Insert new archived season with the old season's data
    const { error: insertError } = await supabase
      .from('seasons')
      .insert({
        id: nextSeasonId,
        name: currentSeason.name,
        status: 'archived',
        start_date: currentSeason.start_date,
        end_date: new Date().toISOString(),
        description: currentSeason.description
      })
    
    if (insertError) throw insertError
    console.log(`✅ Season ${nextSeasonId} archived`)
    
    // Update all matches with new season ID
    onProgress?.('Updating matches...')
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({ season_id: nextSeasonId })
      .eq('season_id', 0)
    
    if (matchUpdateError) throw matchUpdateError
    
    // Update all rating events with new season ID
    onProgress?.('Updating rating events...')
    const { error: eventUpdateError } = await supabase
      .from('rating_events')
      .update({ season_id: nextSeasonId })
      .eq('season_id', 0)
    
    if (eventUpdateError) throw eventUpdateError
    console.log(`✅ Updated matches and events`)
    
    // Create new active season
    onProgress?.('Creating new active season...')
    const { error: newSeasonError } = await supabase
      .from('seasons')
      .insert({
        id: 0,
        name: newSeasonName,
        status: 'active',
        start_date: new Date().toISOString(),
        description: 'Current active season - use id=0 to reference this'
      })
    
    if (newSeasonError) throw newSeasonError
    console.log(`✅ New active season created (id = 0)`)
    
    // Reset all player ratings to NULL
    onProgress?.('Resetting player ratings...')
    const { error: resetError } = await supabase
      .from('players')
      .update({
        rating: null,
        rd: null,
        volatility: null
      })
      .neq('id', 0) // Update all rows
    
    if (resetError) throw resetError
    console.log(`✅ All player ratings reset`)
    
    onProgress?.('Season transition complete!')
    
    return {
      success: true,
      newSeasonId: nextSeasonId
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Failed to archive season:', error)
    return {
      success: false,
      error: message
    }
  }
}

/**
 * Get leaderboard for active season (live player ratings)
 */
export async function getActiveSeasonLeaderboard() {
  try {
    const { data, error } = await supabase
      .from('players')
      .select('*')
      .not('rating', 'is', null)
      .order('rating', { ascending: false })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error('Failed to fetch active season leaderboard:', error)
    return []
  }
}

/**
 * Get leaderboard for archived season (from snapshots)
 */
export async function getArchivedSeasonLeaderboard(seasonId: number) {
  try {
    const { data, error } = await supabase
      .from('season_player_snapshots')
      .select('*, player:players(id, name)')
      .eq('season_id', seasonId)
      .order('final_rank')
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error(`Failed to fetch season ${seasonId} leaderboard:`, error)
    return []
  }
}

/**
 * Get all matches for a season
 */
export async function getSeasonMatches(seasonId: number, limit = 100) {
  try {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('season_id', seasonId)
      .order('id', { ascending: false })
      .limit(limit)
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error(`Failed to fetch matches for season ${seasonId}:`, error)
    return []
  }
}

/**
 * Get season stats
 */
export async function getSeasonStats(seasonId: number) {
  try {
    // Get season info
    const { data: season, error: seasonError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single()
    
    if (seasonError) throw seasonError
    
    // Get match count
    const { count: matchCount, error: matchError } = await supabase
      .from('matches')
      .select('*', { count: 'exact', head: true })
      .eq('season_id', seasonId)
    
    if (matchError) throw matchError
    
    // Get player count from snapshots or active players
    let playerCount = 0
    if (season.status === 'archived') {
      const { count, error } = await supabase
        .from('season_player_snapshots')
        .select('*', { count: 'exact', head: true })
        .eq('season_id', seasonId)
      
      if (error) throw error
      playerCount = count || 0
    } else {
      const { count, error } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .not('rating', 'is', null)
      
      if (error) throw error
      playerCount = count || 0
    }
    
    return {
      season,
      matchCount: matchCount || 0,
      playerCount,
      averageRating: 0 // Could calculate if needed
    }
  } catch (error) {
    console.error(`Failed to fetch stats for season ${seasonId}:`, error)
    return null
  }
}

/**
 * Get player's snapshot for a specific archived season
 */
export async function getPlayerSeasonStats(
  playerId: number,
  seasonId: number
): Promise<SeasonPlayerSnapshot | null> {
  try {
    const { data, error } = await supabase
      .from('season_player_snapshots')
      .select('*')
      .eq('season_id', seasonId)
      .eq('player_id', playerId)
      .single()
    
    if (error && error.code !== 'PGRST116') throw error
    return data || null
  } catch (error) {
    console.error(`Failed to fetch season stats for player ${playerId}:`, error)
    return null
  }
}

/**
 * Compare player's stats across all seasons
 */
export async function getPlayerSeasonComparison(playerId: number) {
  try {
    const { data, error } = await supabase
      .from('season_player_snapshots')
      .select('*')
      .eq('player_id', playerId)
      .order('season_id', { ascending: true })
    
    if (error) throw error
    return data || []
  } catch (error) {
    console.error(`Failed to fetch season comparison for player ${playerId}:`, error)
    return []
  }
}

/**
 * Activate an archived season
 * 
 * This function:
 * 1. Deactivates the current active season (convert id=0 to permanent ID)
 * 2. Restores player ratings from the target season's snapshots
 * 3. Converts the target archived season to the active season (id=0)
 * 4. Restores all matches/events for that season as active
 */
export async function activateArchivedSeason(
  seasonId: number,
  onProgress?: (msg: string) => void
): Promise<{ success: boolean; error?: string }> {
  try {
    onProgress?.('Starting season activation...')
    
    // Validate input
    if (seasonId <= 0) {
      throw new Error('Cannot activate the current active season or invalid season ID')
    }
    
    // Get the target season
    onProgress?.('Fetching target season...')
    const { data: targetSeason, error: fetchError } = await supabase
      .from('seasons')
      .select('*')
      .eq('id', seasonId)
      .single()
    
    if (fetchError || !targetSeason) {
      throw new Error('Target season not found')
    }
    
    if (targetSeason.status === 'active') {
      throw new Error('Season is already active')
    }
    
    console.log(`🎯 Activating season: ${targetSeason.name}`)
    
    // Get current active season
    onProgress?.('Fetching current active season...')
    const { data: currentActive, error: currentError } = await supabase
      .from('seasons')
      .select('*')
      .eq('status', 'active')
      .single()
    
    if (currentError || !currentActive) {
      throw new Error('Current active season not found')
    }
    
    console.log(`📋 Current active season: ${currentActive.name}`)
    
    // Find next available permanent ID for the current active season
    onProgress?.('Determining new IDs...')
    const { data: maxIdData } = await supabase
      .from('seasons')
      .select('id')
      .gt('id', 0)
      .order('id', { ascending: false })
      .limit(1)
      .single()
    
    const nextPermanentId = (maxIdData?.id || 0) + 1
    console.log(`🆔 Current active season will get ID: ${nextPermanentId}`)
    
    // Step 1: Archive the current active season
    onProgress?.('Archiving current active season...')
    const { error: archiveCurrentError } = await supabase
      .from('seasons')
      .update({
        id: nextPermanentId,
        status: 'archived',
        end_date: new Date().toISOString()
      })
      .eq('status', 'active')
    
    if (archiveCurrentError) throw archiveCurrentError
    console.log(`✅ Current active season archived with ID ${nextPermanentId}`)
    
    // Step 2: Update matches for current season to new permanent ID
    onProgress?.('Updating current season matches...')
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({ season_id: nextPermanentId })
      .eq('season_id', 0)
    
    if (matchUpdateError) throw matchUpdateError
    
    // Step 3: Update rating events for current season to new permanent ID
    onProgress?.('Updating current season rating events...')
    const { error: eventUpdateError } = await supabase
      .from('rating_events')
      .update({ season_id: nextPermanentId })
      .eq('season_id', 0)
    
    if (eventUpdateError) throw eventUpdateError
    console.log(`✅ Matches and events updated`)
    
    // Step 4: Fetch snapshots from target season and restore player ratings
    onProgress?.('Restoring player ratings from season snapshots...')
    const { data: snapshots, error: snapshotError } = await supabase
      .from('season_player_snapshots')
      .select('*')
      .eq('season_id', seasonId)
    
    if (snapshotError) throw snapshotError
    
    if (snapshots && snapshots.length > 0) {
      // Update each player with their season snapshot ratings
      for (const snapshot of snapshots) {
        const { error: playerUpdateError } = await supabase
          .from('players')
          .update({
            rating: snapshot.final_rating,
            rd: snapshot.final_rd,
            volatility: snapshot.final_volatility
          })
          .eq('id', snapshot.player_id)
        
        if (playerUpdateError) {
          console.warn(`⚠️ Failed to update player ${snapshot.player_id}:`, playerUpdateError)
        }
      }
      console.log(`✅ Restored ratings for ${snapshots.length} players`)
    }
    
    // Step 5: Update target season to active season
    onProgress?.('Converting target season to active...')
    const { error: activateError } = await supabase
      .from('seasons')
      .update({
        id: 0,
        status: 'active',
        end_date: null
      })
      .eq('id', seasonId)
    
    if (activateError) throw activateError
    console.log(`✅ Target season is now active`)
    
    // Step 6: Update all matches for target season to active season ID
    onProgress?.('Updating target season matches...')
    const { error: targetMatchError } = await supabase
      .from('matches')
      .update({ season_id: 0 })
      .eq('season_id', seasonId)
    
    if (targetMatchError) throw targetMatchError
    
    // Step 7: Update all rating events for target season to active season ID
    onProgress?.('Updating target season rating events...')
    const { error: targetEventError } = await supabase
      .from('rating_events')
      .update({ season_id: 0 })
      .eq('season_id', seasonId)
    
    if (targetEventError) throw targetEventError
    console.log(`✅ All matches and events restored for active season`)
    
    onProgress?.('Season activation complete!')
    
    return {
      success: true
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('❌ Failed to activate season:', error)
    return {
      success: false,
      error: message
    }
  }
}
