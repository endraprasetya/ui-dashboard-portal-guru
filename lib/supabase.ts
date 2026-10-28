import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function resolveSupabaseUrl(raw: string) {
  const value = raw.trim()
  if (!value) return ''
  try {
    const url = new URL(value)
    const project = url.pathname.match(/\/project\/([a-z0-9]+)(?:\/|$)/i)
    if (url.hostname === 'supabase.com' && project) {
      return `https://${project[1]}.supabase.co`
    }
    if (url.hostname.endsWith('.supabase.co')) {
      return `${url.protocol}//${url.hostname}`
    }
  } catch {
    return value.replace(/\/+$/, '')
  }
  return value.replace(/\/+$/, '')
}

const supabaseUrl = resolveSupabaseUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
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
