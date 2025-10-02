// Quick test script to verify database connection and data
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)

async function testConnection() {
  console.log('Testing database connection...\n')
  
  // Test players
  const { data: players, error: playersError } = await supabase
    .from('players')
    .select('*')
    .limit(5)
  
  if (playersError) {
    console.error('❌ Error fetching players:', playersError)
  } else {
    console.log('✅ Players count:', players?.length)
    console.log('Sample players:', players)
  }
  
  // Test matches
  const { data: matches, error: matchesError } = await supabase
    .from('matches')
    .select('id, aId, bId, winnerId, at')
    .limit(5)
  
  if (matchesError) {
    console.error('❌ Error fetching matches:', matchesError)
  } else {
    console.log('\n✅ Matches count:', matches?.length)
    console.log('Sample matches:', matches)
  }
}

testConnection().catch(console.error)
