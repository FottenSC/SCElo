import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

// Read credentials from environment with sensible defaults for local dev
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com'
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123'

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function testAdminLogin() {
  console.log('Testing admin login...')
  console.log(`Using credentials for ${ADMIN_EMAIL}`)
  
  // Try to sign in as admin
  const { data, error } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  if (error) {
    console.error('❌ Login failed:', error.message)
    console.log('\n📝 If this account exists with a different email/password, set ADMIN_EMAIL and ADMIN_PASSWORD env vars and re-run.')
    console.log('Example (PowerShell):')
    console.log('  $env:ADMIN_EMAIL = \"you@example.com\"; $env:ADMIN_PASSWORD = \"yourpassword\"; node test-admin.mjs\n')
    console.log('If you still need to create the admin user, see setup-admin.sql in supabase Studio (http://127.0.0.1:54323).\n')
    return
  }

  console.log('✅ Login successful!')
  console.log('User ID:', data.user.id)
  console.log('Email:', data.user.email)
  console.log('Role:', data.user.app_metadata?.role)
  
  // Test the is_admin() function
  const { data: testData, error: testError } = await supabase.rpc('is_admin')
  
  if (testError) {
    console.error('❌ Error calling is_admin():', testError)
  } else {
    console.log('is_admin() returns:', testData)
  }

  // Test if we can update a match
  console.log('\nTesting permissions...')
  const { data: matches, error: matchError } = await supabase
    .from('matches')
    .select('id')
    .limit(1)

  if (matchError) {
    console.error('❌ Error reading matches:', matchError)
  } else {
    console.log('✅ Can read matches')
    
    if (matches && matches.length > 0) {
      const { error: updateError } = await supabase
        .from('matches')
        .update({ rating_change_p1: 0 })
        .eq('id', matches[0].id)
      
      if (updateError) {
        console.error('❌ Error updating match:', updateError)
      } else {
        console.log('✅ Can update matches')
      }
    }
  }

  await supabase.auth.signOut()
}

testAdminLogin()
