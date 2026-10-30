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

export function idGuru(user?: { target_id?: string; id_user?: string; username?: string } | null) {
  return String(user?.target_id || user?.id_user || user?.username || '').trim()
}

export function unitCocok(unitUser?: string | null, unitBaris?: string | null) {
  const pengguna = String(unitUser || '').trim().toLowerCase()
  const baris = String(unitBaris || '').trim().toLowerCase()
  if (!pengguna || pengguna === 'semua unit') return true
  if (!baris) return false
  return pengguna === baris || baris.includes(pengguna) || pengguna.includes(baris)
}

export function daftarPembimbing(value?: string | null) {
  return String(value || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function adalahBinaan(value: string | null | undefined, teacherId: string) {
  const id = teacherId.trim().toUpperCase()
  if (!id) return false
  return daftarPembimbing(value).some((item) => item.toUpperCase() === id)
}

export function susunPembimbing(value: string | null | undefined, teacherId: string, aktif: boolean) {
  const id = teacherId.trim()
  const daftar = daftarPembimbing(value).filter((item) => item.toUpperCase() !== id.toUpperCase())
  if (aktif && id) daftar.push(id)
  return daftar.join(', ')
}

// Cache untuk data siswa (5 menit)
let siswaCache: Siswa[] | null = null
let siswaCacheTime = 0
const CACHE_DURATION = 5 * 60 * 1000 // 5 menit

/**
 * Fetch semua siswa dengan caching untuk performa
 * Gunakan filter di server-side jika memungkinkan untuk data besar
 */
export async function fetchDaftarSiswa(): Promise<Siswa[]> {
  const now = Date.now()
  if (siswaCache && now - siswaCacheTime < CACHE_DURATION) {
    return excludeAlumniSiswa(siswaCache)
  }

  const pageSize = 1000
  const all: Siswa[] = []
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('siswa')
      .select('id_siswa, nama_siswa, kelas, id_pembimbing, unit')
      .not('kelas', 'ilike', '%Alumni%')
      .order('nama_siswa', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) {
      console.error('Gagal mengambil data siswa:', error.message)
      break
    }
    const rows = excludeAlumniSiswa((data || []) as Siswa[])
    all.push(...rows)
    if ((data || []).length < pageSize) break
    from += pageSize
  }

  siswaCache = all
  siswaCacheTime = now
  return excludeAlumniSiswa(all)
}

export async function fetchAllSiswa(currentUser?: any): Promise<Siswa[]> {
  const semua = await fetchDaftarSiswa()
  return filterSiswaByTeacher(semua, currentUser)
}

export async function simpanSiswaBinaan(
  perubahan: { id_siswa: string; id_pembimbing: string }[],
) {
  const gagal: string[] = []
  for (let index = 0; index < perubahan.length; index += 6) {
    const bagian = perubahan.slice(index, index + 6)
    const hasil = await Promise.all(
      bagian.map(async (row) => {
        const { data, error } = await supabase
          .from('siswa')
          .update({ id_pembimbing: row.id_pembimbing })
          .eq('id_siswa', row.id_siswa)
          .select('id_siswa')
        if (error || !data?.length) return row.id_siswa
        return ''
      }),
    )
    gagal.push(...hasil.filter(Boolean))
  }
  clearSiswaCache()
  return gagal
}

export async function ambilBarisSiswa<T>(
  ids: string[],
  muat: (
    bagian: string[],
    from: number,
    to: number,
  ) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const unik = Array.from(new Set(ids.map((item) => String(item || '').trim()).filter(Boolean)))
  const hasil: T[] = []
  for (let index = 0; index < unik.length; index += 80) {
    const bagian = unik.slice(index, index + 80)
    let from = 0
    const ukuran = 1000
    while (true) {
      const { data, error } = await muat(bagian, from, from + ukuran - 1)
      if (error) break
      const rows = data || []
      hasil.push(...rows)
      if (rows.length < ukuran) break
      from += ukuran
    }
  }
  return hasil
}

/**
 * Filter siswa berdasarkan guru yang login (multi-guru support)
 * Dipisah sebagai fungsi terpisah untuk optimasi
 */
function filterSiswaByTeacher(siswaList: Siswa[], currentUser?: any): Siswa[] {
  if (!currentUser) return siswaList
  const teacherId = idGuru(currentUser)
  if (!teacherId) return siswaList
  return siswaList.filter((siswa) => !isKelasAlumni(siswa.kelas) && adalahBinaan(siswa.id_pembimbing, teacherId))
}

/**
 * Clear cache - panggil ini jika data siswa berubah
 */
export function clearSiswaCache() {
  siswaCache = null
  siswaCacheTime = 0
}