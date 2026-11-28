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
    .replace(/[''`]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const KOLOM_DIRI = 'nama_lengkap,kelas,nomor_induk_sekolah,nisn'

/** Teks tampilan NIS/NISN pada cetak; jika kosong keduanya → `-`. */
export function formatTeksNisNisn(nis?: string, nisn?: string, pemisah = ' / ') {
  const a = teks(nis)
  const b = teks(nisn)
  if (a && b) return `${a}${pemisah}${b}`
  if (a) return a
  if (b) return b
  return '-'
}

async function ambilBarisDataDiri(nilai: string, kolom: 'nomor_induk_sekolah' | 'nisn' = 'nomor_induk_sekolah') {
  if (!teks(nilai)) return null
  const { data } = await supabase.from('data_diri_siswa').select(KOLOM_DIRI).eq(kolom, nilai).limit(1).maybeSingle()
  return (data as DataDiriSiswaRingkas | null) || null
}

async function ambilDataDiriNamaKelas(nama: string, kelas: string) {
  const n = teks(nama)
  const k = teks(kelas)
  if (!n || !k) return null
  const { data: tepat } = await supabase
    .from('data_diri_siswa')
    .select(KOLOM_DIRI)
    .eq('nama_lengkap', n)
    .eq('kelas', k)
    .limit(1)
    .maybeSingle()
  if (tepat) return tepat as DataDiriSiswaRingkas
  const { data: daftar } = await supabase
    .from('data_diri_siswa')
    .select(KOLOM_DIRI)
    .eq('kelas', k)
    .ilike('nama_lengkap', n)
    .limit(5)
  const target = normalNama(n)
  const cocok = (daftar || []).find((row) => normalNama(teks(row.nama_lengkap)) === target)
  return (cocok as DataDiriSiswaRingkas | undefined) || null
}

async function ambilDataDiriNamaFuzzy(nama: string) {
  const n = teks(nama)
  if (!n) return null
  const { data: tepat } = await supabase.from('data_diri_siswa').select(KOLOM_DIRI).eq('nama_lengkap', n).limit(1).maybeSingle()
  if (tepat) return tepat as DataDiriSiswaRingkas
  const kataPertama = n.split(/\s+/)[0] || n
  const { data: daftar } = await supabase
    .from('data_diri_siswa')
    .select(KOLOM_DIRI)
    .ilike('nama_lengkap', `%${kataPertama}%`)
    .limit(25)
  const target = normalNama(n)
  const cocok = (daftar || []).find((row) => normalNama(teks(row.nama_lengkap)) === target)
  if (cocok) return cocok as DataDiriSiswaRingkas
  return (
    (daftar || []).find((row) => {
      const kandidat = normalNama(teks(row.nama_lengkap))
      return kandidat.includes(target) || target.includes(kandidat)
    }) as DataDiriSiswaRingkas | undefined
  ) || null
}

async function ambilNisnDariSiswa(idSiswa: string) {
  const id = teks(idSiswa)
  if (!id) return { nis: '', nisn: '' }
  const { data, error } = await supabase.from('siswa').select('nis,nisn').eq('id_siswa', id).maybeSingle()
  if (error && /nisn|column|schema cache/i.test(error.message || '')) {
    const { data: tanpaNisn } = await supabase.from('siswa').select('nis').eq('id_siswa', id).maybeSingle()
    return { nis: teks(tanpaNisn?.nis), nisn: '' }
  }
  const baris = data as { nis?: string; nisn?: string } | null
  return { nis: teks(baris?.nis), nisn: teks(baris?.nisn) }
}

/**
 * Gabungkan NIS/NISN dari `siswa` dan `data_diri_siswa` (beberapa strategi pencocokan).
 */
export async function resolveIdentitasSiswaCetak(input: {
  idSiswa?: string
  nama?: string
  kelas?: string
  nis?: string
  nisn?: string
}): Promise<IdentitasSiswaCetak> {
  const id = teks(input.idSiswa)
  const nama = teks(input.nama)
  const kelas = teks(input.kelas)
  const nisSiswa = teks(input.nis)
  const nisnHint = teks(input.nisn)

  const dariSiswa = id ? await ambilNisnDariSiswa(id) : { nis: '', nisn: '' }

  let diri: DataDiriSiswaRingkas | null = null
  const nomorCoba = [nisSiswa, dariSiswa.nis, id].filter((nilai, indeks, daftar) => teks(nilai) && daftar.indexOf(nilai) === indeks)
  for (const nomor of nomorCoba) {
    const baris = await ambilBarisDataDiri(nomor, 'nomor_induk_sekolah')
    if (baris) {
      diri = baris
      break
    }
  }
  if (!diri && (nisnHint || dariSiswa.nisn)) {
    diri = await ambilBarisDataDiri(nisnHint || dariSiswa.nisn, 'nisn')
  }
  if (!diri) diri = await ambilDataDiriNamaKelas(nama, kelas)
  if (!diri) diri = await ambilDataDiriNamaFuzzy(nama)

  const nis = nisSiswa || dariSiswa.nis || teks(diri?.nomor_induk_sekolah) || id
  const nisn = teks(diri?.nisn) || nisnHint || dariSiswa.nisn

  return { nis, nisn }
}