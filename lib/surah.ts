import { supabase } from '@/lib/supabase'

export type Surah = {
  id: number
  nomor_surat: number
  nama_surat: string
  jumlah_ayat: number
  juz: number
}

// Cache untuk data surah (10 menit)
let surahCache: Surah[] | null = null
let surahCacheTime = 0
const CACHE_DURATION = 10 * 60 * 1000 // 10 menit

/**
 * Fetch semua surah dengan caching untuk performa
 * Urutan descending dari An-Naas (114) ke Al-Fatihah (1)
 */
export async function fetchAllSurah(): Promise<Surah[]> {
  const now = Date.now()
  
  // Return cached data jika masih valid
  if (surahCache && now - surahCacheTime < CACHE_DURATION) {
    return surahCache
  }

  const { data, error } = await supabase
    .from('surah')
    .select('*')
    .order('nomor_surat', { ascending: false })

  if (error) {
    console.error('Gagal mengambil data surah:', error.message)
    return []
  }

  const surahList = (data || []) as Surah[]
  
  // Update cache
  surahCache = surahList
  surahCacheTime = now

  return surahList
}

/**
 * Clear cache - panggil ini jika data surah berubah
 */
export function clearSurahCache() {
  surahCache = null
  surahCacheTime = 0
}
