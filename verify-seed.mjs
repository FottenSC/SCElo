// Verify seed data was loaded
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'http://127.0.0.1:54321',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'
)

async function verify() {
  console.log('Verifying seed data...\n')
  
  // Count players
  const { count: playerCount, error: playerError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true })
  
  if (playerError) {
    console.error('❌ Error counting players:', playerError)
  } else {
    console.log(`✅ Players: ${playerCount}`)
  }
  
  // Count matches
  const { count: matchCount, error: matchError } = await supabase
    .from('matches')
    .select('*', { count: 'exact', head: true })
  
  if (matchError) {
    console.error('❌ Error counting matches:', matchError)
  } else {
    console.log(`✅ Matches: ${matchCount}`)
  }
  
  // Count events
  const { count: eventCount, error: eventError } = await supabase
    .from('events')
    .select('*', { count: 'exact', head: true })
  
  if (eventError) {
    console.error('❌ Error counting events:', eventError)
  } else {
    console.log(`✅ Events: ${eventCount}`)
  }
  
  // Get sample match
  const { data: sampleMatch, error: sampleError } = await supabase
    .from('matches')
    .select('*')
    .limit(1)
    .single()
  
  if (sampleError) {
    console.error('❌ Error fetching sample match:', sampleError)
  } else {
    console.log('\nSample match:', sampleMatch)
  }
}

verify().catch(console.error)
