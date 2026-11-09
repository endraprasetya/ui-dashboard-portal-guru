import { supabase } from '@/lib/supabase'

export type Siswa = {
  id_siswa: string
  nama_siswa: string
  kelas: string
  id_pembimbing?: string
  unit?: string
  nis?: string
}

export function isKelasAlumni(kelas?: string | null) {
  return String(kelas || '').toLowerCase().includes('alumni')
}

export function excludeAlumniSiswa<T extends { kelas?: string | null }>(list: T[]): T[] {
  return list.filter((item) => !isKelasAlumni(item.kelas))
}

export type UserGuru = {
  target_id?: string
  id_user?: string
  username?: string
  nama_lengkap?: string
  nama?: string
  nip?: string
  NIP?: string
}

export function idGuru(user?: UserGuru | null) {
  return String(user?.target_id || user?.id_user || user?.username || '').trim()
}

function normalisasiNamaGuru(value?: string) {
  return String(value || '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bs\.?\s*p[dg]\.?\s*i?\b/gi, ' ')
    .replace(/\bs\.?\s*d?s\.?\s*i?\b/gi, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function namaGuruSama(a?: string, b?: string) {
  const na = normalisasiNamaGuru(a)
  const nb = normalisasiNamaGuru(b)
  if (!na || !nb) return false
  if (na === nb) return true
  const pendek = na.length < nb.length ? na : nb
  const panjang = na.length < nb.length ? nb : na
  if (pendek.length < 4) return false
  if (panjang.includes(pendek)) return true
  const kataA = na.split(/\s+/).filter((k) => k.length > 2)
  const kataB = nb.split(/\s+/).filter((k) => k.length > 2)
  if (kataA.length >= 2 && kataB.length >= 2 && kataA[0] === kataB[0] && kataA[1] === kataB[1]) return true
  return false
}

/** Semua identitas login yang bisa tertulis di kolom `id_pembimbing`. */
export function aliasGuruLogin(user?: UserGuru | null) {
  const out = new Set<string>()
  const bidang = [
    user?.target_id,
    user?.id_user,
    user?.username,
    user?.nip,
    user?.NIP,
    user?.nama_lengkap,
    user?.nama,
  ]
  for (const raw of bidang) {
    const teks = String(raw ?? '').trim()
    if (!teks) continue
    out.add(teks.toUpperCase())
    const norm = normalisasiNamaGuru(teks)
    if (norm) out.add(norm)
  }
  const id = idGuru(user)
  if (id) out.add(id.toUpperCase())
  return out
}

export function unitKanonik(nilai?: string | null) {
  return String(nilai ?? '')
    .trim()
    .replace(/^unit\s+/i, '')
    .toLowerCase()
}

export function unitSama(a?: string | null, b?: string | null) {
  const ka = unitKanonik(a)
  const kb = unitKanonik(b)
  return Boolean(ka && kb && ka === kb)
}

/** Cocok unit login vs baris siswa (ketat; tanpa lintas unit). */
export function unitCocok(unitUser?: string | null, unitBaris?: string | null) {
  const pengguna = String(unitUser || '').trim()
  if (!pengguna || /^semua\s*unit$/i.test(pengguna)) return true
  if (!String(unitBaris || '').trim()) return false
  return unitSama(pengguna, unitBaris)
}

export function unitLogin(user?: { unit?: string; sekolah?: string } | null) {
  const bersih = String(user?.unit || user?.sekolah || '').trim()
  if (!bersih || /^semua\s*unit$/i.test(bersih)) return ''
  return bersih
}

function filterSiswaByUnit(siswaList: Siswa[], currentUser?: { unit?: string; sekolah?: string } | null) {
  const unit = unitLogin(currentUser)
  if (!unit) return siswaList
  return siswaList.filter((siswa) => unitSama(siswa.unit, unit))
}

export function daftarPembimbing(value?: string | null) {
  return String(value || '')
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function cocokPembimbingSiswa(pembimbing: string | null | undefined, user?: UserGuru | null) {
  const daftar = daftarPembimbing(pembimbing)
  if (!daftar.length || !user) return false
  const alias = aliasGuruLogin(user)
  const namaUtama = String(user.nama_lengkap || user.nama || '').trim()
  for (const pem of daftar) {
    const pemUpper = pem.toUpperCase()
    if (alias.has(pemUpper)) return true
    const pemNorm = normalisasiNamaGuru(pem)
    if (pemNorm && alias.has(pemNorm)) return true
    if (namaUtama && namaGuruSama(namaUtama, pem)) return true
    for (const token of [user.target_id, user.id_user, user.username, user.nip, user.NIP] as const) {
      const teks = String(token ?? '').trim()
      if (teks && (teks.toUpperCase() === pemUpper || namaGuruSama(teks, pem))) return true
    }
  }
  return false
}

/** Cocokkan siswa binaan dengan ID atau nama guru yang login. */
export function adalahBinaan(value: string | null | undefined, teacherIdOrUser: string | UserGuru | null | undefined) {
  if (teacherIdOrUser && typeof teacherIdOrUser === 'object') {
    return cocokPembimbingSiswa(value, teacherIdOrUser)
  }
  const id = String(teacherIdOrUser || '').trim()
  if (!id) return false
  return cocokPembimbingSiswa(value, { target_id: id, username: id, nama_lengkap: id })
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
      .select('id_siswa, nama_siswa, kelas, id_pembimbing, unit, nis')
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

/** Daftar nama kelas untuk layar setting binaan (tabel `kelas` + siswa unit guru). */
export async function fetchDaftarKelasBinaan(currentUser?: { unit?: string; sekolah?: string } | null): Promise<string[]> {
  const unit = unitLogin(currentUser)
  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  while (true) {
    let query = supabase
      .from('siswa')
      .select('kelas,unit')
      .not('kelas', 'ilike', '%Alumni%')
      .range(from, from + pageSize - 1)

    const { data, error } = await query
    if (error) {
      console.error('Gagal mengambil kelas siswa:', error.message)
      break
    }

    const rows = excludeAlumniSiswa(data || [])
    for (const row of rows) {
      if (unit && !unitSama(row.unit, unit)) continue
      const namaKelas = String(row.kelas || '').trim()
      if (!namaKelas || isKelasAlumni(namaKelas)) continue
      counts.set(namaKelas, (counts.get(namaKelas) || 0) + 1)
    }

    if (rows.length < pageSize) break
    from += pageSize
  }

  const { data: kelasRows, error: kelasError } = await supabase
    .from('kelas')
    .select('nama')
    .order('nama', { ascending: true })

  if (kelasError) {
    console.error('Gagal mengambil daftar kelas:', kelasError.message)
  }

  const dariTabel = (kelasRows || [])
    .map((row) => String(row.nama || '').trim())
    .filter((nama) => nama && !isKelasAlumni(nama))

  const gabungan =
    dariTabel.length > 0 ? dariTabel : Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))

  return gabungan
}

export async function fetchAllSiswa(currentUser?: any): Promise<Siswa[]> {
  const semua = await fetchDaftarSiswa()
  const perUnit = filterSiswaByUnit(semua, currentUser)
  return filterSiswaByTeacher(perUnit, currentUser)
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
function filterSiswaByTeacher(siswaList: Siswa[], currentUser?: UserGuru | null): Siswa[] {
  if (!currentUser) return siswaList
  const punyaIdentitas = Boolean(
    idGuru(currentUser) ||
      String(currentUser.nama_lengkap || currentUser.nama || '').trim() ||
      String(currentUser.username || '').trim(),
  )
  if (!punyaIdentitas) return []
  return siswaList.filter(
    (siswa) => !isKelasAlumni(siswa.kelas) && adalahBinaan(siswa.id_pembimbing, currentUser),
  )
}

/**
 * Clear cache - panggil ini jika data siswa berubah
 */
export function clearSiswaCache() {
  siswaCache = null
  siswaCacheTime = 0
}