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

import { supabase } from "@/supabase/client";
import type { Match, Player, RatingEvent } from "@/types/models";
import { type Rating, update as updateGlicko } from "@/lib/glicko2";

export interface RecalculationProgress {
  totalMatches: number;
  processedMatches: number;
  currentMatch: number;
  status: "idle" | "running" | "complete" | "error";
}

type WorkerInputPlayer = { id: number };
type WorkerInputMatch = {
  id: number;
  player1_id: number;
  player2_id: number;
  winner_id: number;
};
type WorkerMatchEvent = {
  player_id: number;
  match_id: number;
  event_type: "match";
  rating: number;
  rd: number;
  volatility: number;
  rating_change: number;
  opponent_id: number;
  result: 0 | 0.5 | 1;
};
type WorkerProgressMessage = { type: "progress"; processedMatches: number };
type WorkerResultMessage = { type: "result"; events: WorkerMatchEvent[] };
type WorkerErrorMessage = { type: "error"; error: string };
type WorkerMessage =
  | WorkerProgressMessage
  | WorkerResultMessage
  | WorkerErrorMessage;

/**
 * Recalculate all ratings from scratch and store as events.
 *
 * IMPORTANT: This function assumes rating_events table has been cleared
 * before calling. It will create NEW rating events for all matches.
 *
 * Call updateRatingsAfterMatch() instead for automatic cleanup + recalculation.
 *
 * Process:
 * 1. Fetches FRESH player and match data from database
 * 2. Creates reset events for all players (starting at 1500/350/0.06)
 * 3. Processes all completed matches in chronological order
 * 4. Creates match events with rating changes
 * 5. Syncs player table with final ratings
 */
export async function recalculateAllRatingsAsEvents(
  onProgress?: (progress: RecalculationProgress) => void,
  resetReason: string = "Full recalculation",
  seasonId?: number,
): Promise<{ success: boolean; error?: string; eventsCreated: number }> {
  try {
    // Step 1: Fetch FRESH player data from database
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, name")
      .order("id");

    if (playersError) throw playersError;
    if (!players || players.length === 0) {
      throw new Error("No players found");
    }

    // Step 2: Fetch FRESH match data from database (only completed matches)
    let query = supabase
      .from("matches")
      .select("id, player1_id, player2_id, winner_id, season_id")
      .not("winner_id", "is", null);

    // Filter by season if provided (note: seasonId can be 0, so check !== undefined)
    if (seasonId !== undefined) {
      query = query.eq("season_id", seasonId);
    }

    const { data: matches, error: matchesError } = await query.order("id");

    if (matchesError) throw matchesError;

    // If no matches exist, just return early
    if (!matches || matches.length === 0) {
      // If recalculating a season, delete old events for that season first
      if (seasonId !== undefined) {
        const { error: deleteError } = await supabase
          .from("rating_events")
          .delete()
          .eq("season_id", seasonId);

        if (deleteError) {
          console.warn("Failed to delete old rating events:", deleteError);
        }
      }

      // Sync player table with fresh data
      const { error: syncError } = await supabase.rpc(
        "sync_player_ratings_from_events",
      );

      if (syncError) {
        console.warn("Failed to sync player ratings:", syncError);
      }

      onProgress?.({
        totalMatches: 0,
        processedMatches: 0,
        currentMatch: 0,
        status: "complete",
      });

      return {
        success: true,
        eventsCreated: 0,
      };
    }

    // Delete old rating events for this season before recalculating
    if (seasonId !== undefined) {
      const { error: deleteError } = await supabase
        .from("rating_events")
        .delete()
        .eq("season_id", seasonId);

      if (deleteError) {
        throw deleteError;
      }
    }

    // Step 3-4: Process matches via Web Worker to avoid blocking UI
    const matchEventsFromWorker = await computeMatchEventsWithWorker(
      players.map((p) => ({ id: p.id })),
      matches.map((match) => ({
        id: match.id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        winner_id: match.winner_id as number,
      })),
      matches.length,
      (progress: WorkerProgressMessage) => {
        const currentMatch =
          matches[Math.min(progress.processedMatches, matches.length - 1)];
        if (!currentMatch) return;
        onProgress?.({
          totalMatches: matches.length,
          processedMatches: progress.processedMatches,
          currentMatch: currentMatch.id,
          status: "running",
        });
      },
    );

    // Create a map of match IDs to season IDs
    const matchSeasonMap = new Map<number, number>();
    matches.forEach((match) => {
      matchSeasonMap.set(match.id, match.season_id);
    });

    const matchEvents: Omit<RatingEvent, "id" | "created_at">[] =
      matchEventsFromWorker.map((event: WorkerMatchEvent) => ({
        ...event,
        reason: null,
        season_id: matchSeasonMap.get(event.match_id) || 0,
      }));

    const INSERT_BATCH_SIZE = 50;

    // Step 5: Batch insert match events
    for (let i = 0; i < matchEvents.length; i += INSERT_BATCH_SIZE) {
      const batch = matchEvents.slice(i, i + INSERT_BATCH_SIZE);

      const { error: insertError } = await supabase
        .from("rating_events")
        .insert(batch);

      if (insertError) {
        throw insertError;
      }

      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    // Step 6: Sync player table with latest ratings
    const { error: syncError } = await supabase.rpc(
      "sync_player_ratings_from_events",
    );

    if (syncError) {
      console.warn("Failed to sync player ratings:", syncError);
    }

    // Step 6b: Mark all players with matches as having played this season
    // This flag is used on the leaderboard to show only active players
    if (seasonId === 0) {
      const playerIdsWithMatches = new Set<number>();
      matches.forEach((match) => {
        playerIdsWithMatches.add(match.player1_id);
        playerIdsWithMatches.add(match.player2_id);
      });

      if (playerIdsWithMatches.size > 0) {
        const { error: flagError } = await supabase
          .from("players")
          .update({ has_played_this_season: true })
          .in("id", Array.from(playerIdsWithMatches));

        if (flagError) {
          console.warn("Failed to mark players as having played:", flagError);
        } else {
          console.log(
            `✅ Marked ${playerIdsWithMatches.size} players as active this season`,
          );
        }
      }
    }

    // Step 7: Update matches with rating changes (for backwards compatibility)
    const matchUpdates = new Map<
      number,
      { rating_change_p1?: number; rating_change_p2?: number }
    >();

    matchEvents.forEach((event) => {
      if (!event.match_id) return;

      const update = matchUpdates.get(event.match_id) || {};
      const match = matches.find((m) => m.id === event.match_id);
      if (!match) return;

      if (event.player_id === match.player1_id) {
        update.rating_change_p1 = event.rating_change || 0;
      } else if (event.player_id === match.player2_id) {
        update.rating_change_p2 = event.rating_change || 0;
      }

      matchUpdates.set(event.match_id, update);
    });

    const matchUpdateArray = Array.from(matchUpdates.entries()).map((
      [id, changes],
    ) => ({ id, ...changes }));

    // Important: Use update per row to avoid insert path requirements from upsert (NOT NULL columns)
    let updatedCount = 0;
    for (let i = 0; i < matchUpdateArray.length; i++) {
      const row = matchUpdateArray[i];
      if (!row) continue;

      const { id, rating_change_p1, rating_change_p2 } = row as {
        id: number;
        rating_change_p1?: number;
        rating_change_p2?: number;
      };

      const payload: {
        rating_change_p1?: number | null;
        rating_change_p2?: number | null;
      } = {};

      if (rating_change_p1 !== undefined) {
        payload.rating_change_p1 = rating_change_p1 ?? null;
      }
      if (rating_change_p2 !== undefined) {
        payload.rating_change_p2 = rating_change_p2 ?? null;
      }

      if (Object.keys(payload).length === 0) continue;

      const { error: updateError } = await supabase
        .from("matches")
        .update(payload)
        .eq("id", id);

      if (updateError) {
        console.warn(`⚠️ Failed to update match ${id}:`, updateError);
      } else {
        updatedCount++;
      }

      // Periodic small yield and progress log
      if (i % 50 === 0) {
        console.log(
          `  ✏️ Updated ${updatedCount} / ${matchUpdateArray.length} matches`,
        );
        await new Promise((resolve) => setTimeout(resolve, 25));
      }
    }

    console.log("✅ Matches updated");

    onProgress?.({
      totalMatches: matches.length,
      processedMatches: matches.length,
      currentMatch: 0,
      status: "complete",
    });

    console.log(
      `🎉 Recalculation complete! Created ${matchEvents.length} match events`,
    );
    return {
      success: true,
      eventsCreated: matchEvents.length,
    };
  } catch (error) {
    console.error("Rating recalculation failed:", error);

    onProgress?.({
      totalMatches: 0,
      processedMatches: 0,
      currentMatch: 0,
      status: "error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      eventsCreated: 0,
    };
  }
}

/**
 * Get player rating history from events
 */
export async function getPlayerRatingHistoryFromEvents(
  playerId: number,
  limit = 20,
) {
  const { data, error } = await supabase
    .rpc("get_player_rating_history_from_events", {
      p_player_id: playerId,
      p_limit: limit,
    });

  if (error) {
    console.error("Failed to fetch rating history:", error);
    return [];
  }

  return data || [];
}

/**
 * Get player's peak rating from events
 */
export async function getPlayerPeakRatingFromEvents(playerId: number) {
  const { data, error } = await supabase
    .from("rating_events")
    .select("rating, created_at")
    .eq("player_id", playerId)
    .order("rating", { ascending: false })
    .limit(1)
    .single();

  if (error) return null;
  return data;
}

/**
 * Automatically update ratings when a match result changes
 * Uses full recalculation to maintain consistency with event-sourced architecture
 *
 * Important: This function:
 * 1. Deletes ALL existing rating events (resets to clean state)
 * 2. Fetches fresh match data from database
 * 3. Recalculates all ratings from scratch
 *
 * This ensures consistency because Glicko-2 ratings are sequential:
 * changing one match can theoretically affect all subsequent matches.
 *
 * TODO: Implement incremental updates for better performance.
 * This would only recalculate ratings for the changed match and all later matches.
 */
export async function updateRatingsAfterMatch(
  onProgress?: (message: string) => void,
): Promise<{ success: boolean; error?: string }> {
  try {
    onProgress?.("Updating ratings...");

    // Delete all existing rating events to prevent duplicate processing
    console.log("🧹 Clearing existing rating events...");
    const { error: deleteError } = await supabase
      .from("rating_events")
      .delete()
      .eq("season_id", 0); // Delete only active season events

    if (deleteError) {
      console.error("Failed to clear rating events:", deleteError);
      throw new Error(
        `Failed to clear existing ratings: ${deleteError.message}`,
      );
    }

    console.log("✅ Cleared all existing rating events");

    // Small delay to ensure database consistency
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Now recalculate from scratch with fresh data
    const result = await recalculateAllRatingsAsEvents(
      undefined,
      "Auto-update after match result",
      0,
    );

    if (result.success) {
      onProgress?.("Ratings updated successfully");
    }

    return result;
  } catch (error) {
    console.error("Failed to update ratings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Check if a match can be rolled back
 * A match can be rolled back only if BOTH players have no matches after it
 */
export async function canRollbackMatch(matchId: number): Promise<{
  canRollback: boolean;
  reason?: string;
  player1HasLaterMatches?: boolean;
  player2HasLaterMatches?: boolean;
}> {
  try {
    // Get the match details
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id, winner_id")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      return { canRollback: false, reason: "Match not found" };
    }

    // Can only rollback completed matches
    if (!match.winner_id) {
      return { canRollback: false, reason: "Cannot rollback upcoming matches" };
    }

    // Check if player1 has any matches after this one
    const { data: player1LaterMatches, error: p1Error } = await supabase
      .from("matches")
      .select("id")
      .gt("id", matchId)
      .not("winner_id", "is", null)
      .or(`player1_id.eq.${match.player1_id},player2_id.eq.${match.player1_id}`)
      .limit(1);

    if (p1Error) {
      console.error("Error checking player1 matches:", p1Error);
      return { canRollback: false, reason: "Error checking match history" };
    }

    const player1HasLaterMatches = player1LaterMatches &&
      player1LaterMatches.length > 0;

    // Check if player2 has any matches after this one
    const { data: player2LaterMatches, error: p2Error } = await supabase
      .from("matches")
      .select("id")
      .gt("id", matchId)
      .not("winner_id", "is", null)
      .or(`player1_id.eq.${match.player2_id},player2_id.eq.${match.player2_id}`)
      .limit(1);

    if (p2Error) {
      console.error("Error checking player2 matches:", p2Error);
      return { canRollback: false, reason: "Error checking match history" };
    }

    const player2HasLaterMatches = player2LaterMatches &&
      player2LaterMatches.length > 0;

    // Can only rollback if BOTH players have no later matches
    if (player1HasLaterMatches || player2HasLaterMatches) {
      let reason = "Cannot rollback: ";
      if (player1HasLaterMatches && player2HasLaterMatches) {
        reason += "both players have played matches afterwards";
      } else if (player1HasLaterMatches) {
        reason += "player 1 has played matches afterwards";
      } else {
        reason += "player 2 has played matches afterwards";
      }

      return {
        canRollback: false,
        reason,
        player1HasLaterMatches,
        player2HasLaterMatches,
      };
    }

    return {
      canRollback: true,
      player1HasLaterMatches: false,
      player2HasLaterMatches: false,
    };
  } catch (error) {
    console.error("Error checking rollback eligibility:", error);
    return {
      canRollback: false,
      reason: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Rollback a match by deleting it and recalculating ratings
 * Only works if both players have no matches after this one
 */
export async function rollbackMatch(
  matchId: number,
  onProgress?: (message: string) => void,
): Promise<{ success: boolean; error?: string }> {
  try {
    onProgress?.("Checking if match can be rolled back...");

    // First check if rollback is allowed
    const eligibility = await canRollbackMatch(matchId);

    if (!eligibility.canRollback) {
      return {
        success: false,
        error: eligibility.reason || "Cannot rollback this match",
      };
    }

    // Important: remove rating events for this match prior to rollback
    // We'll keep the match row, but revert it to an upcoming state.
    onProgress?.("Removing rating events for match...");
    const { error: deleteEventsError } = await supabase
      .from("rating_events")
      .delete()
      .eq("match_id", matchId);

    if (deleteEventsError) {
      console.error(
        "Failed to delete rating events for match:",
        deleteEventsError,
      );
      throw new Error(
        `Failed to delete rating events for match: ${deleteEventsError.message}`,
      );
    }

    // Revert the match to upcoming by clearing winner and scores
    onProgress?.("Reverting match to upcoming...");
    const { error: revertError } = await supabase
      .from("matches")
      .update({
        winner_id: null,
        player1_score: null,
        player2_score: null,
        rating_change_p1: null,
        rating_change_p2: null,
      })
      .eq("id", matchId);

    if (revertError) {
      console.error("Failed to revert match:", revertError);
      throw new Error(`Failed to revert match: ${revertError.message}`);
    }
    console.log(`✅ Reverted match ${matchId} to upcoming`);

    // Recalculate ratings
    onProgress?.("Recalculating ratings...");

    const ratingResult = await updateRatingsAfterMatch((message) => {
      onProgress?.(message);
    });

    if (!ratingResult.success) {
      return {
        success: false,
        error: `Match deleted but rating update failed: ${ratingResult.error}`,
      };
    }

    onProgress?.("Match rolled back successfully (match reverted to upcoming)");

    return { success: true };
  } catch (error) {
    console.error("Failed to rollback match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function computeMatchEventsWithWorker(
  players: WorkerInputPlayer[],
  matches: WorkerInputMatch[],
  totalMatches: number,
  onProgress?: (progress: WorkerProgressMessage) => void,
): Promise<WorkerMatchEvent[]> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("../workers/ratingWorker.ts", import.meta.url),
      {
        type: "module",
      },
    );

    const cleanup = () => {
      worker.terminate();
    };

    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      const message = event.data;

      if (message.type === "progress") {
        onProgress?.(message);

        if (
          message.processedMatches === 0 || message.processedMatches % 50 === 0
        ) {
          console.log(
            `  📦 Worker processed ${
              Math.min(message.processedMatches, totalMatches)
            } / ${totalMatches} matches`,
          );
        }

        return;
      }

      if (message.type === "result") {
        cleanup();
        resolve(message.events);
        return;
      }

      if (message.type === "error") {
        cleanup();
        reject(new Error(message.error));
      }
    };

    worker.onerror = (event) => {
      cleanup();
      reject(new Error(event.message || "Worker encountered an error"));
    };

    worker.postMessage({ players, matches });
  });
}

/**
 * Reset all player ratings to default values
 * Sets rating to 1500, RD to 350, volatility to 0.06 for all players
 * This is useful for season resets or fresh starts
 *
 * Note: Resets are now detected by season_id changes, so reset events are no longer created.
 */
export async function resetAllPlayerRatings(
  onProgress?: (message: string) => void,
): Promise<{ success: boolean; error?: string; playersReset: number }> {
  try {
    onProgress?.("Fetching all players...");

    // Get all players
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id");

    if (playersError || !players) {
      throw new Error(`Failed to fetch players: ${playersError?.message}`);
    }

    console.log(`🔄 Starting rating reset for ${players.length} players`);
    onProgress?.(`Resetting ratings for ${players.length} players...`);

    // Reset all players
    const { error: updateError } = await supabase
      .from("players")
      .update({
        rating: 1500,
        rd: 350,
        volatility: 0.06,
      })
      .neq("id", 0); // Update all rows

    if (updateError) {
      throw new Error(`Failed to reset player ratings: ${updateError.message}`);
    }

    console.log(`✅ Reset ratings for ${players.length} players`);
    onProgress?.("Rating reset complete!");

    return {
      success: true,
      playersReset: players.length,
    };
  } catch (error) {
    console.error("Failed to reset player ratings:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      playersReset: 0,
    };
  }
}

export async function updateRatingForMatch(
  matchId: number,
  onProgress?: (message: string) => void,
): Promise<{ success: boolean; error?: string }> {
  try {
    // Get the match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("*")
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
      throw new Error(`Match not found: ${matchError?.message}`);
    }

    if (!match.winner_id) {
      throw new Error("Match has no result yet");
    }

    // Get both players' current rating state
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, rating, rd, volatility")
      .in("id", [match.player1_id, match.player2_id]);

    if (playersError || !players || players.length !== 2) {
      throw new Error("Could not fetch player ratings");
    }

    const p1 = players.find((p) => p.id === match.player1_id);
    const p2 = players.find((p) => p.id === match.player2_id);

    if (!p1 || !p2) {
      throw new Error("One or both players not found");
    }

    // Convert to Glicko-2 format
    const p1Rating: Rating = {
      rating: p1.rating,
      rd: p1.rd,
      vol: p1.volatility,
    };

    const p2Rating: Rating = {
      rating: p2.rating,
      rd: p2.rd,
      vol: p2.volatility,
    };

    // Determine scores
    const p1Score = match.winner_id === match.player1_id ? 1 : 0;
    const p2Score = match.winner_id === match.player2_id ? 1 : 0;

    // Calculate new ratings
    const newP1Rating = updateGlicko(p1Rating, [{
      opponent: p2Rating,
      score: p1Score as 0 | 1,
    }]);
    const newP2Rating = updateGlicko(p2Rating, [{
      opponent: p1Rating,
      score: p2Score as 0 | 1,
    }]);

    // Calculate rating changes
    const ratingChangeP1 = newP1Rating.rating - p1Rating.rating;
    const ratingChangeP2 = newP2Rating.rating - p2Rating.rating;

    // Update the match record with rating changes
    const { error: matchUpdateError } = await supabase
      .from("matches")
      .update({
        rating_change_p1: ratingChangeP1,
        rating_change_p2: ratingChangeP2,
      })
      .eq("id", matchId);

    if (matchUpdateError) {
      throw new Error(`Failed to update match: ${matchUpdateError.message}`);
    }

    // Update both players' ratings AND set has_played_this_season flag
    const { error: p1UpdateError } = await supabase
      .from("players")
      .update({
        rating: newP1Rating.rating,
        rd: newP1Rating.rd,
        volatility: newP1Rating.vol,
        has_played_this_season: true,
      })
      .eq("id", match.player1_id);

    if (p1UpdateError) {
      throw new Error(`Failed to update player 1: ${p1UpdateError.message}`);
    }

    const { error: p2UpdateError } = await supabase
      .from("players")
      .update({
        rating: newP2Rating.rating,
        rd: newP2Rating.rd,
        volatility: newP2Rating.vol,
        has_played_this_season: true,
      })
      .eq("id", match.player2_id);

    if (p2UpdateError) {
      throw new Error(`Failed to update player 2: ${p2UpdateError.message}`);
    }
    onProgress?.("Rating updated successfully");

    return { success: true };
  } catch (error) {
    console.error("❌ Failed to update rating for match:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Calculate ratings retroactively for an archived season
 *
 * This function:
 * 1. Fetches all matches for the specified season
 * 2. Creates rating events from season snapshots (if available) or from 1500/350/0.06
 * 3. Processes all matches in chronological order
 * 4. Creates match events with rating changes
 * 5. Creates final snapshots for that season
 *
 * @param seasonId The archived season ID to recalculate
 * @param onProgress Optional callback for progress updates
 */
export async function calculateSeasonRatings(
  seasonId: number,
  onProgress?: (progress: RecalculationProgress) => void,
): Promise<{ success: boolean; error?: string; eventsCreated: number }> {
  try {
    console.log(`🎯 Starting rating calculation for season ${seasonId}...`);

    // Get season info
    onProgress?.({
      totalMatches: 0,
      processedMatches: 0,
      currentMatch: 0,
      status: "running",
    });

    const { data: season, error: seasonError } = await supabase
      .from("seasons")
      .select("*")
      .eq("id", seasonId)
      .single();

    if (seasonError || !season) {
      throw new Error(`Season ${seasonId} not found`);
    }

    console.log(`📋 Found season: ${season.name}`);

    // Get all matches for this season
    console.log(`🎮 Fetching matches for season ${seasonId}...`);
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("id, player1_id, player2_id, winner_id")
      .eq("season_id", seasonId)
      .not("winner_id", "is", null)
      .order("id");

    if (matchesError) throw matchesError;

    if (!matches || matches.length === 0) {
      console.log("⚠️ No completed matches found for this season");
      return {
        success: true,
        eventsCreated: 0,
      };
    }

    console.log(`✅ Found ${matches.length} matches`);

    // Get all unique players from matches for this season
    const playerIds = new Set<number>();
    matches.forEach((match) => {
      playerIds.add(match.player1_id);
      playerIds.add(match.player2_id);
      playerIds.add(match.winner_id);
    });

    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id")
      .in("id", Array.from(playerIds));

    if (playersError) throw playersError;
    if (!players || players.length === 0) {
      throw new Error("No players found for this season");
    }

    console.log(`👥 Processing ${players.length} players`);

    // Check if rating events already exist for this season
    const { count: existingCount } = await supabase
      .from("rating_events")
      .select("*", { count: "exact", head: true })
      .eq("season_id", seasonId)
      .eq("event_type", "match");

    if ((existingCount || 0) > 0) {
      console.log(
        `⚠️ Found ${existingCount} existing match events for this season - deleting them...`,
      );
      const { error: deleteError } = await supabase
        .from("rating_events")
        .delete()
        .eq("season_id", seasonId)
        .eq("event_type", "match");

      if (deleteError) throw deleteError;
      console.log("✅ Deleted existing match events");
    }

    // Process matches via Web Worker
    console.log(`🧮 Processing ${matches.length} matches with worker...`);
    const matchEventsFromWorker = await computeMatchEventsWithWorker(
      players.map((p) => ({ id: p.id })),
      matches.map((match) => ({
        id: match.id,
        player1_id: match.player1_id,
        player2_id: match.player2_id,
        winner_id: match.winner_id as number,
      })),
      matches.length,
      (progress: WorkerProgressMessage) => {
        const currentMatch =
          matches[Math.min(progress.processedMatches, matches.length - 1)];
        if (!currentMatch) return;
        onProgress?.({
          totalMatches: matches.length,
          processedMatches: progress.processedMatches,
          currentMatch: currentMatch.id,
          status: "running",
        });
      },
    );

    const matchEvents: Omit<RatingEvent, "id" | "created_at">[] =
      matchEventsFromWorker.map((event: WorkerMatchEvent) => ({
        ...event,
        season_id: seasonId,
        reason: null,
      }));

    console.log(`✅ Worker produced ${matchEvents.length} match events`);

    // Insert match events in batches
    const INSERT_BATCH_SIZE = 50;
    console.log(`💾 Inserting ${matchEvents.length} events in batches...`);
    for (let i = 0; i < matchEvents.length; i += INSERT_BATCH_SIZE) {
      const batch = matchEvents.slice(i, i + INSERT_BATCH_SIZE);
      const batchNum = Math.floor(i / INSERT_BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(matchEvents.length / INSERT_BATCH_SIZE);

      const { error: insertError } = await supabase
        .from("rating_events")
        .insert(batch);

      if (insertError) throw insertError;

      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    console.log("✅ All match events inserted");

    // Create final snapshots for this season
    console.log("📸 Creating final snapshots...");

    // Get latest rating for each player in this season
    const snapshots = [];
    for (const player of players) {
      const { data: latestEvent } = await supabase
        .from("rating_events")
        .select("rating, rd, volatility")
        .eq("player_id", player.id)
        .eq("season_id", seasonId)
        .order("id", { ascending: false })
        .limit(1)
        .single();

      if (latestEvent) {
        // Count matches for this player
        const matchCount = matches.filter((m) =>
          (m.player1_id === player.id || m.player2_id === player.id) &&
          m.winner_id
        ).length;

        snapshots.push({
          season_id: seasonId,
          player_id: player.id,
          final_rating: latestEvent.rating,
          final_rd: latestEvent.rd,
          final_volatility: latestEvent.volatility,
          matches_played_count: matchCount,
          peak_rating: null,
          peak_rating_date: null,
          final_rank: null,
        });
      }
    }

    if (snapshots.length > 0) {
      // Sort by rating to assign ranks (for display purposes, not stored)
      snapshots.sort((a, b) => b.final_rating - a.final_rating);
      // Note: final_rank will be calculated when needed, not stored

      // Check if snapshots exist and delete them
      const { count: existingSnapshots } = await supabase
        .from("season_player_snapshots")
        .select("*", { count: "exact", head: true })
        .eq("season_id", seasonId);

      if ((existingSnapshots || 0) > 0) {
        console.log(`⚠️ Deleting ${existingSnapshots} existing snapshots...`);
        const { error: deleteError } = await supabase
          .from("season_player_snapshots")
          .delete()
          .eq("season_id", seasonId);

        if (deleteError) throw deleteError;
      }

      const { error: snapshotError } = await supabase
        .from("season_player_snapshots")
        .insert(snapshots);

      if (snapshotError) throw snapshotError;
      console.log(`✅ Created ${snapshots.length} season snapshots`);
    }

    onProgress?.({
      totalMatches: matches.length,
      processedMatches: matches.length,
      currentMatch: 0,
      status: "complete",
    });

    console.log(
      `🎉 Season ${seasonId} rating calculation complete! Created ${matchEvents.length} match events`,
    );

    return {
      success: true,
      eventsCreated: matchEvents.length,
    };
  } catch (error) {
    console.error("❌ Season rating calculation failed:", error);
    onProgress?.({
      totalMatches: 0,
      processedMatches: 0,
      currentMatch: 0,
      status: "error",
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      eventsCreated: 0,
    };
  }
}
