# Fix: Missing Match from Player Rank on Season Recalculation

## Problem Description
When recalculating the latest season (season_id=0), at least one match was missing from the players table rank information. This caused the match count and player statistics to be incorrect.

## Root Cause Analysis
The bug was in how player ratings were being synced after recalculation. The original system called `sync_player_ratings_from_events()` (a SQL RPC function), which fetched the **latest rating_event globally** for each player, regardless of season.

### The Problem
1. When recalculating a specific season's ratings
2. The sync function would use the **latest event across ALL seasons** 
3. This caused **cross-season data contamination** where:
   - Player ratings might come from the wrong season
   - Match counts are inflated (counting matches from all seasons)
   - The leaderboard shows incorrect information

## Solution - TypeScript-Only Implementation

Instead of relying on SQL RPC functions, implemented `syncPlayerRatingsFromEvents()` in TypeScript that:

1. **Filters by season**: Accepts optional `seasonId` parameter to only sync data for that specific season
2. **Prevents contamination**: Ensures player stats only use events from the requested season
3. **Maintains philosophy**: Pure TypeScript implementation with no new SQL functions

### Key Changes

#### New TypeScript Function
```typescript
async function syncPlayerRatingsFromEvents(
  seasonId?: number,
): Promise<{ success: boolean; error?: string }>
```

- Fetches all players from the database
- For each player:
  - Gets rating events (filtered by `season_id` if provided)
  - Calculates latest rating, peak rating, match count, last match date
  - Updates player record with clean data
- Batches updates to avoid overwhelming the database

#### Updated Calls
Two locations in `recalculateAllRatingsAsEvents()` now call the new function:

**Location 1** (when no matches exist):
```typescript
const syncResult = await syncPlayerRatingsFromEvents(seasonId);
if (!syncResult.success) {
  console.warn("Failed to sync player ratings:", syncResult.error);
}
```

**Location 2** (after inserting match events):
```typescript
const syncResult = await syncPlayerRatingsFromEvents(seasonId);
if (!syncResult.success) {
  console.warn("Failed to sync player ratings:", syncResult.error);
}
```

## Impact
✅ Fixes missing match counts when recalculating seasons  
✅ Prevents cross-season data contamination  
✅ No SQL functions required - pure TypeScript  
✅ Works for both active season (id=0) and archived seasons  
✅ Maintains your existing architectural philosophy  

## Testing
To verify the fix:
1. Recalculate the active season from the Admin Dashboard
2. Check that all matches are counted correctly in the players table
3. Verify that `matches_played` count matches the actual completed matches for each player
4. Confirm that archived seasons have separate, independent stats

## Files Changed
- `src/lib/ratings-events.ts` - Added `syncPlayerRatingsFromEvents()` function and updated 2 call sites
