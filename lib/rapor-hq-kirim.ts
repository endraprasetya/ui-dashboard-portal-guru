import { supabase } from '@/lib/supabase'
import { TABEL_HEADER_RAPOR, periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'
import { teacherDisplayName } from '@/lib/qiroah'

export const NAMA_SETTING_KIRIM_RAPOR = 'hq_kirim'
export const KANAL_REVISI_RAPOR_HQ = 'rapor-hq-revisi'

export type StatusKirimRaporHq = 'Terkirim' | 'Revisi'
export type StatusPemeriksaHq = 'Belum' | 'Diperiksa'
export type JenisRiwayatWaktuHq = 'pengajuan' | 'selesai_diperiksa' | 'kirim_ulang'
export type JenisCatatanPemeriksaHq = 'revisi' | 'konfirmasi' | ''
export type ModeCatatanPemeriksaHq = 'revisi' | 'konfirmasi'

export const PLACEHOLDER_CATATAN_PEMERIKSA_HQ =
  'Tuliskan kekeliruan yang perlu diperbaiki atau konfirmasi rapor HQ siap cetak'

export const TEKS_KONFIRMASI_RAPOR_HQ_SIAP_CETAK = 'Rapor HQ sudah diperiksa dan siap cetak'

export function tentukanCatatanPemeriksaHq(catatan: string): { mode: ModeCatatanPemeriksaHq; teks: string } {
  const teks = catatan.trim()
  if (!teks || kalimatKonfirmasiSiapCetak(teks)) {
    return { mode: 'konfirmasi', teks: teks || TEKS_KONFIRMASI_RAPOR_HQ_SIAP_CETAK }
  }
  return { mode: 'revisi', teks }
}

function kalimatKonfirmasiSiapCetak(teks: string) {
  const normal = teks.toLowerCase().replace(/\s+/g, ' ')
  if (/\b(belum|jangan|tidak\s+siap|belum\s+sesuai)\b/.test(normal)) return false
  const adaKoreksi = /\b(kekeliruan|kesalahan|koreksi|perbaiki|diperbaiki|kurang|salah|keliru|revisi)\b/.test(normal)
  const sangkalKoreksi = /tidak\s+ada\s+(kekeliruan|kesalahan|koreksi|kekurangan)/.test(normal)
  if (adaKoreksi && !sangkalKoreksi) return false
  return /siap\s*cetak|\bsiap\b|sudah\s+sesuai|\bsesuai\b|lolos|boleh\s+dicetak|layak\s+cetak|sudah\s+diperiksa|konfirmasi/.test(
    normal,
  )
}

export type RiwayatWaktuHq = {
  jenis: JenisRiwayatWaktuHq
  pada: string
}

export type KirimRaporHq = {
  idSiswa: string
  namaSiswa: string
  kelas: string
  asesmen: string
  tahunAjaran: string
  semester: string
  idGuru: string
  namaGuru: string
  materi: string
  nilaiAkhir: number | null
  predikat: string
  status: StatusKirimRaporHq
  catatanRevisi: string
  jenisCatatan: JenisCatatanPemeriksaHq
  dikirimPada: string
  diajukanPada: string
  riwayatWaktu: RiwayatWaktuHq[]
  diperbaruiPada: string
  statusPemeriksa: StatusPemeriksaHq
  pemeriksaId: string
  pemeriksaNama: string
  diperiksaPada: string
  catatanOleh: string
  catatanOlehId: string
  catatanPada: string
}

export type UsulanKirimRaporHq = {
  idSiswa: string
  namaSiswa: string
  kelas: string
  asesmen: string
  materi?: string
  idGuru: string
  namaGuru: string
}

export function kunciKirimRaporHq(baris: Pick<KirimRaporHq, 'idSiswa' | 'asesmen' | 'tahunAjaran' | 'semester'>) {
  return [baris.idSiswa, baris.asesmen, baris.tahunAjaran, baris.semester].join('|')
}

export function idGuruAktif(user?: { target_id?: string; username?: string } | null) {
  return String(user?.target_id || user?.username || '').trim()
}

export function guruPenerimaRevisi(baris: Pick<KirimRaporHq, 'idGuru' | 'namaGuru'>, user?: any) {
  const idBaris = baris.idGuru.trim().toLowerCase()
  const identitas = [user?.target_id, user?.id_user, user?.username, user?.nip, user?.NIP]
    .map((nilai) => String(nilai || '').trim().toLowerCase())
    .filter((nilai) => nilai.length >= 2)
  if (idBaris && identitas.includes(idBaris)) return true
  const namaBaris = intiNamaOrang(baris.namaGuru)
  const namaUser = intiNamaOrang(teacherDisplayName(user))
  if (!namaBaris || !namaUser || namaUser === 'guru' || namaUser.length < 3) return false
  return namaBaris === namaUser
}

function intiNamaOrang(nilai?: string | null) {
  return String(nilai || '')
    .toLowerCase()
    .replace(/,/g, ' ')
    .replace(/\bs\.?\s*pd\.?\s*i?\b/g, ' ')
    .replace(/\ba\.?\s*ma\.?\b/g, ' ')
    .replace(/[^a-z\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function angkaAtauNull(nilai: unknown) {
  if (nilai == null || nilai === '') return null
  const n = Number(nilai)
  return Number.isFinite(n) ? n : null
}

const JENIS_RIWAYAT_WAKTU = new Set<JenisRiwayatWaktuHq>(['pengajuan', 'selesai_diperiksa', 'kirim_ulang'])
const URUTAN_RIWAYAT_WAKTU: Record<JenisRiwayatWaktuHq, number> = {
  pengajuan: 0,
  selesai_diperiksa: 1,
  kirim_ulang: 2,
}
const LABEL_RIWAYAT_WAKTU: Record<JenisRiwayatWaktuHq, string> = {
  pengajuan: 'Pengajuan',
  selesai_diperiksa: 'Selesai diperiksa',
  kirim_ulang: 'Kirim ulang',
}

function urutRiwayatWaktu(riwayat: RiwayatWaktuHq[]) {
  return [...riwayat].sort(
    (a, b) => a.pada.localeCompare(b.pada) || URUTAN_RIWAYAT_WAKTU[a.jenis] - URUTAN_RIWAYAT_WAKTU[b.jenis],
  )
}

function sudahAdaRiwayat(riwayat: RiwayatWaktuHq[], jenis: JenisRiwayatWaktuHq, pada: string) {
  return riwayat.some((item) => item.jenis === jenis && item.pada === pada)
}

function bacaRiwayatWaktu(nilai: unknown): RiwayatWaktuHq[] {
  if (!Array.isArray(nilai)) return []
  const hasil: RiwayatWaktuHq[] = []
  for (const item of nilai) {
    if (!item || typeof item !== 'object') continue
    const jenis = String((item as { jenis?: unknown }).jenis || '') as JenisRiwayatWaktuHq
    const pada = String((item as { pada?: unknown }).pada || '')
    if (!JENIS_RIWAYAT_WAKTU.has(jenis) || !pada) continue
    if (sudahAdaRiwayat(hasil, jenis, pada)) continue
    hasil.push({ jenis, pada })
  }
  return hasil
}

export function formatWaktuPemeriksaanHq(iso: string) {
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return ''
  return tanggal.toLocaleString('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}

/** Riwayat waktu yang tampil: pengajuan pertama, selesai diperiksa, dan tiap kirim ulang. */
export function gabungRiwayatWaktuHq(
  baris: Pick<KirimRaporHq, 'diajukanPada' | 'dikirimPada' | 'diperiksaPada' | 'riwayatWaktu'>,
) {
  const hasil = [...(baris.riwayatWaktu || [])]
  const awal = baris.diajukanPada || baris.dikirimPada
  if (awal && !hasil.some((item) => item.jenis === 'pengajuan')) {
    hasil.unshift({ jenis: 'pengajuan', pada: awal })
  }
  if (baris.diperiksaPada && !sudahAdaRiwayat(hasil, 'selesai_diperiksa', baris.diperiksaPada)) {
    hasil.push({ jenis: 'selesai_diperiksa', pada: baris.diperiksaPada })
  }
  if (
    baris.diajukanPada &&
    baris.dikirimPada &&
    baris.dikirimPada !== baris.diajukanPada &&
    !sudahAdaRiwayat(hasil, 'kirim_ulang', baris.dikirimPada)
  ) {
    hasil.push({ jenis: 'kirim_ulang', pada: baris.dikirimPada })
  }
  return urutRiwayatWaktu(hasil)
}

export function daftarTampilanRiwayatHq(
  baris: Pick<KirimRaporHq, 'diajukanPada' | 'dikirimPada' | 'diperiksaPada' | 'riwayatWaktu'>,
) {
  return gabungRiwayatWaktuHq(baris)
    .map((item) => ({ ...item, label: LABEL_RIWAYAT_WAKTU[item.jenis], waktu: formatWaktuPemeriksaanHq(item.pada) }))
    .filter((item) => item.waktu)
}

export function teksRiwayatRingkasCatatanHq(
  baris: Pick<KirimRaporHq, 'jenisCatatan' | 'catatanRevisi' | 'catatanPada'>,
) {
  if (!baris.catatanRevisi || (baris.jenisCatatan !== 'revisi' && baris.jenisCatatan !== 'konfirmasi')) return ''
  const waktu = formatWaktuPemeriksaanHq(baris.catatanPada)
  const judul = baris.jenisCatatan === 'konfirmasi' ? 'Siap cetak' : 'Revisi'
  return `${judul}${waktu ? ` · ${waktu}` : ''} · ${baris.catatanRevisi}`
}

function riwayatSetelahKirim(sebelumnya: KirimRaporHq | undefined, sekarang: string) {
  if (!sebelumnya) return [{ jenis: 'pengajuan' as const, pada: sekarang }]
  const diajukanPada = sebelumnya.diajukanPada || sebelumnya.dikirimPada || sekarang
  const riwayat = gabungRiwayatWaktuHq({
    diajukanPada,
    dikirimPada: diajukanPada,
    diperiksaPada: sebelumnya.diperiksaPada,
    riwayatWaktu: sebelumnya.riwayatWaktu,
  })
  if (!sudahAdaRiwayat(riwayat, 'kirim_ulang', sekarang)) riwayat.push({ jenis: 'kirim_ulang', pada: sekarang })
  return urutRiwayatWaktu(riwayat)
}

function riwayatSetelahDiperiksa(lama: KirimRaporHq, sekarang: string) {
  const riwayat = gabungRiwayatWaktuHq({
    ...lama,
    diajukanPada: lama.diajukanPada || lama.dikirimPada,
  })
  if (!sudahAdaRiwayat(riwayat, 'selesai_diperiksa', sekarang)) {
    riwayat.push({ jenis: 'selesai_diperiksa', pada: sekarang })
  }
  return urutRiwayatWaktu(riwayat)
}

function bacaJenisCatatan(nilai: unknown, status: StatusKirimRaporHq, catatan: string): JenisCatatanPemeriksaHq {
  if (nilai === 'konfirmasi' || nilai === 'revisi') return nilai
  if (status === 'Revisi' && catatan) return 'revisi'
  return ''
}

function bacaKirim(nilai: unknown): KirimRaporHq | null {
  try {
    const data = typeof nilai === 'string' ? JSON.parse(nilai) : nilai
    if (!data || typeof data !== 'object') return null
    const idSiswa = String(data.idSiswa || '').trim()
    const asesmen = String(data.asesmen || '').trim()
    if (!idSiswa || !asesmen) return null
    const status = data.status === 'Revisi' ? 'Revisi' : 'Terkirim'
    const statusPemeriksa = data.statusPemeriksa === 'Diperiksa' || data.diperiksaPada ? 'Diperiksa' : 'Belum'
    const catatanRevisi = String(data.catatanRevisi || '').trim()
    const dikirimPada = String(data.dikirimPada || '')
    return {
      idSiswa,
      namaSiswa: String(data.namaSiswa || idSiswa),
      kelas: String(data.kelas || ''),
      asesmen,
      tahunAjaran: String(data.tahunAjaran || ''),
      semester: String(data.semester || ''),
      idGuru: String(data.idGuru || ''),
      namaGuru: String(data.namaGuru || ''),
      materi: String(data.materi || ''),
      nilaiAkhir: angkaAtauNull(data.nilaiAkhir),
      predikat: String(data.predikat || ''),
      status,
      catatanRevisi,
      jenisCatatan: bacaJenisCatatan(data.jenisCatatan, status, catatanRevisi),
      dikirimPada,
      diajukanPada: String(data.diajukanPada || dikirimPada),
      riwayatWaktu: bacaRiwayatWaktu(data.riwayatWaktu),
      diperbaruiPada: String(data.diperbaruiPada || ''),
      statusPemeriksa,
      pemeriksaId: String(data.pemeriksaId || ''),
      pemeriksaNama: String(data.pemeriksaNama || ''),
      diperiksaPada: String(data.diperiksaPada || ''),
      catatanOleh: String(data.catatanOleh || ''),
      catatanOlehId: String(data.catatanOlehId || ''),
      catatanPada: String(data.catatanPada || ''),
    }
  } catch {
    return null
  }
}

async function muatPetaNilai(daftar: Pick<KirimRaporHq, 'idSiswa' | 'asesmen' | 'tahunAjaran' | 'semester'>[]) {
  const peta = new Map<string, { nilaiAkhir: number | null; predikat: string }>()
  const ids = Array.from(new Set(daftar.map((item) => item.idSiswa).filter(Boolean)))
  const ukuran = 80
  for (let i = 0; i < ids.length; i += ukuran) {
    const bagian = ids.slice(i, i + ukuran)
    const { data, error } = await supabase
      .from(TABEL_HEADER_RAPOR)
      .select('id_siswa,jenis_asesmen,tahun_ajaran,semester,nilai_akhir,predikat')
      .in('id_siswa', bagian)
    if (error) return peta
    for (const row of data || []) {
      peta.set([row.id_siswa, row.jenis_asesmen, row.tahun_ajaran, row.semester].join('|'), {
        nilaiAkhir: angkaAtauNull(row.nilai_akhir),
        predikat: String(row.predikat || ''),
      })
    }
  }
  return peta
}

async function muatPetaMateri(idSiswa: string[]) {
  const peta = new Map<string, string>()
  const ids = Array.from(new Set(idSiswa.filter(Boolean)))
  const ukuran = 80
  for (let i = 0; i < ids.length; i += ukuran) {
    const bagian = ids.slice(i, i + ukuran)
    const { data, error } = await supabase
      .from('materi_ujian_tahfidz')
      .select('id_siswa,asesmen,surah,ayat')
      .in('id_siswa', bagian)
    if (error) return peta
    for (const row of data || []) {
      const kunci = `${row.id_siswa}|${row.asesmen}`
      const label = row.ayat ? `${row.surah} (Ayat ${row.ayat})` : String(row.surah || '')
      if (!label) continue
      const lama = peta.get(kunci)
      peta.set(kunci, lama ? `${lama}; ${label}` : label)
    }
  }
  return peta
}

export async function lengkapiTampilanKirim(daftar: KirimRaporHq[]) {
  if (daftar.length === 0) return []
  const [materi, nilai] = await Promise.all([muatPetaMateri(daftar.map((row) => row.idSiswa)), muatPetaNilai(daftar)])
  return daftar.map((row) => {
    const hidup = nilai.get([row.idSiswa, row.asesmen, row.tahunAjaran, row.semester].join('|'))
    return {
      ...row,
      materi: materi.get(`${row.idSiswa}|${row.asesmen}`) || row.materi,
      nilaiAkhir: hidup ? hidup.nilaiAkhir : row.nilaiAkhir,
      predikat: hidup ? hidup.predikat : row.predikat,
    }
  })
}

function bacaDaftarKirim(nilai: unknown) {
  try {
    const data = typeof nilai === 'string' ? JSON.parse(nilai) : nilai
    const sumber = Array.isArray(data) ? data : [data]
    const peta = new Map<string, KirimRaporHq>()
    for (const item of sumber) {
      const baris = bacaKirim(item)
      if (!baris) continue
      const kunci = kunciKirimRaporHq(baris)
      const lama = peta.get(kunci)
      if (!lama || baris.diperbaruiPada >= lama.diperbaruiPada) peta.set(kunci, baris)
    }
    return [...peta.values()]
  } catch {
    return [] as KirimRaporHq[]
  }
}

async function muatDokumenKirim() {
  const { data, error } = await supabase
    .from('setting')
    .select('nilai')
    .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
    .limit(20)
  if (error) return { error: error.message, daftar: [] as KirimRaporHq[], ada: false }
  const daftar = (data || []).flatMap((row) => bacaDaftarKirim(row.nilai))
  const peta = new Map<string, KirimRaporHq>()
  for (const baris of daftar) {
    const kunci = kunciKirimRaporHq(baris)
    const lama = peta.get(kunci)
    if (!lama || baris.diperbaruiPada >= lama.diperbaruiPada) peta.set(kunci, baris)
  }
  return { error: null as string | null, daftar: [...peta.values()], ada: (data || []).length > 0 }
}

async function simpanDokumenKirim(daftar: KirimRaporHq[], niy: string) {
  const nilai = JSON.stringify(daftar)
  const ada = await supabase.from('setting').select('nama_variabel').eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR).limit(1)
  if (ada.error) return ada.error.message
  if ((ada.data || []).length > 0) {
    const { error } = await supabase
      .from('setting')
      .update({ nilai, keterangan: 'daftar', niy })
      .eq('nama_variabel', NAMA_SETTING_KIRIM_RAPOR)
    return error?.message || null
  }
  const { error } = await supabase
    .from('setting')
    .insert({ nama_variabel: NAMA_SETTING_KIRIM_RAPOR, nilai, keterangan: 'daftar', niy })
  return error?.message || null
}

export async function muatKirimRaporHq() {
  const hasil = await muatDokumenKirim()
  return { error: hasil.error, data: hasil.daftar }
}

export async function kirimRaporKeKepsek(daftar: UsulanKirimRaporHq[]) {
  if (daftar.length === 0) return { error: 'Belum ada siswa yang dicentang. Centang siswa yang hasil penilaiannya akan dikirim ke Kepala Sekolah.', jumlah: 0 }
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const sekarang = new Date().toISOString()
  const sasaran = daftar.map((item) => ({
    ...item,
    tahunAjaran,
    semester,
    kunci: kunciKirimRaporHq({ ...item, tahunAjaran, semester }),
  }))
  const nilaiHidup = await muatPetaNilai(sasaran)
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error, jumlah: 0 }
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))

  for (const item of sasaran) {
    const sebelumnya = peta.get(item.kunci)
    const nilai = nilaiHidup.get(item.kunci)
    const isi: KirimRaporHq = {
      idSiswa: item.idSiswa,
      namaSiswa: item.namaSiswa,
      kelas: item.kelas,
      asesmen: item.asesmen,
      tahunAjaran,
      semester,
      idGuru: item.idGuru,
      namaGuru: item.namaGuru,
      materi: item.materi || sebelumnya?.materi || '',
      nilaiAkhir: nilai ? nilai.nilaiAkhir : (sebelumnya?.nilaiAkhir ?? null),
      predikat: nilai ? nilai.predikat : sebelumnya?.predikat || '',
      status: 'Terkirim',
      catatanRevisi: sebelumnya?.catatanRevisi || '',
      jenisCatatan: sebelumnya?.jenisCatatan || '',
      dikirimPada: sekarang,
      diajukanPada: sebelumnya?.diajukanPada || sebelumnya?.dikirimPada || sekarang,
      riwayatWaktu: riwayatSetelahKirim(sebelumnya, sekarang),
      diperbaruiPada: sebelumnya?.diperbaruiPada || sekarang,
      statusPemeriksa: 'Belum',
      pemeriksaId: '',
      pemeriksaNama: '',
      diperiksaPada: '',
      catatanOleh: sebelumnya?.catatanOleh || '',
      catatanOlehId: sebelumnya?.catatanOlehId || '',
      catatanPada: sebelumnya?.catatanPada || '',
    }
    peta.set(item.kunci, isi)
  }

  const galat = await simpanDokumenKirim([...peta.values()], sasaran[0]?.idGuru || '')
  if (galat) return { error: galat, jumlah: 0 }
  return { error: null as string | null, jumlah: sasaran.length }
}

export async function cabutKirimRaporHq(idSiswa: string, asesmen: string) {
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error }
  const kunci = kunciKirimRaporHq({ idSiswa, asesmen, tahunAjaran, semester })
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))
  const lama = peta.get(kunci)
  if (!lama) return { error: null as string | null }
  peta.delete(kunci)
  const galat = await simpanDokumenKirim([...peta.values()], lama.idGuru)
  if (galat) return { error: galat }
  return { error: null as string | null }
}

export async function simpanCatatanRevisiRaporHq(
  baris: KirimRaporHq,
  catatan: string,
  penulis?: { id?: string; nama?: string },
) {
  const { mode, teks } = tentukanCatatanPemeriksaHq(catatan)
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error }
  const kunci = kunciKirimRaporHq(baris)
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))
  const lama = peta.get(kunci)
  if (!lama) return { error: 'Data kiriman tidak ditemukan.' }
  const sekarang = new Date().toISOString()
  const revisi = mode === 'revisi'
  const isi: KirimRaporHq = {
    ...lama,
    materi: baris.materi || lama.materi,
    nilaiAkhir: baris.nilaiAkhir ?? lama.nilaiAkhir,
    predikat: baris.predikat || lama.predikat,
    catatanRevisi: teks,
    jenisCatatan: mode,
    catatanOleh: penulis?.nama?.trim() || lama.catatanOleh || 'Pemeriksa',
    catatanOlehId: penulis?.id?.trim() || lama.catatanOlehId || '',
    catatanPada: sekarang,
    status: revisi ? 'Revisi' : 'Terkirim',
    diperbaruiPada: sekarang,
  }
  peta.set(kunci, isi)
  const galat = await simpanDokumenKirim([...peta.values()], lama.idGuru)
  if (galat) return { error: galat }
  void siarkanRevisiRaporHq(isi.idGuru)
  return { error: null as string | null, data: isi }
}

export async function tandaiDiperiksaHq(
  baris: KirimRaporHq,
  pemeriksa: { id: string; nama: string },
) {
  const dokumen = await muatDokumenKirim()
  if (dokumen.error) return { error: dokumen.error }
  const kunci = kunciKirimRaporHq(baris)
  const peta = new Map(dokumen.daftar.map((row) => [kunciKirimRaporHq(row), row]))
  const lama = peta.get(kunci)
  if (!lama) return { error: 'Data kiriman tidak ditemukan.' }
  const sekarang = new Date().toISOString()
  const isi: KirimRaporHq = {
    ...lama,
    materi: baris.materi || lama.materi,
    nilaiAkhir: baris.nilaiAkhir ?? lama.nilaiAkhir,
    predikat: baris.predikat || lama.predikat,
    diajukanPada: lama.diajukanPada || lama.dikirimPada,
    riwayatWaktu: riwayatSetelahDiperiksa(lama, sekarang),
    statusPemeriksa: 'Diperiksa',
    pemeriksaId: pemeriksa.id,
    pemeriksaNama: pemeriksa.nama,
    diperiksaPada: sekarang,
    diperbaruiPada: sekarang,
  }
  peta.set(kunci, isi)
  const galat = await simpanDokumenKirim([...peta.values()], lama.idGuru)
  if (galat) return { error: galat }
  await siarkanPemeriksaHq(isi)
  return { error: null as string | null, data: isi }
}

export async function siarkanPemeriksaHq(baris: Pick<KirimRaporHq, 'idSiswa' | 'namaSiswa' | 'kelas' | 'asesmen' | 'pemeriksaNama'>) {
  const kanal = supabase.channel(KANAL_REVISI_RAPOR_HQ)
  await new Promise<void>((selesai) => {
    const batas = setTimeout(() => {
      void supabase.removeChannel(kanal)
      selesai()
    }, 2500)
    kanal.subscribe((status) => {
      if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') return
      clearTimeout(batas)
      if (status !== 'SUBSCRIBED') {
        void supabase.removeChannel(kanal)
        selesai()
        return
      }
      void kanal
        .send({
          type: 'broadcast',
          event: 'pemeriksa',
          payload: {
            idSiswa: baris.idSiswa,
            namaSiswa: baris.namaSiswa,
            kelas: baris.kelas,
            asesmen: baris.asesmen,
            pemeriksaNama: baris.pemeriksaNama,
          },
        })
        .finally(() => {
          void supabase.removeChannel(kanal)
          selesai()
        })
    })
  })
}

export async function siarkanRevisiRaporHq(idGuru: string) {
  const kanal = supabase.channel(KANAL_REVISI_RAPOR_HQ)
  await new Promise<void>((selesai) => {
    const batas = setTimeout(() => {
      void supabase.removeChannel(kanal)
      selesai()
    }, 2500)
    kanal.subscribe((status) => {
      if (status !== 'SUBSCRIBED' && status !== 'CHANNEL_ERROR' && status !== 'TIMED_OUT') return
      clearTimeout(batas)
      if (status !== 'SUBSCRIBED') {
        void supabase.removeChannel(kanal)
        selesai()
        return
      }
      void kanal.send({ type: 'broadcast', event: 'revisi', payload: { idGuru } }).finally(() => {
        void supabase.removeChannel(kanal)
        selesai()
      })
    })
  })
}
