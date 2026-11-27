import { supabase } from '@/lib/supabase'

export type DataDiriSiswaRingkas = {
  nomor_induk_sekolah?: string | null
  nisn?: string | null
  nama_lengkap?: string | null
  kelas?: string | null
}

export type IdentitasSiswaCetak = {
  nis: string
  nisn: string
}

function teks(value: unknown) {
  const hasil = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!hasil || hasil === '-' || hasil.toLowerCase() === 'null') return ''
  return hasil
}

function normalNama(nama: string) {
  return nama
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Teks tampilan NIS/NISN pada cetak; jika kosong keduanya → `-`. */
export function formatTeksNisNisn(nis?: string, nisn?: string, pemisah = ' / ') {
  const a = teks(nis)
  const b = teks(nisn)
  if (a && b) return `${a}${pemisah}${b}`
  if (a) return a
  if (b) return b
  return '-'
}

async function ambilBarisDataDiri(kunci: string, nilai: string, kolom = 'nomor_induk_sekolah') {
  if (!teks(nilai)) return null
  const { data } = await supabase
    .from('data_diri_siswa')
    .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn')
    .eq(kolom, nilai)
    .limit(1)
    .maybeSingle()
  return (data as DataDiriSiswaRingkas | null) || null
}

async function ambilDataDiriNamaKelas(nama: string, kelas: string) {
  const n = teks(nama)
  const k = teks(kelas)
  if (!n || !k) return null
  const { data: tepat } = await supabase
    .from('data_diri_siswa')
    .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn')
    .eq('nama_lengkap', n)
    .eq('kelas', k)
    .limit(1)
    .maybeSingle()
  if (tepat) return tepat as DataDiriSiswaRingkas
  const { data: daftar } = await supabase
    .from('data_diri_siswa')
    .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn')
    .eq('kelas', k)
    .ilike('nama_lengkap', n)
    .limit(5)
  const target = normalNama(n)
  const cocok = (daftar || []).find((row) => normalNama(teks(row.nama_lengkap)) === target)
  return (cocok as DataDiriSiswaRingkas | undefined) || null
}

async function ambilNisnDariSiswa(idSiswa: string) {
  const id = teks(idSiswa)
  if (!id) return ''
  const { data, error } = await supabase.from('siswa').select('nis,nisn').eq('id_siswa', id).maybeSingle()
  if (error && /nisn|column|schema cache/i.test(error.message || '')) return ''
  return teks((data as { nisn?: string } | null)?.nisn)
}

/**
 * Gabungkan NIS/NISN dari `siswa` dan `data_diri_siswa` (beberapa strategi pencocokan).
 */
export async function resolveIdentitasSiswaCetak(input: {
  idSiswa?: string
  nama?: string
  kelas?: string
  nis?: string
}): Promise<IdentitasSiswaCetak> {
  const id = teks(input.idSiswa)
  const nama = teks(input.nama)
  const kelas = teks(input.kelas)
  const nisSiswa = teks(input.nis)

  let diri: DataDiriSiswaRingkas | null = null
  if (nisSiswa) diri = await ambilBarisDataDiri('nomor', nisSiswa)
  if (!diri && id) diri = await ambilBarisDataDiri('nomor', id)
  if (!diri && nisSiswa && id && nisSiswa !== id) {
    const cadangan = await ambilBarisDataDiri('nomor', id)
    if (cadangan) diri = cadangan
  }
  if (!diri) diri = await ambilDataDiriNamaKelas(nama, kelas)

  const nisnSiswa = id ? await ambilNisnDariSiswa(id) : ''
  const nis = nisSiswa || teks(diri?.nomor_induk_sekolah) || id
  const nisn = teks(diri?.nisn) || nisnSiswa

  return { nis, nisn }
}