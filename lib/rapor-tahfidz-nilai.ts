import { supabase } from '@/lib/supabase'

export const TABEL_HEADER_RAPOR = 'rapor_tahfidz_header'
export const TABEL_DETAIL_RAPOR = 'rapor_tahfidz_detail'
const POTONGAN_KESALAHAN = 5

export type MateriNilaiUjian = {
  nama: string
  ayat: string
}

export type NilaiSurahUjian = {
  namaSurat: string
  rentangAyat: string
  kesalahanKelancaran: number | ''
  nilaiKelancaran: number | ''
  kesalahanMad: number | ''
  kesalahanDengung: number | ''
  kesalahanMakhraj: number | ''
  nilaiTajwid: number | ''
  nilaiAdab: number | ''
}

export type NarasiRaporTahfidz = {
  capaianKompetensi: string
  capaianTarget: string
  motivasi: string
  nilaiTarget?: number | ''
}

export type HeaderRaporTahfidz = {
  idUjian: string
  idSiswa: string
  jenisAsesmen: string
  tahunAjaran: string
  semester: string
  nilaiAkhir: number
  predikat: string
  nilaiTarget: number | ''
} & NarasiRaporTahfidz

function angka(value: unknown): number | '' {
  if (value === '' || value == null) return ''
  const n = Number(value)
  return Number.isFinite(n) ? n : ''
}

export function periodeAjaranSekarang(tanggal = new Date()) {
  const bulan = tanggal.getMonth() + 1
  const tahun = tanggal.getFullYear()
  const gasal = bulan >= 7
  const awal = gasal ? tahun : tahun - 1
  return {
    semester: gasal ? 'Gasal' : 'Genap',
    tahunAjaran: `${awal}/${awal + 1}`,
  }
}

export function nilaiDariKesalahan(jumlah: number | '') {
  if (jumlah === '') return ''
  return Math.max(0, Math.min(100, 100 - Number(jumlah) * POTONGAN_KESALAHAN))
}

export function nilaiTajwidOtomatis(mad: number | '', dengung: number | '', makhraj: number | '') {
  const bagian = [nilaiDariKesalahan(mad), nilaiDariKesalahan(dengung), nilaiDariKesalahan(makhraj)]
  if (bagian.some((item) => item === '')) return ''
  const rata = (bagian as number[]).reduce((a, b) => a + b, 0) / 3
  return Math.round(rata * 100) / 100
}

export function nilaiSurah(row: NilaiSurahUjian) {
  const a = Number(row.nilaiKelancaran)
  const b = Number(row.nilaiTajwid)
  const c = Number(row.nilaiAdab)
  if (![a, b, c].every((n) => Number.isFinite(n))) return null
  return Math.round(((a + b + c) / 3) * 100) / 100
}

export function predikatNilai(nilai: number) {
  if (nilai >= 90) return 'Mumtaz'
  if (nilai >= 80) return 'Jayyid Jiddan'
  if (nilai >= 70) return 'Jayyid'
  return 'Maqbul'
}

export function nilaiRataRataSurah(nilaiList: Array<number | null | undefined>) {
  const isi = nilaiList.filter((n): n is number => n != null && Number.isFinite(n) && n > 0)
  if (isi.length === 0) return null
  return Math.round((isi.reduce((a, b) => a + b, 0) / isi.length) * 100) / 100
}

export function nilaiRaporTahfidz(rata: number | null, target: number | null) {
  if (rata == null || target == null || !Number.isFinite(rata) || !Number.isFinite(target)) return null
  return Math.round(((2 * rata + target) / 3) * 100) / 100
}

export function parseNilaiTargetDariTeks(teks: string) {
  const m = String(teks || '').match(/nilai\s*target[^\d]{0,40}(\d+(?:[.,]\d+)?)/i)
  if (!m) return null
  const n = Number(m[1].replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export function judulAsesmenTahfidz(kode: string, semester?: string) {
  const k = String(kode || '')
    .toUpperCase()
    .replace(/\s+/g, ' ')
    .trim()
  if (k.includes('ASTS II') || k.includes('ASTS 2') || k.includes('TENGAH SEMESTER II')) {
    return 'ASESMEN SUMATIF TENGAH SEMESTER II'
  }
  if (k.includes('ASTS I') || k.includes('ASTS 1') || k.includes('TENGAH SEMESTER I') || k === 'ASTS') {
    return 'ASESMEN SUMATIF TENGAH SEMESTER I'
  }
  if (k === 'ASAT' || k.includes('AKHIR TAHUN')) return 'ASESMEN SUMATIF AKHIR TAHUN'
  if (k === 'ASAS' || k.includes('AKHIR SEMESTER')) {
    return String(semester || '').toLowerCase().includes('genap')
      ? 'ASESMEN SUMATIF AKHIR SEMESTER II'
      : 'ASESMEN SUMATIF AKHIR SEMESTER I'
  }
  return k || 'ASESMEN SUMATIF'
}

export function formatKelasRapor(kelas: string) {
  const m = String(kelas || '')
    .trim()
    .match(/^(\d+)\s*[-]?\s*([A-Z])$/i)
  if (!m) return String(kelas || '').trim()
  const nama = ['', 'satu', 'dua', 'tiga', 'empat', 'lima', 'enam']
  const n = Number(m[1])
  return nama[n] ? `${n} (${nama[n]}) ${m[2].toUpperCase()}` : String(kelas).trim()
}

export function noAbsenDariKode(idOrtu?: string | null) {
  const m = String(idOrtu || '').trim().match(/(\d+)$/)
  if (!m) return ''
  return String(Number(m[1]))
}

export function formatAngkaRapor(nilai: number | null | undefined) {
  if (nilai == null || !Number.isFinite(Number(nilai))) return '-'
  const n = Number(nilai)
  if (n <= 0) return '-'
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10)
}

export function barisKosong(materi: MateriNilaiUjian): NilaiSurahUjian {
  return {
    namaSurat: materi.nama,
    rentangAyat: materi.ayat,
    kesalahanKelancaran: '',
    nilaiKelancaran: '',
    kesalahanMad: '',
    kesalahanDengung: '',
    kesalahanMakhraj: '',
    nilaiTajwid: '',
    nilaiAdab: '',
  }
}

type BarisHeaderRapor = {
  id_ujian_tahfidz: string
  id_siswa: string
  jenis_asesmen: string
  tahun_ajaran: string
  semester: string
  nilai_akhir: number | null
  predikat: string | null
  capaian_kompetensi?: string | null
  capaian_target?: string | null
  motivasi?: string | null
  nilai_target?: number | null
}

async function ambilHeaderRapor(idSiswa: string, jenisAsesmen: string, tahunAjaran: string, semester: string) {
  const lengkap = await supabase
    .from(TABEL_HEADER_RAPOR)
    .select(
      'id_ujian_tahfidz,id_siswa,jenis_asesmen,tahun_ajaran,semester,nilai_akhir,predikat,capaian_kompetensi,capaian_target,motivasi,nilai_target',
    )
    .eq('id_siswa', idSiswa)
    .eq('jenis_asesmen', jenisAsesmen)
    .eq('tahun_ajaran', tahunAjaran)
    .eq('semester', semester)
    .maybeSingle()
  if (!lengkap.error) return { data: lengkap.data as BarisHeaderRapor | null, error: lengkap.error }
  if (!/nilai_target/i.test(lengkap.error.message || '')) return { data: null, error: lengkap.error }

  const cadangan = await supabase
    .from(TABEL_HEADER_RAPOR)
    .select(
      'id_ujian_tahfidz,id_siswa,jenis_asesmen,tahun_ajaran,semester,nilai_akhir,predikat,capaian_kompetensi,capaian_target,motivasi',
    )
    .eq('id_siswa', idSiswa)
    .eq('jenis_asesmen', jenisAsesmen)
    .eq('tahun_ajaran', tahunAjaran)
    .eq('semester', semester)
    .maybeSingle()
  return { data: (cadangan.data as BarisHeaderRapor | null) || null, error: cadangan.error }
}

export async function fetchNilaiUjianTahfidz(idSiswa: string, jenisAsesmen: string) {
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const { data: header, error: galatHeader } = await ambilHeaderRapor(idSiswa, jenisAsesmen, tahunAjaran, semester)

  if (galatHeader) return { header: null, detail: [] as NilaiSurahUjian[], error: galatHeader.message }
  if (!header) return { header: null, detail: [] as NilaiSurahUjian[], error: null }

  const { data: detail, error: galatDetail } = await supabase
    .from(TABEL_DETAIL_RAPOR)
    .select(
      'nama_surat,rentang_ayat,kesalahan_kelancaran,nilai_kelancaran,kesalahan_mad,kesalahan_dengung,kesalahan_makhraj,nilai_tajwid,nilai_adab',
    )
    .eq('header_id', header.id_ujian_tahfidz)

  if (galatDetail) return { header: null, detail: [] as NilaiSurahUjian[], error: galatDetail.message }

  return {
    header: {
      idUjian: String(header.id_ujian_tahfidz),
      idSiswa: String(header.id_siswa),
      jenisAsesmen: String(header.jenis_asesmen),
      tahunAjaran: String(header.tahun_ajaran),
      semester: String(header.semester),
      nilaiAkhir: Number(header.nilai_akhir || 0),
      predikat: String(header.predikat || ''),
      capaianKompetensi: String(header.capaian_kompetensi || ''),
      capaianTarget: String(header.capaian_target || ''),
      motivasi: String(header.motivasi || ''),
      nilaiTarget: angka(header.nilai_target),
    } satisfies HeaderRaporTahfidz,
    detail: (detail || []).map((row) => ({
      namaSurat: String(row.nama_surat || ''),
      rentangAyat: String(row.rentang_ayat || ''),
      kesalahanKelancaran: angka(row.kesalahan_kelancaran),
      nilaiKelancaran: angka(row.nilai_kelancaran),
      kesalahanMad: angka(row.kesalahan_mad),
      kesalahanDengung: angka(row.kesalahan_dengung),
      kesalahanMakhraj: angka(row.kesalahan_makhraj),
      nilaiTajwid: angka(row.nilai_tajwid),
      nilaiAdab: angka(row.nilai_adab),
    })),
    error: null,
  }
}

function angkaAtauKosong(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export async function simpanNilaiUjianTahfidz(payload: {
  idSiswa: string
  jenisAsesmen: string
  baris: NilaiSurahUjian[]
  narasi?: NarasiRaporTahfidz
}) {
  for (const row of payload.baris) {
    if (nilaiSurah(row) == null) {
      return { error: `Lengkapi nilai Kelancaran, Tajwid, dan Adab untuk ${row.namaSurat}.` }
    }
  }

  const nilaiList = payload.baris.map((row) => nilaiSurah(row) as number)
  const nilaiAkhir = Math.round((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) * 100) / 100
  const predikat = predikatNilai(nilaiAkhir)
  const { tahunAjaran, semester } = periodeAjaranSekarang()

  const { data: lama, error: galatCari } = await supabase
    .from(TABEL_HEADER_RAPOR)
    .select('id_ujian_tahfidz')
    .eq('id_siswa', payload.idSiswa)
    .eq('jenis_asesmen', payload.jenisAsesmen)
    .eq('tahun_ajaran', tahunAjaran)
    .eq('semester', semester)
    .maybeSingle()

  if (galatCari) return { error: galatCari.message }

  let headerId = lama?.id_ujian_tahfidz ? String(lama.id_ujian_tahfidz) : ''

  const nilaiTarget = angkaAtauKosong(payload.narasi?.nilaiTarget)
  const narasi = {
    capaian_kompetensi: payload.narasi?.capaianKompetensi || '',
    capaian_target: payload.narasi?.capaianTarget || '',
    motivasi: payload.narasi?.motivasi || '',
  }

  const isiHeader = {
    nilai_akhir: nilaiAkhir,
    predikat,
    ...narasi,
  }

  async function simpanHeader(denganTarget: boolean) {
    const isi = denganTarget ? { ...isiHeader, nilai_target: nilaiTarget } : isiHeader
    if (headerId) {
      return supabase.from(TABEL_HEADER_RAPOR).update({ ...isi, updated_at: new Date().toISOString() }).eq('id_ujian_tahfidz', headerId)
    }
    return supabase
      .from(TABEL_HEADER_RAPOR)
      .insert([{ id_siswa: payload.idSiswa, jenis_asesmen: payload.jenisAsesmen, tahun_ajaran: tahunAjaran, semester, ...isi }])
      .select('id_ujian_tahfidz')
      .single()
  }

  if (headerId) {
    let { error } = await simpanHeader(true)
    if (error && /nilai_target/i.test(error.message || '')) error = (await simpanHeader(false)).error
    if (error) return { error: error.message }
    const hapus = await supabase.from(TABEL_DETAIL_RAPOR).delete().eq('header_id', headerId)
    if (hapus.error) return { error: hapus.error.message }
  } else {
    let hasil = await simpanHeader(true)
    if (hasil.error && /nilai_target/i.test(hasil.error.message || '')) hasil = await simpanHeader(false)
    const data = hasil.data as { id_ujian_tahfidz?: string } | null
    if (hasil.error || !data?.id_ujian_tahfidz) return { error: hasil.error?.message || 'Header rapor gagal dibuat.' }
    headerId = String(data.id_ujian_tahfidz)
  }

  const { error: galatDetail } = await supabase.from(TABEL_DETAIL_RAPOR).insert(
    payload.baris.map((row) => ({
      header_id: headerId,
      id_siswa: payload.idSiswa,
      nama_surat: row.namaSurat,
      rentang_ayat: row.rentangAyat,
      kesalahan_kelancaran: Number(row.kesalahanKelancaran || 0),
      nilai_kelancaran: Number(row.nilaiKelancaran),
      kesalahan_mad: Number(row.kesalahanMad || 0),
      kesalahan_dengung: Number(row.kesalahanDengung || 0),
      kesalahan_makhraj: Number(row.kesalahanMakhraj || 0),
      nilai_tajwid: Number(row.nilaiTajwid),
      nilai_adab: Number(row.nilaiAdab),
    })),
  )

  if (galatDetail) return { error: galatDetail.message }
  return { error: null, nilaiAkhir, predikat }
}
