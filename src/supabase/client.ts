import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

const isDev = import.meta.env.DEV

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = 'Supabase env vars VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are not set.'
  if (isDev) {
    console.warn(msg, 'Falling back to local dev defaults if available.')
  } else {
    // In production, fail early to avoid confusing runtime behavior
    throw new Error(msg)
  }
}

export const supabase = createClient(
  supabaseUrl ?? 'http://localhost:54321',
  supabaseAnonKey ?? 'anon',
)
