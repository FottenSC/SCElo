// Sign up a local dev user, self-grant admin if first, and test write
import { createClient } from '@supabase/supabase-js'

const url = 'http://127.0.0.1:54321'
const anon = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const email = process.env.DEV_ADMIN_EMAIL || 'prestegaard9@example.com'
const password = process.env.DEV_ADMIN_PASSWORD || 'admin123'

async function main() {
  const supabase = createClient(url, anon)

  console.log('Ensuring dev admin account exists...')
  // Try to sign in; if fails, sign up
  let { data: auth, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) {
    console.log('Not signed up yet, creating user...')
    const { data: signup, error: signUpErr } = await supabase.auth.signUp({ email, password })
    if (signUpErr) {
      console.error('Sign up failed:', signUpErr)
      process.exit(1)
    }
    auth = signup
  }

  if (!auth?.session?.access_token) {
    // If signUp did not produce a session due to confirmations off/on, try sign-in again
    const r = await supabase.auth.signInWithPassword({ email, password })
    if (r.error) {
      console.error('Sign-in failed after sign-up:', r.error)
      process.exit(1)
    }
    auth = r.data
  }

  console.log('Signed in as', auth.user?.email)
  const supabaseAuthed = createClient(url, anon, {
    global: { headers: { Authorization: `Bearer ${auth.session?.access_token}` } },
  })

  // Grant self admin if first
  const { data: granted, error: rpcErr } = await supabaseAuthed.rpc('grant_self_admin_if_first')
  if (rpcErr) {
    console.error('grant_self_admin_if_first failed:', rpcErr)
  } else if (granted) {
    console.log('Granted admin to first user')
  } else {
    console.log('Admin already exists, continuing')
  }

  // Test a write: tweak Fotten's name then revert
  const { data: players, error: fetchErr } = await supabaseAuthed
    .from('players')
    .select('id,name')
    .ilike('name', 'Fott%')
    .limit(1)

  if (fetchErr) throw fetchErr
  if (!players?.length) throw new Error('Fotten player not found')
  const fotten = players[0]
  const newName = fotten.name.endsWith(' (admin-test)') ? fotten.name : `${fotten.name} (admin-test)`
  const { error: updErr } = await supabaseAuthed.from('players').update({ name: newName }).eq('id', fotten.id)
  if (updErr) throw updErr
  console.log('Wrote player name as admin; reverting...')
  const { error: revErr } = await supabaseAuthed
    .from('players')
    .update({ name: fotten.name })
    .eq('id', fotten.id)
  if (revErr) throw revErr
  console.log('Reverted. Admin verified.')
}

main().catch((e) => {
  console.error('Failed:', e)
  process.exit(1)
})
