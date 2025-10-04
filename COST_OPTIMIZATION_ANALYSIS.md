# Supabase Cost Optimization Analysis

## Executive Summary
After analyzing all SQL queries, database structure, and usage patterns, here are the key findings and recommendations to reduce Supabase costs without losing functionality.

## Current Database Usage Patterns

### Main Data Loading Pattern
**Problem**: Every page component calls `usePlayersAndMatches()` which fetches ALL players and ALL matches on every page load.

```typescript
// This runs on: Rankings, Matches, Player, MatchDetailModal pages
const { players, matches } = usePlayersAndMatches()

// Fetches:
- ALL players (every column)
- ALL completed matches (every column)
```

**Cost Impact**: 🔴 HIGH
- Multiple pages fetching full datasets
- No caching between components
- ~459 matches × multiple pages = thousands of rows read per session

---

## Cost Reduction Recommendations

### 🟢 HIGH IMPACT - Easy Wins

#### 1. **Implement Client-Side Caching** (Recommended: React Query)
**Savings**: 70-80% reduction in database reads

Replace direct Supabase calls with React Query:
```typescript
// Install: npm install @tanstack/react-query

// Create a QueryClient wrapper
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false,
    },
  },
})

// Replace usePlayersAndMatches with:
function usePlayersAndMatches() {
  const players = useQuery(['players'], fetchPlayers)
  const matches = useQuery(['matches'], fetchCompletedMatches)
  return { players: players.data || [], matches: matches.data || [], loading: ... }
}
```

**Benefits**:
- Single fetch shared across all components
- Automatic cache invalidation
- Reduced server load by 70-80%
- Better user experience (instant page loads)

---

#### 2. **Remove Unused Database Functions**
**Current State**: Several database functions are defined but NEVER called:

❌ **Never Used**:
```sql
-- These functions exist but no code calls them:
get_player_rating_history_from_events()  -- defined, never called
get_player_latest_rating()                -- defined, never called
get_player_rating_history()               -- old function, replaced by client-side calculation
```

**Action**: Delete unused functions to reduce database complexity:
```sql
DROP FUNCTION IF EXISTS get_player_rating_history_from_events(INTEGER, INTEGER);
DROP FUNCTION IF EXISTS get_player_latest_rating(INTEGER);
DROP FUNCTION IF EXISTS get_player_rating_history(BIGINT);
```

---

#### 3. **Optimize Event Fetching**
**Current**: Multiple components fetch ALL events separately:
```typescript
// Events.tsx - fetches all events
// SingleEvent.tsx - fetches all events
// MatchDetailModal.tsx - fetches all events (for just 1 event title!)
```

**Solution**: 
```typescript
// A) Use React Query cache (see #1)
// B) For MatchDetailModal, just fetch the specific event:
const { data } = await supabase
  .from('events')
  .select('id, title')
  .eq('id', eventId)
  .single()

// Instead of fetching all events and filtering client-side
```

**Savings**: Reduces event queries from ~5-10 per session to 1-2

---

### 🟡 MEDIUM IMPACT - Worth Considering

#### 4. **Reduce Column Selection in Queries**
**Current**: Some queries fetch more than needed:

```typescript
// events - fetches ALL columns including unused ones
.select('*')

// Better:
.select('id, title, event_date, vod_link')
```

**Review each query**:
- ✅ `players` - already optimized, only selects needed columns
- ❌ `events` - uses `SELECT *`
- ✅ `matches` - already optimized, explicit columns

**Action**: Update `fetchEvents()`:
```typescript
.select('id, title, event_date, vod_link')
```

**Savings**: Minor (5-10% on event queries), but good practice

---

#### 5. **Remove Duplicate Index on matches.winner_id**
**Current**: `winner_id` is indexed TWICE:
```sql
-- Migration 20251002075037
CREATE INDEX "matches_winner_id_idx" ...

-- Migration 20251002114344  
CREATE INDEX IF NOT EXISTS matches_winner_id_idx ...
```

**Action**: Not a cost issue, but clean up the duplicate:
```sql
-- Keep only one index
DROP INDEX IF EXISTS matches_winner_id_idx;
CREATE INDEX IF NOT EXISTS matches_winner_id_idx ON matches(winner_id);
```

---

#### 6. **Consider Pagination for Large Lists**
**Current**: Rankings page loads ALL players at once

**Future Enhancement**: If player count grows significantly (>500), implement:
```typescript
// Virtual scrolling or pagination
const { data } = await supabase
  .from('players')
  .select('...')
  .order('rating', { ascending: false })
  .range(start, end)  // Only load visible rows
```

**Note**: Not urgent at current scale (~100-200 players)

---

### 🔵 LOW IMPACT - Nice to Have

#### 7. **Optimize rating_events Queries During Recalculation**
**Current**: Admin recalculation inserts events in batches of 50

**Already optimized**: Good batch size, includes delays between batches

**Possible optimization**: Use single transaction for all inserts
```sql
BEGIN;
INSERT INTO rating_events VALUES (...);
-- all inserts
COMMIT;
```

**Note**: Only runs during admin actions (rare), low priority

---

#### 8. **Remove Unused `match_order` Column from Queries**
**Observation**: `match_order` is selected but rarely used in the UI

**Keep it**: Used for sorting upcoming matches, needed for data integrity

---

## Things NOT to Change (Already Optimized)

✅ **Indexes are well-designed**: Appropriate indexes on frequently queried columns
✅ **RLS Policies**: Efficient, using simple `true` for public read
✅ **Match queries**: Already filter by `winner_id IS NOT NULL` efficiently
✅ **Batch operations**: Rating recalculation uses good batch sizes
✅ **Denormalized data**: `rating_change_p1/p2` on matches prevents joins (good!)

---

## Implementation Priority

### Phase 1: Immediate Impact (This Week)
1. ✅ **Implement React Query** - 70-80% read reduction
2. ✅ **Optimize MatchDetailModal event fetching** - single event query
3. ✅ **Remove unused database functions**

### Phase 2: Clean Up (Next Sprint)
4. Update `fetchEvents()` to select specific columns
5. Remove duplicate index

### Phase 3: Future (If Needed)
6. Implement pagination for rankings (if >500 players)
7. Consider CDN caching for static player avatars

---

## Estimated Cost Savings

| Optimization | Estimated Savings | Effort | Priority |
|--------------|------------------|--------|----------|
| React Query Caching | **70-80%** | Medium | 🔥 HIGH |
| Optimize Event Fetching | **10-15%** | Low | 🔥 HIGH |
| Remove Unused Functions | 0% (complexity reduction) | Low | Medium |
| Column Selection | 5% | Low | Low |

**Total Estimated Savings**: **80-90% reduction in database reads**

---

## Code Changes Required

### 1. Add React Query
```bash
npm install @tanstack/react-query
```

```typescript
// src/main.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      cacheTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
    },
  },
})

// Wrap App with QueryClientProvider
<QueryClientProvider client={queryClient}>
  <App />
</QueryClientProvider>
```

### 2. Update data.ts
```typescript
import { useQuery } from '@tanstack/react-query'

export function usePlayersAndMatches() {
  const { data: players, isLoading: playersLoading } = useQuery({
    queryKey: ['players'],
    queryFn: fetchPlayers,
  })
  
  const { data: matches, isLoading: matchesLoading } = useQuery({
    queryKey: ['matches'],
    queryFn: fetchCompletedMatches,
  })
  
  return {
    players: players ?? [],
    matches: matches ?? [],
    loading: playersLoading || matchesLoading,
  }
}

export function useEvents() {
  const { data, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: fetchEvents,
  })
  
  return { events: data ?? [], loading: isLoading }
}
```

### 3. Update MatchDetailModal.tsx
```typescript
// Instead of fetching all events, fetch just one:
const { data: event } = await supabase
  .from('events')
  .select('id, title')
  .eq('id', match.event_id)
  .single()

setEventTitle(event?.title ?? null)
```

### 4. Update fetchEvents()
```typescript
export async function fetchEvents(): Promise<Event[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id, title, event_date, vod_link')  // Remove SELECT *
    .order('event_date', { ascending: false })
  // ...
}
```

---

## Monitoring After Changes

Track these metrics in Supabase dashboard:
- **Database reads per day**: Should drop by 70-80%
- **API requests**: Should significantly decrease
- **Active connections**: Should remain stable
- **Cache hit rate**: Monitor React Query DevTools

---

## Conclusion

The **single biggest win** is implementing React Query caching. This will reduce database reads by 70-80% with minimal code changes and no functionality loss. The app currently re-fetches the same data multiple times per session, which is the primary cost driver.

Secondary optimizations (event fetching, unused functions) provide incremental improvements but the caching layer is the critical change.
