import { supabase } from '@/lib/supabase'
import { normalKelas } from '@/lib/qiroah'
import { fetchDaftarSiswa, kanonNamaUnit, type Siswa } from '@/lib/siswa'
import { muatKirimRaporHq, type KirimRaporHq } from '@/lib/rapor-hq-kirim'
import { periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'

export const NAMA_PEMERIKSA_HQ_CADANGAN = 'Ambar Novitasari, S.Pd'
export const ID_PEMERIKSA_HQ_CADANGAN = 'U031'
export const UNIT_PEMERIKSA_HQ = 'Nogosari'

export type BarisUserPemeriksaHq = {
  nama_lengkap?: string | null
  role?: unknown
  is_pemeriksa_hq?: unknown
  target_id?: string | null
  username?: string | null
}

function teks(nilai: unknown) {
  return String(nilai ?? '').trim()
}

function teksRole(nilai: unknown) {
  if (Array.isArray(nilai)) return nilai.map((item) => teks(item)).join(' ')
  const mentah = teks(nilai)
  if (mentah.startsWith('[') && mentah.endsWith(']')) {
    try {
      const parsed = JSON.parse(mentah)
      if (Array.isArray(parsed)) return parsed.map((item) => teks(item)).join(' ')
    } catch {
      /* role teks biasa */
    }
  }
  return mentah
}

function normalNamaOrang(nilai?: string | null) {
  return teks(nilai)
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bs\.?\s*p[dg]\.?\s*i?\b/gi, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function benderaPemeriksa(nilai: unknown) {
  if (nilai === true || nilai === 1) return true
  const teksNilai = String(nilai ?? '')
    .trim()
    .toLowerCase()
  return teksNilai === 'true' || teksNilai === 't' || teksNilai === 'ya' || teksNilai === '1'
}

function rolePemeriksaHq(nilai: unknown) {
  const role = teksRole(nilai).toLowerCase().replace(/\s+/g, ' ')
  return /pemeriksa(?:\s+penilaian)?\s+hq/.test(role)
}

export function adalahKelasPutriHq(kelas?: string | null) {
  const kunci = normalKelas(kelas || '')
  return /[CD]$/.test(kunci)
}

export function adalahSiswaPutriNogosari(siswa: { kelas?: string | null; unit?: string | null }) {
  if (!adalahKelasPutriHq(siswa.kelas)) return false
  const unit = kanonNamaUnit(siswa.unit)
  if (unit && unit !== UNIT_PEMERIKSA_HQ) return false
  return true
}

export function adalahPemeriksaHq(
  user?: {
    nama_lengkap?: string | null
    nama?: string | null
    role?: unknown
    is_pemeriksa_hq?: unknown
    target_id?: string | null
    username?: string | null
  } | null,
) {
  if (!user) return false
  if (benderaPemeriksa(user.is_pemeriksa_hq)) return true
  if (rolePemeriksaHq(user.role)) return true
  const id = teks(user.target_id || user.username).toUpperCase()
  if (id === ID_PEMERIKSA_HQ_CADANGAN) return true
  const nama = normalNamaOrang(user.nama_lengkap || user.nama)
  const cadangan = normalNamaOrang(NAMA_PEMERIKSA_HQ_CADANGAN)
  return Boolean(nama && cadangan && (nama === cadangan || nama.includes('ambar novitasari')))
}

async function cariBarisUsers(user: {
  target_id?: string | null
  username?: string | null
  nama_lengkap?: string | null
  nama?: string | null
}): Promise<BarisUserPemeriksaHq | null> {
  const kolomUtama = 'nama_lengkap,role,is_pemeriksa_hq,target_id,username'
  const kolomCadangan = 'nama_lengkap,role,target_id,username'
  const filter: { kolom: string; nilai: string }[] = []
  const id = teks(user.target_id)
  const username = teks(user.username)
  const nama = teks(user.nama_lengkap || user.nama)
  if (id) filter.push({ kolom: 'target_id', nilai: id })
  if (username && username.toUpperCase() !== id.toUpperCase()) filter.push({ kolom: 'username', nilai: username })
  if (nama) filter.push({ kolom: 'nama_lengkap', nilai: nama })

  const jalankan = async (kolomSelect: string) => {
    for (const item of filter) {
      const permintaan =
        item.kolom === 'nama_lengkap'
          ? supabase.from('users').select(kolomSelect).ilike(item.kolom, item.nilai).limit(3)
          : supabase.from('users').select(kolomSelect).eq(item.kolom, item.nilai).limit(3)
      const { data, error } = await permintaan
      if (error) return { error: error.message, baris: null as BarisUserPemeriksaHq | null }
      const baris = ((data || []) as BarisUserPemeriksaHq[])[0]
      if (baris) return { error: null as string | null, baris }
    }
    return { error: null as string | null, baris: null as BarisUserPemeriksaHq | null }
  }

  const utama = await jalankan(kolomUtama)
  if (!utama.error) return utama.baris
  if (!/column|schema cache|does not exist/i.test(utama.error)) return null
  const cadangan = await jalankan(kolomCadangan)
  return cadangan.baris
}

/** Membaca hak Pemeriksa Penilaian HQ dari tabel `users` (nama_lengkap, role, is_pemeriksa_hq). */
export async function muatHakPemeriksaHq(user?: {
  target_id?: string | null
  username?: string | null
  nama_lengkap?: string | null
  nama?: string | null
  role?: unknown
  is_pemeriksa_hq?: unknown
} | null) {
  if (!user) return { hak: false, baris: null as BarisUserPemeriksaHq | null }
  const baris = await cariBarisUsers(user)
  const gabungan = {
    ...user,
    ...baris,
    nama_lengkap: baris?.nama_lengkap || user.nama_lengkap,
    role: baris?.role || user.role,
    is_pemeriksa_hq: baris?.is_pemeriksa_hq ?? user.is_pemeriksa_hq,
    target_id: baris?.target_id || user.target_id,
    username: baris?.username || user.username,
  }
  return { hak: adalahPemeriksaHq(gabungan), baris }
}

export function sudahDiperiksaHq(baris: Pick<KirimRaporHq, 'statusPemeriksa' | 'diperiksaPada'>) {
  return Boolean(baris.statusPemeriksa === 'Diperiksa' || baris.diperiksaPada)
}

export async function muatPenilaianPutriHq(asesmen?: string) {
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const [kirim, siswa] = await Promise.all([muatKirimRaporHq(), fetchDaftarSiswa()])
  if (kirim.error) return { error: kirim.error, data: [] as KirimRaporHq[], siswa: [] as Siswa[] }
  const petaSiswa = new Map(siswa.map((item) => [item.id_siswa, item]))
  const data = kirim.data
    .filter((row) => {
      if (row.tahunAjaran && row.tahunAjaran !== tahunAjaran) return false
      if (row.semester && row.semester !== semester) return false
      if (asesmen && row.asesmen !== asesmen) return false
      const milik = petaSiswa.get(row.idSiswa)
      if (milik) return adalahSiswaPutriNogosari(milik)
      return adalahKelasPutriHq(row.kelas)
    })
    .sort(
      (a, b) =>
        a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.namaSiswa.localeCompare(b.namaSiswa, 'id'),
    )
  return { error: null as string | null, data, siswa: siswa.filter(adalahSiswaPutriNogosari) }
}
