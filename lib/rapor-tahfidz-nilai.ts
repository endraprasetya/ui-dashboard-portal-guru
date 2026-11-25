import { supabase } from '@/lib/supabase'
import { ambilBarisSiswa } from '@/lib/siswa'
import {
  MAKS_NILAI_ADAB,
  MAKS_NILAI_AKHIR,
  MAKS_NILAI_KELANCAN,
  MAKS_NILAI_TAJWID,
  MIN_NILAI_KELANCAN,
  MIN_NILAI_TAJWID,
  PEMBAGI_NILAI_AKHIR,
  nilaiAkhirSuratHQ,
  nilaiKelancaranDariKesalahanSurah,
  nilaiTajwidDariKesalahan,
} from '@/lib/rubrik-tajwid-rapor-hq'

export {
  MAKS_NILAI_ADAB,
  MAKS_NILAI_AKHIR,
  MAKS_NILAI_KELANCAN,
  MAKS_NILAI_TAJWID,
  MIN_NILAI_KELANCAN,
  MIN_NILAI_TAJWID,
  PEMBAGI_NILAI_AKHIR,
  ringkasanBobotKelancaran,
  ringkasanBobotTajwid,
  uraianKelancaran,
  uraianTajwid,
} from '@/lib/rubrik-tajwid-rapor-hq'

export const TABEL_HEADER_RAPOR = 'rapor_tahfidz_header'
export const TABEL_DETAIL_RAPOR = 'rapor_tahfidz_detail'
export const MAKS_NILAI_SURAT = MAKS_NILAI_AKHIR

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

export function nilaiKelancaranDariKesalahan(namaSurat: string, jumlah: number | '') {
  return nilaiKelancaranDariKesalahanSurah(namaSurat, jumlah)
}

export function clampNilaiKelancaran(nilai: number) {
  return Math.max(MIN_NILAI_KELANCAN, Math.min(MAKS_NILAI_KELANCAN, nilai))
}

export function clampNilaiAdab(nilai: number) {
  return Math.max(0, Math.min(MAKS_NILAI_ADAB, nilai))
}

export function clampNilaiTajwid(nilai: number) {
  return Math.max(MIN_NILAI_TAJWID, Math.min(MAKS_NILAI_TAJWID, nilai))
}

export function nilaiTajwidOtomatis(
  namaSurat: string,
  mad: number | '',
  dengung: number | '',
  makhraj: number | '',
) {
  return nilaiTajwidDariKesalahan(namaSurat, mad, dengung, makhraj)
}

export function nilaiSurah(row: NilaiSurahUjian) {
  const a = Number(row.nilaiKelancaran)
  const b = Number(row.nilaiTajwid)
  const c = Number(row.nilaiAdab)
  if (![a, b, c].every((n) => Number.isFinite(n))) return null
  if (a < 0 || a > MAKS_NILAI_KELANCAN || b < 0 || b > MAKS_NILAI_TAJWID || c < 0 || c > MAKS_NILAI_ADAB) {
    return null
  }
  return nilaiAkhirSuratHQ(a, b, c)
}

export function uraianNilaiSurah(row: NilaiSurahUjian) {
  const na = nilaiSurah(row)
  if (na == null) return ''
  return `(${row.nilaiKelancaran} + ${row.nilaiTajwid} + ${row.nilaiAdab}) ÷ ${PEMBAGI_NILAI_AKHIR} = ${na}`
}

export function predikatNilai(nilai: number) {
  if (nilai >= 90) return 'Mumtaz'
  if (nilai >= 80) return 'Jayyid Jiddan'
  if (nilai >= 70) return 'Jayyid'
  return 'Mengulang'
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

export type CadanganNilaiTarget = {
  nilaiTarget: number
  capaianTarget: string
}

/** Kunci unik per siswa, asesmen, dan periode ajaran yang sedang berjalan. */
export function kunciCadanganNilaiTarget(idSiswa: string, asesmen: string, tanggal = new Date()) {
  const { tahunAjaran, semester } = periodeAjaranSekarang(tanggal)
  return `nilai-target-tahfidz:${String(idSiswa || '').trim()}:${String(asesmen || '').trim()}:${tahunAjaran}:${semester}`
}

export function bacaCadanganNilaiTarget(idSiswa: string, asesmen: string): CadanganNilaiTarget | null {
  if (typeof window === 'undefined') return null
  try {
    const mentah = window.localStorage.getItem(kunciCadanganNilaiTarget(idSiswa, asesmen))
    if (!mentah) return null
    const data = JSON.parse(mentah) as { nilaiTarget?: unknown; capaianTarget?: unknown }
    const n = Number(data.nilaiTarget)
    if (!Number.isFinite(n)) return null
    return { nilaiTarget: n, capaianTarget: String(data.capaianTarget || '') }
  } catch {
    return null
  }
}

export function tulisCadanganNilaiTarget(idSiswa: string, asesmen: string, nilai: number | '', capaianTarget: string) {
  if (typeof window === 'undefined') return
  const kunci = kunciCadanganNilaiTarget(idSiswa, asesmen)
  if (nilai === '' || !Number.isFinite(Number(nilai))) {
    window.localStorage.removeItem(kunci)
    return
  }
  window.localStorage.setItem(kunci, JSON.stringify({ nilaiTarget: Number(nilai), capaianTarget: String(capaianTarget || '') }))
}

/** Kolom Supabase dulu, lalu cadangan localStorage, lalu angka di teks capaian. Teks guru di basis tidak ditimpa cadangan. */
export function pulihkanNilaiTarget(opsi: {
  dariBasis: number | '' | null | undefined
  capaianBasis: string
  cadangan: CadanganNilaiTarget | null
}) {
  const capaianBasis = String(opsi.capaianBasis || '')
  const angkaBasis = opsi.dariBasis === '' || opsi.dariBasis == null ? null : Number(opsi.dariBasis)
  const capaianTarget = capaianBasis || opsi.cadangan?.capaianTarget || ''
  if (angkaBasis != null && Number.isFinite(angkaBasis)) {
    return { nilaiTarget: angkaBasis, capaianTarget }
  }
  if (opsi.cadangan && Number.isFinite(opsi.cadangan.nilaiTarget)) {
    return { nilaiTarget: opsi.cadangan.nilaiTarget, capaianTarget }
  }
  const dariTeks = parseNilaiTargetDariTeks(capaianBasis)
  if (dariTeks != null) return { nilaiTarget: dariTeks, capaianTarget: capaianBasis }
  return { nilaiTarget: '' as number | '', capaianTarget }
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
  if (payload.baris.length === 0) return { error: 'Pilih minimal satu surah untuk materi ujian.' }
  for (const row of payload.baris) {
    const nilai = nilaiSurah(row)
    if (nilai == null) {
      return {
        error: `Lengkapi nilai Kelancaran (${MIN_NILAI_KELANCAN}–${MAKS_NILAI_KELANCAN}), Tajwid (${MIN_NILAI_TAJWID}–${MAKS_NILAI_TAJWID}), dan Adab (0–${MAKS_NILAI_ADAB}) untuk ${row.namaSurat}.`,
      }
    }
    const k = Number(row.nilaiKelancaran)
    const tjw = Number(row.nilaiTajwid)
    const adb = Number(row.nilaiAdab)
    if (k > MAKS_NILAI_KELANCAN || tjw > MAKS_NILAI_TAJWID || adb > MAKS_NILAI_ADAB) {
      return {
        error: `Nilai Kelancaran maks. ${MAKS_NILAI_KELANCAN}, Tajwid maks. ${MAKS_NILAI_TAJWID}, Adab maks. ${MAKS_NILAI_ADAB} untuk ${row.namaSurat}.`,
      }
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
    capaian_kompetensi: String(payload.narasi?.capaianKompetensi ?? ''),
    capaian_target: String(payload.narasi?.capaianTarget ?? ''),
    motivasi: String(payload.narasi?.motivasi ?? ''),
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

/** Simpan angka target tanpa menunggu nilai kelancaran, tajwid, dan adab lengkap. */
export async function simpanNilaiTargetUjian(payload: {
  idSiswa: string
  jenisAsesmen: string
  nilaiTarget: number
  capaianTarget: string
}) {
  const idSiswa = String(payload.idSiswa || '').trim()
  const jenisAsesmen = String(payload.jenisAsesmen || '').trim()
  if (!idSiswa || !jenisAsesmen) return { error: 'Siswa atau asesmen belum dipilih.' }
  if (!Number.isFinite(payload.nilaiTarget)) return { error: 'Nilai target tidak valid.' }

  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const { data: lama, error: galatCari } = await supabase
    .from(TABEL_HEADER_RAPOR)
    .select('id_ujian_tahfidz')
    .eq('id_siswa', idSiswa)
    .eq('jenis_asesmen', jenisAsesmen)
    .eq('tahun_ajaran', tahunAjaran)
    .eq('semester', semester)
    .maybeSingle()
  if (galatCari) return { error: galatCari.message }

  const waktu = new Date().toISOString()
  const denganAngka = { capaian_target: payload.capaianTarget, nilai_target: payload.nilaiTarget, updated_at: waktu }
  const tanpaAngka = { capaian_target: payload.capaianTarget, updated_at: waktu }

  if (lama?.id_ujian_tahfidz) {
    let { error } = await supabase.from(TABEL_HEADER_RAPOR).update(denganAngka).eq('id_ujian_tahfidz', lama.id_ujian_tahfidz)
    if (error && /nilai_target/i.test(error.message || '')) {
      error = (await supabase.from(TABEL_HEADER_RAPOR).update(tanpaAngka).eq('id_ujian_tahfidz', lama.id_ujian_tahfidz)).error
    }
    return { error: error?.message || null }
  }

  const dasar = {
    id_siswa: idSiswa,
    jenis_asesmen: jenisAsesmen,
    tahun_ajaran: tahunAjaran,
    semester,
    predikat: '',
    capaian_kompetensi: '',
    motivasi: '',
    capaian_target: payload.capaianTarget,
  }

  async function sisip(denganTarget: boolean, nilaiAkhir: number | null) {
    const isi = denganTarget
      ? { ...dasar, nilai_akhir: nilaiAkhir, nilai_target: payload.nilaiTarget }
      : { ...dasar, nilai_akhir: nilaiAkhir }
    return supabase.from(TABEL_HEADER_RAPOR).insert([isi]).select('id_ujian_tahfidz').single()
  }

  let hasil = await sisip(true, null)
  if (hasil.error && /nilai_akhir|null value/i.test(hasil.error.message || '')) hasil = await sisip(true, 0)
  if (hasil.error && /nilai_target/i.test(hasil.error.message || '')) hasil = await sisip(false, 0)
  if (hasil.error) return { error: hasil.error.message }
  return { error: null as string | null }
}

function normSurah(nama: string) {
  return String(nama || '')
    .trim()
    .toLowerCase()
}

/** Hapus header dan rincian nilai ujian siswa pada periode ajaran yang sedang berjalan. */
export async function hapusNilaiUjianTahfidz(idSiswa: string, jenisAsesmen: string) {
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const { data, error } = await supabase
    .from(TABEL_HEADER_RAPOR)
    .select('id_ujian_tahfidz')
    .eq('id_siswa', idSiswa)
    .eq('jenis_asesmen', jenisAsesmen)
    .eq('tahun_ajaran', tahunAjaran)
    .eq('semester', semester)

  if (error) return { error: error.message }
  const ids = (data || []).map((row) => String(row.id_ujian_tahfidz || '')).filter(Boolean)
  if (ids.length === 0) return { error: null as string | null }

  const hapusDetail = await supabase.from(TABEL_DETAIL_RAPOR).delete().in('header_id', ids)
  if (hapusDetail.error) return { error: hapusDetail.error.message }
  const hapusHeader = await supabase.from(TABEL_HEADER_RAPOR).delete().in('id_ujian_tahfidz', ids)
  if (hapusHeader.error) return { error: hapusHeader.error.message }
  return { error: null as string | null }
}

/**
 * Sesuaikan rincian nilai yang sudah tersimpan dengan daftar surah baru.
 * Nilai surah yang masih diujikan dipertahankan; surah yang dikeluarkan dihapus dari nilai.
 * Surah baru tidak diisi angka — siap dinilai saat form dibuka.
 */
export async function selaraskanNilaiDenganMateri(idSiswa: string[], jenisAsesmen: string, materi: MateriNilaiUjian[]) {
  const unik = Array.from(new Set(idSiswa.map((item) => String(item || '').trim()).filter(Boolean)))
  if (unik.length === 0) return { error: null as string | null }
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const petaMateri = new Map(materi.map((item) => [normSurah(item.nama), item]))

  const headers: { id_ujian_tahfidz: string; id_siswa: string }[] = []
  for (let index = 0; index < unik.length; index += 80) {
    const bagian = unik.slice(index, index + 80)
    const { data, error } = await supabase
      .from(TABEL_HEADER_RAPOR)
      .select('id_ujian_tahfidz,id_siswa')
      .in('id_siswa', bagian)
      .eq('jenis_asesmen', jenisAsesmen)
      .eq('tahun_ajaran', tahunAjaran)
      .eq('semester', semester)
    if (error) return { error: error.message }
    headers.push(...((data || []) as { id_ujian_tahfidz: string; id_siswa: string }[]))
  }
  if (headers.length === 0) return { error: null as string | null }

  const headerIds = headers.map((row) => String(row.id_ujian_tahfidz))
  const detail: Record<string, unknown>[] = []
  for (let index = 0; index < headerIds.length; index += 80) {
    const bagian = headerIds.slice(index, index + 80)
    const { data, error } = await supabase
      .from(TABEL_DETAIL_RAPOR)
      .select(
        'header_id,nama_surat,rentang_ayat,kesalahan_kelancaran,nilai_kelancaran,kesalahan_mad,kesalahan_dengung,kesalahan_makhraj,nilai_tajwid,nilai_adab',
      )
      .in('header_id', bagian)
    if (error) return { error: error.message }
    detail.push(...((data || []) as Record<string, unknown>[]))
  }

  for (const header of headers) {
    const id = String(header.id_ujian_tahfidz)
    const milik = detail.filter((row) => String(row.header_id) === id)
    let adaHapus = false
    const sisa: Record<string, unknown>[] = []

    for (const row of milik) {
      const nama = String(row.nama_surat || '')
      const cocok = petaMateri.get(normSurah(nama))
      if (!cocok) {
        const hapus = await supabase.from(TABEL_DETAIL_RAPOR).delete().eq('header_id', id).eq('nama_surat', nama)
        if (hapus.error) return { error: hapus.error.message }
        adaHapus = true
        continue
      }
      const ayatBaru = String(cocok.ayat || '').trim()
      const ayatLama = String(row.rentang_ayat || '').trim()
      if (ayatBaru && ayatBaru !== ayatLama) {
        const ubah = await supabase.from(TABEL_DETAIL_RAPOR).update({ rentang_ayat: ayatBaru }).eq('header_id', id).eq('nama_surat', nama)
        if (ubah.error) return { error: ubah.error.message }
        sisa.push({ ...row, rentang_ayat: ayatBaru })
        continue
      }
      sisa.push(row)
    }

    if (!adaHapus) continue

    const nilaiList = sisa
      .map((row) =>
        nilaiSurah({
          namaSurat: String(row.nama_surat || ''),
          rentangAyat: String(row.rentang_ayat || ''),
          kesalahanKelancaran: angka(row.kesalahan_kelancaran),
          nilaiKelancaran: angka(row.nilai_kelancaran),
          kesalahanMad: angka(row.kesalahan_mad),
          kesalahanDengung: angka(row.kesalahan_dengung),
          kesalahanMakhraj: angka(row.kesalahan_makhraj),
          nilaiTajwid: angka(row.nilai_tajwid),
          nilaiAdab: angka(row.nilai_adab),
        }),
      )
      .filter((nilai): nilai is number => nilai != null)

    const nilaiAkhir =
      nilaiList.length > 0 ? Math.round((nilaiList.reduce((a, b) => a + b, 0) / nilaiList.length) * 100) / 100 : null
    const isi = {
      nilai_akhir: nilaiAkhir,
      predikat: nilaiAkhir == null ? '' : predikatNilai(nilaiAkhir),
      updated_at: new Date().toISOString(),
    }
    let { error } = await supabase.from(TABEL_HEADER_RAPOR).update(isi).eq('id_ujian_tahfidz', id)
    if (error && nilaiAkhir == null) {
      error = (
        await supabase
          .from(TABEL_HEADER_RAPOR)
          .update({ ...isi, nilai_akhir: 0 })
          .eq('id_ujian_tahfidz', id)
      ).error
    }
    if (error) return { error: error.message }
  }

  return { error: null as string | null }
}

export type HeaderAsesmenTahfidz = {
  id_siswa: string
  jenis_asesmen: string
  tahun_ajaran: string
  semester: string
}

/** Jenis asesmen terkini dari `rapor_tahfidz_header` untuk tahun ajaran berjalan. Tidak ada cache. */
export async function fetchJenisAsesmenHeader(idSiswa: string[]) {
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const baris = await ambilBarisSiswa<HeaderAsesmenTahfidz>(idSiswa, (bagian, from, to) =>
    supabase
      .from(TABEL_HEADER_RAPOR)
      .select('id_siswa,jenis_asesmen,tahun_ajaran,semester')
      .in('id_siswa', bagian)
      .eq('tahun_ajaran', tahunAjaran)
      .range(from, to),
  )
  const sem = semester.trim().toLowerCase()
  return baris.filter(
    (row) => String(row.semester || '').trim().toLowerCase() === sem && String(row.jenis_asesmen || '').trim(),
  )
}

/**
 * Kolom asesmen di daftar ujian mengikuti `jenis_asesmen` header.
 * Jika header tahun ini hanya punya satu jenis dan materi masih menyimpan label lama, label itu diganti.
 */
export function selaraskanAsesmenMateri<T extends { id_siswa: string; asesmen: string }>(
  baris: T[],
  header: Pick<HeaderAsesmenTahfidz, 'id_siswa' | 'jenis_asesmen'>[],
) {
  const perSiswa = new Map<string, Set<string>>()
  for (const row of header) {
    const jenis = String(row.jenis_asesmen || '').trim()
    const id = String(row.id_siswa || '').trim()
    if (!jenis || !id) continue
    const ada = perSiswa.get(id) || new Set<string>()
    ada.add(jenis)
    perSiswa.set(id, ada)
  }

  return baris.map((row) => {
    const jenis = perSiswa.get(String(row.id_siswa || '').trim())
    const sekarang = String(row.asesmen || '').trim()
    if (!jenis || jenis.size !== 1 || jenis.has(sekarang)) {
      return sekarang === row.asesmen ? row : { ...row, asesmen: sekarang }
    }
    const [berlaku] = jenis
    return { ...row, asesmen: berlaku }
  })
}

/** Samakan `materi_ujian_tahfidz.asesmen` dengan header supaya simpan/hapus tidak menempel di label lama. */
export async function tulisAsesmenMateriMengikutiHeader(
  sebelum: { id_siswa: string; asesmen: string }[],
  sesudah: { id_siswa: string; asesmen: string }[],
) {
  const kelompok = new Map<string, { dari: string; ke: string; ids: string[] }>()
  const n = Math.min(sebelum.length, sesudah.length)
  for (let i = 0; i < n; i += 1) {
    const dari = String(sebelum[i]?.asesmen || '').trim()
    const ke = String(sesudah[i]?.asesmen || '').trim()
    const id = String(sebelum[i]?.id_siswa || '').trim()
    if (!id || !dari || !ke || dari === ke) continue
    const kunci = `${dari}\n${ke}`
    const ada = kelompok.get(kunci) || { dari, ke, ids: [] }
    if (!ada.ids.includes(id)) ada.ids.push(id)
    kelompok.set(kunci, ada)
  }
  for (const { dari, ke, ids } of kelompok.values()) {
    for (let i = 0; i < ids.length; i += 80) {
      const bagian = ids.slice(i, i + 80)
      const { error } = await supabase
        .from('materi_ujian_tahfidz')
        .update({ asesmen: ke })
        .in('id_siswa', bagian)
        .eq('asesmen', dari)
      if (error) console.error('Gagal menyelaraskan asesmen materi ujian:', error.message)
    }
  }
}

export type PetaSurahDinilai = Map<string, Set<string>>

/** Nama surah untuk mencocokkan materi ujian dengan baris `rapor_tahfidz_detail`. */
export function kunciNamaSurah(nama: string) {
  return String(nama || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function detailSudahDinilai(row: Record<string, unknown>) {
  return (
    nilaiSurah({
      namaSurat: String(row.nama_surat || ''),
      rentangAyat: String(row.rentang_ayat || ''),
      kesalahanKelancaran: angka(row.kesalahan_kelancaran),
      nilaiKelancaran: angka(row.nilai_kelancaran),
      kesalahanMad: angka(row.kesalahan_mad),
      kesalahanDengung: angka(row.kesalahan_dengung),
      kesalahanMakhraj: angka(row.kesalahan_makhraj),
      nilaiTajwid: angka(row.nilai_tajwid),
      nilaiAdab: angka(row.nilai_adab),
    }) != null
  )
}

/**
 * Surah yang sudah memenuhi syarat nilai pada ujian tahun ajaran berjalan.
 * Kunci peta: `id_siswa|jenis_asesmen`. Tidak ada cache.
 */
export async function fetchSurahDinilaiUjian(idSiswa: string[]): Promise<PetaSurahDinilai> {
  const peta: PetaSurahDinilai = new Map()
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const header = await ambilBarisSiswa<{
    id_ujian_tahfidz: string
    id_siswa: string
    jenis_asesmen: string
    semester: string
  }>(idSiswa, (bagian, from, to) =>
    supabase
      .from(TABEL_HEADER_RAPOR)
      .select('id_ujian_tahfidz,id_siswa,jenis_asesmen,semester')
      .in('id_siswa', bagian)
      .eq('tahun_ajaran', tahunAjaran)
      .range(from, to),
  )
  const sem = semester.trim().toLowerCase()
  const idKeKunci = new Map<string, string>()
  for (const row of header) {
    if (String(row.semester || '').trim().toLowerCase() !== sem) continue
    const id = String(row.id_ujian_tahfidz || '').trim()
    const siswaId = String(row.id_siswa || '').trim()
    const jenis = String(row.jenis_asesmen || '').trim()
    if (!id || !siswaId || !jenis) continue
    idKeKunci.set(id, `${siswaId}|${jenis}`)
  }

  const headerIds = [...idKeKunci.keys()]
  for (let index = 0; index < headerIds.length; index += 80) {
    const bagian = headerIds.slice(index, index + 80)
    let from = 0
    while (true) {
      const { data, error } = await supabase
        .from(TABEL_DETAIL_RAPOR)
        .select(
          'header_id,nama_surat,rentang_ayat,kesalahan_kelancaran,nilai_kelancaran,kesalahan_mad,kesalahan_dengung,kesalahan_makhraj,nilai_tajwid,nilai_adab',
        )
        .in('header_id', bagian)
        .range(from, from + 999)
      if (error) {
        console.error('Gagal membaca kelengkapan nilai tahfidz:', error.message)
        break
      }
      const rows = data || []
      for (const row of rows) {
        const kunci = idKeKunci.get(String(row.header_id || ''))
        const nama = kunciNamaSurah(String(row.nama_surat || ''))
        if (!kunci || !nama || !detailSudahDinilai(row as Record<string, unknown>)) continue
        const ada = peta.get(kunci) || new Set<string>()
        ada.add(nama)
        peta.set(kunci, ada)
      }
      if (rows.length < 1000) break
      from += 1000
    }
  }
  return peta
}
