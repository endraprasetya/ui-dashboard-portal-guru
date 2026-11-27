import {
  guruMenerimaPengaduan,
  kunciDariPenerimaSkema,
  opsiPenerusanDariKunci,
  skemaPenerimaDariOpsi,
  teksTujuanPenerusan,
} from '@/lib/peta-wali-kelas-pengaduan'
import { kanonNamaUnit, unitSama } from '@/lib/siswa'
import { supabase } from '@/lib/supabase'

export const KATEGORI_PENGADUAN_WALI = [
  'Pembelajaran dan perkembangan anak',
  'Pelayanan ustadz/ustadzah',
  'Tahfidz dan Al-Qur\'an',
  'Sarana dan prasarana',
  'Administrasi dan keuangan',
  'Kebersihan dan keamanan',
  'Lain-lain',
] as const

export type StatusAlurPengaduan = 'masuk' | 'ditangani_ks' | 'diteruskan' | 'selesai'
export type KlasifikasiPengaduan = 'ditangani_ks' | 'diteruskan'
export type TipeLampiranPengaduan = 'image' | 'video' | 'document'

export type PengaduanWaliMurid = {
  id: string
  createdAt: string
  updatedAt: string
  idSiswa: string
  nis: string
  unit: string
  namaWaliMurid: string
  noWa: string
  namaAnak: string
  kelasAnak: string
  kategori: string
  isiPengaduan: string
  lampiranUrl: string
  lampiranTipe: TipeLampiranPengaduan | ''
  statusAlur: StatusAlurPengaduan
  klasifikasiPenanganan: KlasifikasiPengaduan | ''
  tujuanPenerusan: string
  penerimaNama: string
  penerimaJenis: string
  penerimaKelas: string
  /** Turunan untuk UI / cocokkan guru (bukan kolom wajib di DB). */
  penerimaKunci: string
  catatanKs: string
  responPenerima: string
  diresponPada: string
  tindakLanjutJawaban: string
  ditindaklanjutiPada: string
}

export const PESAN_KOLOM_PENGADUAN_BELUM_ADA =
  'Kolom penerima/respon pengaduan belum ada di Supabase. Jalankan skrip `supabase/pengaduan-wali-murid.sql` (bagian ALTER TABLE), lalu muat ulang halaman.'

const TABEL = 'pengaduan_wali_murid'

const KOLOM_DASAR =
  'id,created_at,updated_at,id_siswa,nis,unit,nama_wali_murid,no_wa,nama_anak,kelas_anak,kategori,isi_pengaduan,lampiran_url,lampiran_tipe,status_alur,klasifikasi_penanganan,tujuan_penerusan,catatan_ks,tindak_lanjut_jawaban,ditindaklanjuti_pada'

const KOLOM_LENGKAP =
  `${KOLOM_DASAR},penerima_nama,penerima_jenis,penerima_kelas,respon_penerima,direspon_pada`

const KOLOM_TANPA_DIRESPON =
  `${KOLOM_DASAR},penerima_nama,penerima_jenis,penerima_kelas,respon_penerima`

function teks(nilai: unknown) {
  return String(nilai ?? '').trim()
}

/** Gabungkan semua varian nama kolom catatan Kepala Sekolah yang mungkin ada di DB. */
export function ambilCatatanKsDariBaris(row: Record<string, unknown>) {
  const kandidat = [
    row.catatan_ks,
    row.catatan_kepsek,
    row.catatan_kepala_sekolah,
    row.pesan_kepsek,
    row.pesan_ks,
    row.catatan_internal_ks,
  ]
  for (const nilai of kandidat) {
    const hasil = teks(nilai)
    if (hasil) return hasil
  }
  return ''
}

function galatKolomTidakAda(pesan: string) {
  return /column.*does not exist|could not find the .*column|schema cache/i.test(pesan)
}

function petakan(row: Record<string, unknown>): PengaduanWaliMurid | null {
  const id = teks(row.id)
  if (!id) return null
  const status = teks(row.status_alur) as StatusAlurPengaduan
  if (!['masuk', 'ditangani_ks', 'diteruskan', 'selesai'].includes(status)) return null
  const lampiranTipe = teks(row.lampiran_tipe) as TipeLampiranPengaduan | ''
  const klasifikasi = teks(row.klasifikasi_penanganan) as KlasifikasiPengaduan | ''
  const penerimaJenis = teks(row.penerima_jenis)
  const penerimaKelas = teks(row.penerima_kelas)
  const kunciLegasi = teks(row.penerima_kunci)
  const penerimaKunci = kunciLegasi || kunciDariPenerimaSkema(penerimaJenis, penerimaKelas)
  const diresponPada =
    teks(row.direspon_pada) || teks(row.respon_penerima_pada)

  return {
    id,
    createdAt: teks(row.created_at),
    updatedAt: teks(row.updated_at),
    idSiswa: teks(row.id_siswa),
    nis: teks(row.nis),
    unit: teks(row.unit),
    namaWaliMurid: teks(row.nama_wali_murid),
    noWa: teks(row.no_wa),
    namaAnak: teks(row.nama_anak),
    kelasAnak: teks(row.kelas_anak),
    kategori: teks(row.kategori),
    isiPengaduan: teks(row.isi_pengaduan),
    lampiranUrl: teks(row.lampiran_url),
    lampiranTipe: lampiranTipe === 'image' || lampiranTipe === 'video' || lampiranTipe === 'document' ? lampiranTipe : '',
    statusAlur: status,
    klasifikasiPenanganan: klasifikasi === 'ditangani_ks' || klasifikasi === 'diteruskan' ? klasifikasi : '',
    tujuanPenerusan: teks(row.tujuan_penerusan),
    penerimaNama: teks(row.penerima_nama),
    penerimaJenis,
    penerimaKelas,
    penerimaKunci,
    catatanKs: ambilCatatanKsDariBaris(row),
    responPenerima: teks(row.respon_penerima),
    diresponPada,
    tindakLanjutJawaban: teks(row.tindak_lanjut_jawaban),
    ditindaklanjutiPada: teks(row.ditindaklanjuti_pada),
  }
}

export function labelStatusAlurPengaduan(status: StatusAlurPengaduan) {
  switch (status) {
    case 'masuk':
      return 'Masuk'
    case 'ditangani_ks':
      return 'Ditangani KS'
    case 'diteruskan':
      return 'Diteruskan'
    case 'selesai':
      return 'Selesai'
  }
}

export function formatWaktuPengaduan(iso: string) {
  if (!iso) return '—'
  const saat = new Date(iso)
  if (Number.isNaN(saat.getTime())) return iso
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(saat)
}

export type HasilMuatPengaduanWali = {
  daftar: PengaduanWaliMurid[]
  peringatanSkema: string
}

async function kueriPengaduanUnit(unit: string, kolom: string) {
  const mentah = String(unit || '').trim()
  const semua = /^semua\s*unit$/i.test(mentah)
  const kunci = kanonNamaUnit(unit)
  let permintaan = supabase.from(TABEL).select(kolom).order('created_at', { ascending: false }).limit(200)
  if (!semua && kunci) {
    permintaan = permintaan.ilike('unit', `%${kunci}%`)
  }
  return permintaan
}

function saringUnit(rows: PengaduanWaliMurid[], unit: string) {
  const mentah = String(unit || '').trim()
  const semua = /^semua\s*unit$/i.test(mentah)
  const kunci = kanonNamaUnit(unit)
  return rows.filter((item) => {
    if (semua || !kunci) return true
    return unitSama(item.unit, kunci) || unitSama(item.unit, mentah)
  })
}

export async function muatPengaduanWaliUnit(unit: string): Promise<HasilMuatPengaduanWali> {
  let peringatanSkema = ''
  let barisMentah: Record<string, unknown>[] | null = null
  let kolomTerpakai = KOLOM_LENGKAP

  for (const kolom of [KOLOM_LENGKAP, KOLOM_TANPA_DIRESPON, KOLOM_DASAR]) {
    const hasil = await kueriPengaduanUnit(unit, kolom)
    if (!hasil.error) {
      barisMentah = (hasil.data || []) as unknown as Record<string, unknown>[]
      kolomTerpakai = kolom
      break
    }
    if (!galatKolomTidakAda(hasil.error.message)) {
      throw new Error(hasil.error.message || 'Daftar pengaduan wali belum dapat dimuat.')
    }
  }

  if (!barisMentah) {
    throw new Error('Daftar pengaduan wali belum dapat dimuat.')
  }
  if (kolomTerpakai !== KOLOM_LENGKAP) {
    peringatanSkema = PESAN_KOLOM_PENGADUAN_BELUM_ADA
  }

  const daftar = (barisMentah || [])
    .map((row) => petakan(row))
    .filter((item): item is PengaduanWaliMurid => Boolean(item))

  return { daftar: saringUnit(daftar, unit), peringatanSkema }
}

function pesanGalatSupabase(error: { message?: string }, konteks: string) {
  const pesan = String(error.message || konteks)
  if (galatKolomTidakAda(pesan)) return PESAN_KOLOM_PENGADUAN_BELUM_ADA
  return pesan || konteks
}

export async function klasifikasiPengaduanWali(input: {
  id: string
  klasifikasi: KlasifikasiPengaduan
  penerimaKunci?: string
  catatanKs?: string
}) {
  if (!input.id) throw new Error('Pengaduan belum dipilih.')
  const statusAlur: StatusAlurPengaduan = input.klasifikasi === 'diteruskan' ? 'diteruskan' : 'ditangani_ks'
  const kunci = input.klasifikasi === 'diteruskan' ? teks(input.penerimaKunci) : ''
  if (input.klasifikasi === 'diteruskan' && !kunci) {
    throw new Error('Pilih wali kelas atau waka tujuan penerusan.')
  }
  const opsi = kunci ? opsiPenerusanDariKunci(kunci) : null
  if (input.klasifikasi === 'diteruskan' && !opsi) {
    throw new Error('Penerima penerusan tidak dikenali.')
  }
  const cap = new Date().toISOString()
  const patch: Record<string, unknown> = {
    klasifikasi_penanganan: input.klasifikasi,
    status_alur: statusAlur,
    catatan_ks: teks(input.catatanKs).slice(0, 2000) || null,
    updated_at: cap,
  }
  if (input.klasifikasi === 'diteruskan' && opsi) {
    Object.assign(patch, skemaPenerimaDariOpsi(opsi))
    patch.tujuan_penerusan = teksTujuanPenerusan(opsi)
  } else {
    patch.tujuan_penerusan = null
    patch.penerima_nama = null
    patch.penerima_jenis = null
    patch.penerima_kelas = null
  }

  let { error } = await supabase.from(TABEL).update(patch).eq('id', input.id)
  if (error && galatKolomTidakAda(error.message) && input.klasifikasi === 'diteruskan' && opsi) {
    const minimal = {
      klasifikasi_penanganan: input.klasifikasi,
      status_alur: statusAlur,
      tujuan_penerusan: teksTujuanPenerusan(opsi),
      catatan_ks: patch.catatan_ks,
      updated_at: cap,
    }
    const ulang = await supabase.from(TABEL).update(minimal).eq('id', input.id)
    error = ulang.error
  }
  if (error) throw new Error(pesanGalatSupabase(error, 'Klasifikasi belum dapat disimpan.'))
}

export async function simpanTindakLanjutPengaduanWali(input: {
  id: string
  tindakLanjutJawaban: string
  catatanKs?: string
}) {
  const jawaban = teks(input.tindakLanjutJawaban)
  if (jawaban.length < 5) throw new Error('Jawaban / tindak lanjut wajib diisi.')
  const cap = new Date().toISOString()
  const patch: Record<string, unknown> = {
    tindak_lanjut_jawaban: jawaban.slice(0, 4000),
    status_alur: 'selesai',
    ditindaklanjuti_pada: cap,
    updated_at: cap,
  }
  const catatan = teks(input.catatanKs).slice(0, 2000)
  if (catatan) patch.catatan_ks = catatan
  const { error } = await supabase.from(TABEL).update(patch).eq('id', input.id)
  if (error) throw new Error(pesanGalatSupabase(error, 'Tindak lanjut belum dapat disimpan.'))
}

export async function muatPengaduanDiteruskanUntukGuru(unit: string, user: unknown) {
  const { daftar } = await muatPengaduanWaliUnit(unit)
  return daftar.filter(
    (item) =>
      item.statusAlur === 'diteruskan' &&
      guruMenerimaPengaduan(user, {
        penerimaKunci: item.penerimaKunci,
        penerimaJenis: item.penerimaJenis,
        penerimaKelas: item.penerimaKelas,
        penerimaNama: item.penerimaNama,
        tujuanPenerusan: item.tujuanPenerusan,
        statusAlur: item.statusAlur,
      }),
  )
}

export async function simpanResponPenerimaPengaduanWali(input: { id: string; responPenerima: string }) {
  const respon = teks(input.responPenerima)
  if (respon.length < 5) throw new Error('Respon / tindak lanjut wajib diisi (min. 5 karakter).')
  const cap = new Date().toISOString()
  const patch = {
    respon_penerima: respon.slice(0, 4000),
    direspon_pada: cap,
    updated_at: cap,
  }
  let { error } = await supabase.from(TABEL).update(patch).eq('id', input.id)
  if (error && galatKolomTidakAda(error.message)) {
    const legasi = await supabase
      .from(TABEL)
      .update({
        respon_penerima: respon.slice(0, 4000),
        respon_penerima_pada: cap,
        updated_at: cap,
      })
      .eq('id', input.id)
    error = legasi.error
  }
  if (error) throw new Error(pesanGalatSupabase(error, 'Respon belum dapat disimpan.'))
}