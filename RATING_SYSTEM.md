# Rating System Refactor - Complete

## What Changed

### 1. Simplified Rating Storage
- **Before**: Separate `player_ratings` table with full rating history
- **After**: Rating changes stored directly on `matches` table
- **Why**: Simpler schema, less data duplication, easier to maintain

### 2. Role-Based Admin System
- **Before**: Planned to use separate `admin_users` table
- **After**: Uses Supabase Auth `app_metadata.role` field
- **Why**: Leverages built-in auth system, no extra tables needed

## Database Schema

### Matches Table
Stores rating changes for both players:
- `rating_change_p1`: Rating change for player 1
- `rating_change_p2`: Rating change for player 2

### Players Table
Cached metadata for performance:
- `rating`, `rd`, `volatility`: Current Glicko-2 values
- `matches_played`: Total completed matches
- `last_match_date`: Date of most recent match
- `peak_rating`: Highest rating achieved
- `peak_rating_date`: When peak was achieved

### Functions
- `get_player_rating_history(player_id)`: Returns chronological rating history from matches
- `is_admin()`: Checks if current user has admin role
- `update_player_metadata_from_matches()`: Trigger to update player stats

## How to Use

### 1. Grant Admin Access

Open Supabase Studio at http://127.0.0.1:54323 and run:

```sql
-- Option A: Create new admin user
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, created_at, updated_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, is_super_admin
)
VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'admin@example.com',
  crypt('admin123', gen_salt('bf')),
  NOW(), NOW(), NOW(),
  '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
  '{}'::jsonb,
  '',
  false
);

-- Option B: Grant admin to existing user
UPDATE auth.users
SET raw_app_meta_data = raw_app_meta_data || '{"role": "admin"}'::jsonb
WHERE email = 'your-email@example.com';
```

### 2. Access Admin Page

1. Login with your admin credentials
2. Navigate to `http://localhost:5174/#/admin`
3. Click "Recalculate All Ratings"

### 3. What the Recalculation Does

1. Clears existing rating changes from all matches
2. Resets all players to default Glicko-2 (1500/350/0.06)
3. Processes all completed matches chronologically
4. Calculates rating changes using Glicko-2 algorithm
5. Updates `rating_change_p1` and `rating_change_p2` on each match
6. Updates final player ratings and metadata
7. Triggers update player statistics automatically

## API Usage

### Get Player Rating History

```typescript
import { getPlayerRatingHistory } from '@/lib/ratings'

const history = await getPlayerRatingHistory(playerId)
// Returns: Array of { match_id, match_date, opponent_id, opponent_name, result, rating_change, rating_after }
```

### Get Peak Rating

```typescript
import { getPlayerPeakRating } from '@/lib/ratings'

const peak = await getPlayerPeakRating(playerId)
// Returns: { peak_rating, peak_rating_date }
```

### Check Admin Status

```typescript
import { useAuth } from '@/supabase/AuthContext'

const { isAdmin } = useAuth()
// Returns: boolean
```

## Benefits of This Approach

✅ **Simpler Schema**: One less table to manage
✅ **Better Performance**: Rating history calculated from existing data
✅ **Atomic Updates**: Match and rating data stay together
✅ **Easy Caching**: Player metadata cached for quick access
✅ **No Duplication**: Rating changes stored once per match
✅ **Flexible**: Can still query rating history when needed
✅ **Native Auth**: Uses Supabase's built-in role system

## Files Changed

- `supabase/migrations/20251003011407_use_roles_for_admin.sql` - Role-based admin system
- `supabase/migrations/20251003012045_simplify_ratings_to_matches.sql` - Simplified rating storage
- `src/lib/ratings-events.ts` - Event-sourced rating recalculation utility
- `src/supabase/AuthContext.tsx` - Check admin role from app_metadata
- `src/pages/Admin.tsx` - Admin page with role check and instructions
- `supabase/grant-admin.sql` - Helper script for granting admin access

## Next Steps

1. Open Supabase Studio: http://127.0.0.1:54323
2. Create/grant admin user using SQL in grant-admin.sql
3. Login to your app
4. Navigate to admin page: http://localhost:5174/#/admin
5. Run rating recalculation
6. Verify ratings are correct
