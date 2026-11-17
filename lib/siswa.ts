import { supabase } from '@/lib/supabase'
import { bacaYatim } from '@/lib/yatim'

export type Siswa = {
  id_siswa: string
  nama_siswa: string
  kelas: string
  id_pembimbing?: string
  unit?: string
  nis?: string
  is_yatim?: boolean
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
  unit?: string
  sekolah?: string
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
  const kataA = na.split(/\s+/).filter((k) => k.length > 1)
  const kataB = nb.split(/\s+/).filter((k) => k.length > 1)
  if (kataA.length >= 2 && kataB.length >= 2 && kataA[0] === kataB[0] && kataA[1] === kataB[1]) return true
  if (na.includes(' ') && nb.includes(' ')) {
    const pendek = na.length < nb.length ? na : nb
    const panjang = na.length < nb.length ? nb : na
    if (pendek.length >= 10 && panjang.includes(pendek)) return true
  }
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

const KUNCI_UNIT_AKUN = ['unit', 'nama_unit', 'unit_sekolah', 'unit_kerja', 'sekolah', 'nama_sekolah', 'cabang'] as const

/** Nama unit yang dipakai sesi dan filter. Tidak pernah mengganti unit lain menjadi Nogosari. */
export function kanonNamaUnit(nilai?: string | null) {
  const mentah = String(nilai ?? '').trim()
  const k = mentah.toLowerCase()
  if (!k || k.includes('semua')) return ''
  if (k.includes('kartasura')) return 'Kartasura'
  if (k.includes('cepogo')) return 'Cepogo'
  if (k.includes('nogosari')) return 'Nogosari'
  return mentah
}

/** Unit dari baris tabel `users` (atau sesi yang sudah disimpan dari baris itu). */
export function unitDariAkun(baris?: { unit?: string | null; sekolah?: string | null } | null) {
  if (!baris) return ''
  const sumber = baris as Record<string, unknown>
  for (const kunci of KUNCI_UNIT_AKUN) {
    const teks = String(sumber[kunci] ?? '').trim()
    if (!teks || /^semua\s*unit$/i.test(teks)) continue
    return kanonNamaUnit(teks) || teks
  }
  return ''
}

export function unitSama(a?: string | null, b?: string | null) {
  const ka = kanonNamaUnit(a)
  const kb = kanonNamaUnit(b)
  if (ka && kb) return ka.toLowerCase() === kb.toLowerCase()
  const mentahA = unitKanonik(a)
  const mentahB = unitKanonik(b)
  return Boolean(mentahA && mentahB && mentahA === mentahB)
}

/** Cocok unit login vs baris siswa (ketat; tanpa lintas unit). */
export function unitCocok(unitUser?: string | null, unitBaris?: string | null) {
  const pengguna = String(unitUser || '').trim()
  if (!pengguna || /^semua\s*unit$/i.test(pengguna)) return true
  if (!String(unitBaris || '').trim()) return false
  return unitSama(pengguna, unitBaris)
}

export function unitLogin(user?: { unit?: string; sekolah?: string } | null) {
  return unitDariAkun(user)
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
const KOLOM_DAFTAR_SISWA = [
  'id_siswa, nama_siswa, kelas, id_pembimbing, unit, nis, is_yatim',
  'id_siswa, nama_siswa, kelas, id_pembimbing, unit, nis, yatim',
  'id_siswa, nama_siswa, kelas, id_pembimbing, unit, nis, status_yatim',
  'id_siswa, nama_siswa, kelas, id_pembimbing, unit, nis',
]
let kolomDaftarSiswa: string | null = null

function petakanSiswa(row: Record<string, unknown>): Siswa {
  return {
    id_siswa: String(row.id_siswa || ''),
    nama_siswa: String(row.nama_siswa || ''),
    kelas: String(row.kelas || ''),
    id_pembimbing: row.id_pembimbing ? String(row.id_pembimbing) : undefined,
    unit: row.unit ? String(row.unit) : undefined,
    nis: row.nis ? String(row.nis) : undefined,
    is_yatim: bacaYatim(row.is_yatim ?? row.yatim ?? row.status_yatim),
  }
}

export async function fetchDaftarSiswa(): Promise<Siswa[]> {
  const now = Date.now()
  if (siswaCache && now - siswaCacheTime < CACHE_DURATION) {
    return excludeAlumniSiswa(siswaCache)
  }

  const pageSize = 1000
  const all: Siswa[] = []
  let from = 0

  while (true) {
    const urutan = kolomDaftarSiswa ? [kolomDaftarSiswa] : KOLOM_DAFTAR_SISWA
    let data: Record<string, unknown>[] | null = null
    let pesan = ''
    for (const kolom of urutan) {
      const hasil = await supabase
        .from('siswa')
        .select(kolom)
        .not('kelas', 'ilike', '%Alumni%')
        .order('nama_siswa', { ascending: true })
        .range(from, from + pageSize - 1)
      if (!hasil.error) {
        kolomDaftarSiswa = kolom
        data = (hasil.data || []) as unknown as Record<string, unknown>[]
        break
      }
      pesan = hasil.error.message
      if (!/column|schema cache|does not exist/i.test(pesan)) break
    }
    if (!data) {
      console.error('Gagal mengambil data siswa:', pesan)
      break
    }
    const rows = excludeAlumniSiswa(data.map(petakanSiswa))
    all.push(...rows)
    if (data.length < pageSize) break
    from += pageSize
  }

  siswaCache = all
  siswaCacheTime = now
  return excludeAlumniSiswa(all)
}

function tokenKueriPembimbing(user: UserGuru): string[] {
  const out = new Set<string>()
  const bidang = [
    user.target_id,
    user.id_user,
    user.username,
    user.nip,
    user.NIP,
    user.nama_lengkap,
    user.nama,
  ]
  for (const raw of bidang) {
    const teks = String(raw ?? '').trim()
    if (teks.length >= 2) out.add(teks)
    const tanpaGelar = teks
      .replace(/,?\s*s\.?\s*d?s\.?\s*i?\.?/gi, ' ')
      .replace(/,?\s*s\.?\s*p[dg]\.?\s*i?\.?/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (tanpaGelar.length >= 4) out.add(tanpaGelar)
  }
  return Array.from(out)
}

function klausaOrPembimbing(user: UserGuru): string {
  const bagian: string[] = []
  const sudah = new Set<string>()
  for (const item of tokenKueriPembimbing(user)) {
    const aman = item
      .replace(/["\\]/g, '')
      .replace(/[%_(),]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (aman.length < 2) continue
    const kunci = aman.toLowerCase()
    if (sudah.has(kunci)) continue
    sudah.add(kunci)
    bagian.push(`id_pembimbing.ilike."%${aman}%"`)
  }
  return bagian.join(',')
}

const KOLOM_SISWA = 'id_siswa, nama_siswa, kelas, id_pembimbing, unit, nis'

async function halamanSiswaDenganOr(orKlausa: string): Promise<Siswa[]> {
  const pageSize = 1000
  const all: Siswa[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('siswa')
      .select(KOLOM_SISWA)
      .not('kelas', 'ilike', '%Alumni%')
      .not('id_pembimbing', 'is', null)
      .neq('id_pembimbing', '')
      .or(orKlausa)
      .order('nama_siswa', { ascending: true })
      .range(from, from + pageSize - 1)
    if (error) {
      const ulang = await supabase
        .from('siswa')
        .select(KOLOM_SISWA)
        .not('kelas', 'ilike', '%Alumni%')
        .or(orKlausa.replace(/"/g, ''))
        .order('nama_siswa', { ascending: true })
        .range(from, from + pageSize - 1)
      if (ulang.error) {
        console.error('Gagal mengambil siswa binaan:', error.message)
        break
      }
      const rowsUlang = excludeAlumniSiswa((ulang.data || []) as Siswa[])
      all.push(...rowsUlang)
      if ((ulang.data || []).length < pageSize) break
      from += pageSize
      continue
    }
    const rows = excludeAlumniSiswa((data || []) as Siswa[])
    all.push(...rows)
    if ((data || []).length < pageSize) break
    from += pageSize
  }
  return all
}

/** Kelas yang punya siswa binaan guru login — tidak menarik seluruh kelas 1–6. */
export async function fetchDaftarKelasBinaan(currentUser?: UserGuru | null): Promise<string[]> {
  const binaan = await fetchSiswaBinaan(currentUser)
  return Array.from(new Set(binaan.map((item) => item.kelas.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, 'id', { numeric: true }),
  )
}

/** Kunci stabil untuk efek React (hindari loop karena objek `currentUser` baru tiap render). */
export function kunciUserGuru(user?: UserGuru | null) {
  return [
    user?.target_id,
    user?.id_user,
    user?.username,
    user?.nip,
    user?.NIP,
    user?.nama_lengkap,
    user?.nama,
    user?.unit,
  ]
    .map((item) => String(item || '').trim())
    .join('|')
}

export function saringSiswaBinaan(siswaList: Siswa[], currentUser?: UserGuru | null): Siswa[] {
  if (!currentUser) return []
  return filterSiswaByTeacher(filterSiswaByUnit(siswaList, currentUser), currentUser)
}

/**
 * Hanya siswa binaan guru yang login.
 * Filter di Supabase lewat `id_pembimbing` (ID/nama/NIP guru) — tidak menarik seluruh kelas 1–6.
 */
export async function fetchSiswaBinaan(currentUser?: UserGuru | null): Promise<Siswa[]> {
  if (!currentUser) return []
  const punyaIdentitas = Boolean(
    idGuru(currentUser) ||
      String(currentUser.nama_lengkap || currentUser.nama || currentUser.username || '').trim(),
  )
  if (!punyaIdentitas) return []
  const orKlausa = klausaOrPembimbing(currentUser)
  if (!orKlausa) return []
  const kandidat = await halamanSiswaDenganOr(orKlausa)
  return saringSiswaBinaan(kandidat, currentUser)
}

/** Pencarian terbatas (maks. 25) untuk menambah binaan di setting — bukan dump kelas 1–6. */
export async function cariSiswaUntukBinaan(kata: string, currentUser?: UserGuru | null): Promise<Siswa[]> {
  const query = kata.trim().replace(/[%_]/g, '')
  if (query.length < 2 || !currentUser) return []
  const { data, error } = await supabase
    .from('siswa')
    .select(KOLOM_SISWA)
    .ilike('nama_siswa', `%${query}%`)
    .not('kelas', 'ilike', '%Alumni%')
    .order('nama_siswa', { ascending: true })
    .limit(25)
  if (error) {
    console.error('Gagal mencari siswa:', error.message)
    return []
  }
  return excludeAlumniSiswa(filterSiswaByUnit((data || []) as Siswa[], currentUser))
}

/** @deprecated Gunakan `fetchSiswaBinaan` — perilaku sama (hanya binaan). */
export async function fetchAllSiswa(currentUser?: UserGuru | null): Promise<Siswa[]> {
  return fetchSiswaBinaan(currentUser)
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
  if (!currentUser) return []
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