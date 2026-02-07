import { createClient } from '@supabase/supabase-js'

// Next.js replaces process.env.NEXT_PUBLIC_* at build time
// Access environment variables directly - Next.js handles the replacement
const supabaseUrl = 
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_URL : undefined) ||
  ''

const supabaseAnonKey = 
  (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY : undefined) ||
  ''

if (!supabaseUrl || !supabaseAnonKey) {
  const errorMsg = 
    'Missing Supabase environment variables. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your .env.local file. ' +
    '(Note: In Next.js, client-side env vars must be prefixed with NEXT_PUBLIC_)'
  console.error(errorMsg)
  throw new Error(errorMsg)
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

