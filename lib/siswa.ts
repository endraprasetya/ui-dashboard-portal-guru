import { supabase } from '@/lib/supabase'

export type Siswa = {
  id_siswa: string
  nama_siswa: string
  kelas: string
  id_pembimbing?: string
  unit?: string
}

export function isKelasAlumni(kelas?: string | null) {
  return String(kelas || '').toLowerCase().includes('alumni')
}

export function excludeAlumniSiswa<T extends { kelas?: string | null }>(list: T[]): T[] {
  return list.filter((item) => !isKelasAlumni(item.kelas))
}

// Cache untuk data siswa (5 menit)
let siswaCache: Siswa[] | null = null
let siswaCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

/**
 * Fetch semua siswa dengan caching untuk performa
 * Gunakan filter di server-side jika memungkinkan untuk data besar
 */
export async function fetchAllSiswa(currentUser?: any): Promise<Siswa[]> {
  const now = Date.now()
  
  // Return cached data jika masih valid
  if (siswaCache && now - siswaCacheTime < CACHE_DURATION) {
    return filterSiswaByTeacher(excludeAlumniSiswa(siswaCache), currentUser)
  }

  const pageSize = 1000
  const all: Siswa[] = []
  let from = 0

  // Build query - fetch all students first, then filter by teacher ID
  let query = supabase
    .from('siswa')
    .select('id_siswa, nama_siswa, kelas, id_pembimbing, unit')
    .not('kelas', 'ilike', '%Alumni%')
    .order('nama_siswa', { ascending: true })

  while (true) {
    const { data, error } = await query.range(from, from + pageSize - 1)
    if (error) {
      console.error('Gagal mengambil data siswa:', error.message)
      break
    }
    const rows = excludeAlumniSiswa((data || []) as Siswa[])
    all.push(...rows)
    if ((data || []).length < pageSize) break
    from += pageSize
  }

  // Update cache
  siswaCache = all
  siswaCacheTime = now

  return filterSiswaByTeacher(excludeAlumniSiswa(all), currentUser)
}

/**
 * Filter siswa berdasarkan guru yang login (multi-guru support)
 * Dipisah sebagai fungsi terpisah untuk optimasi
 */
function filterSiswaByTeacher(siswaList: Siswa[], currentUser?: any): Siswa[] {
  if (!currentUser) return siswaList

  const teacherId = currentUser.target_id || currentUser.id_user || currentUser.username
  
  if (!teacherId) return siswaList

  // Filter students where teacher's ID is in id_pembimbing (supports multi-guru separated by comma)
  return siswaList.filter((siswa) => {
    if (isKelasAlumni(siswa.kelas)) return false
    const pembimbing = siswa.id_pembimbing || ''
    const pembimbingList = pembimbing.split(',').map((id) => id.trim().toUpperCase())
    return pembimbingList.includes(teacherId.toUpperCase())
  })
}

/**
 * Clear cache - panggil ini jika data siswa berubah
 */
export function clearSiswaCache() {
  siswaCache = null
  siswaCacheTime = 0
}