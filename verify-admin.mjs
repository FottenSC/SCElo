// Simple script to verify local admin user exists and can write via RLS
import { createClient } from '@supabase/supabase-js'

const url = 'http://127.0.0.1:54321'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const email = 'prestegaard9@gmail.com'
const password = 'EloSite'

async function main() {
  const supabase = createClient(url, anon)

  console.log('Signing in as admin...')
  const { data: auth, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
  if (signInError) {
    console.error('❌ Sign-in failed:', signInError)
    process.exit(1)
  }

  const user = auth.user
  console.log('✅ Signed in as:', user?.email)
  console.log('app_metadata:', user?.app_metadata)

  // Use the session access token for subsequent requests
  const supabaseAuthed = createClient(url, anon, {
    global: {
      headers: {
        Authorization: `Bearer ${auth.session?.access_token}`,
      },
    },
  })

  // Fetch Fotten
  const { data: players, error: fetchErr } = await supabaseAuthed
    .from('players')
    .select('*')
    .ilike('name', 'Fott%')
    .limit(1)

  if (fetchErr) {
    console.error('❌ Failed to query players:', fetchErr)
    process.exit(1)
  }
  if (!players || players.length === 0) {
    console.error('❌ Player Fotten not found')
    process.exit(1)
  }

  const player = players[0]
  console.log('Found player:', { id: player.id, name: player.name, current_rating: player.current_rating })

  // Update rating to 3000 to test admin write
  const { error: updErr } = await supabaseAuthed
    .from('players')
    .update({ current_rating: 3000 })
    .eq('id', player.id)

  if (updErr) {
    console.error('❌ Update failed (admin write likely not working):', updErr)
    process.exit(1)
  }
  console.log('✅ Updated rating to 3000 for test')

  // Revert
  const { error: revertErr } = await supabaseAuthed
    .from('players')
    .update({ current_rating: player.current_rating })
    .eq('id', player.id)

  if (revertErr) {
    console.error('⚠️ Revert failed, please manually restore rating:', revertErr)
  } else {
    console.log('🔁 Reverted rating to', player.current_rating)
  }

  console.log('All good!')
}

main().catch((e) => {
  console.error('Unexpected error:', e)
  process.exit(1)
})
