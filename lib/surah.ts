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

function normNamaSurah(nama: string) {
  return nama
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[’'`]/g, '')
}

/** Cocokkan nama surat dari input guru (datalist / ketikan). */
export function cariSurah(surahs: Surah[], namaInput: string): Surah | undefined {
  const q = normNamaSurah(namaInput)
  if (!q) return undefined
  const exact = surahs.find((s) => normNamaSurah(s.nama_surat) === q)
  if (exact) return exact
  return surahs.find((s) => normNamaSurah(s.nama_surat).includes(q) || q.includes(normNamaSurah(s.nama_surat)))
}

export function validasiAyatSurat(
  surahs: Surah[],
  namaSurah: string,
  ayatMulai: string,
  ayatSelesai: string,
  konteks: string,
): string | null {
  const surah = String(namaSurah || '').trim()
  if (!surah) return null
  const mulai = String(ayatMulai || '').trim()
  const selesai = String(ayatSelesai || '').trim() || mulai
  if (!mulai && !selesai) return null

  const baris = cariSurah(surahs, surah)
  if (!baris) return null

  const maks = baris.jumlah_ayat
  const nMulai = Number(mulai)
  const nSelesai = Number(selesai)
  if (!Number.isFinite(nMulai) || nMulai < 1) {
    return `${konteks}: ayat mulai tidak valid.`
  }
  if (!Number.isFinite(nSelesai) || nSelesai < 1) {
    return `${konteks}: ayat selesai tidak valid.`
  }
  if (nMulai > maks) {
    return `${konteks}: Surat ${baris.nama_surat} hanya memiliki ${maks} ayat. Ayat mulai ${nMulai} melebihi batas.`
  }
  if (nSelesai > maks) {
    return `${konteks}: Surat ${baris.nama_surat} hanya memiliki ${maks} ayat. Ayat selesai ${nSelesai} melebihi batas.`
  }
  if (nSelesai < nMulai) {
    return `${konteks}: ayat selesai tidak boleh kurang dari ayat mulai.`
  }
  return null
}

export type SegmenAyatHalaman = { surah: string; mulai: string; selesai: string }

/** Ambil segmen surat + rentang ayat dari teks "Halaman / Surah & Ayat" qiroah. */
export function parseSegmenHalamanQiroah(teks: string): SegmenAyatHalaman[] {
  const raw = String(teks || '').trim()
  if (!raw || raw === '-') return []
  const bagian = raw.split(/[,|]/).map((s) => s.trim()).filter(Boolean)
  const hasil: SegmenAyatHalaman[] = []

  for (const part of bagian) {
    const pola = [
      /^(.+?)\s*:\s*(\d+)\s*[-–]\s*(\d+)\s*$/i,
      /^(.+?)\s+(\d+)\s*[-–]\s*(\d+)\s*$/i,
      /^(.+?)\s*:\s*(\d+)\s*$/i,
      /^(.+?)\s+ayat\s+(\d+)\s*[-–]\s*(\d+)\s*$/i,
    ]
    let cocok: RegExpMatchArray | null = null
    for (const rx of pola) {
      cocok = part.match(rx)
      if (cocok) break
    }
    if (!cocok) continue
    const surah = cocok[1].replace(/^surah\s+/i, '').trim()
    const mulai = cocok[2]
    const selesai = cocok[3] || mulai
    if (surah && mulai) hasil.push({ surah, mulai, selesai })
  }
  return hasil
}

export function validasiTeksHalamanQiroah(surahs: Surah[], halaman: string): string | null {
  const segmen = parseSegmenHalamanQiroah(halaman)
  for (const seg of segmen) {
    const galat = validasiAyatSurat(surahs, seg.surah, seg.mulai, seg.selesai, 'Setoran qiroah')
    if (galat) return galat
  }
  return null
}

export function peringatanAyatMelebihi(
  surahs: Surah[],
  namaSurah: string,
  ayat: string,
  konteks: string,
): string | null {
  const surah = String(namaSurah || '').trim()
  const angka = String(ayat || '').trim()
  if (!surah || !angka) return null
  const baris = cariSurah(surahs, surah)
  if (!baris) return null
  const n = Number(angka)
  if (!Number.isFinite(n) || n < 1) return null
  if (n > baris.jumlah_ayat) {
    return `${konteks}: Surat ${baris.nama_surat} hanya memiliki ${baris.jumlah_ayat} ayat.`
  }
  return null
}
