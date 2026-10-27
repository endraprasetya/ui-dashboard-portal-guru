import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Supabase URL atau ANON KEY belum terisi di .env.local')
}

const globalForSupabase = globalThis as unknown as {
  __portalGuruSupabase?: SupabaseClient
}

function createSupabaseClient() {
  return createClient(supabaseUrl || 'https://placeholder.supabase.co', supabaseAnonKey || 'placeholder-key', {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
      storageKey: 'portal-guru-auth',
    },
  })
}

export const supabase = globalForSupabase.__portalGuruSupabase ?? createSupabaseClient()

if (!globalForSupabase.__portalGuruSupabase) {
  globalForSupabase.__portalGuruSupabase = supabase
}
