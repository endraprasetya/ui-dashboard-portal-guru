import { bulanRomawi } from '@/lib/hari-kerja'
import { kanonNamaUnit, unitSama } from '@/lib/siswa'
import { supabase } from '@/lib/supabase'

export const STATUS_PENGAJUAN_KERINGANAN = ['Pending', 'Disetujui', 'Ditolak'] as const
export type StatusPengajuanKeringanan = (typeof STATUS_PENGAJUAN_KERINGANAN)[number]

export type PengajuanKeringanan = {
  id: string
  nis: string
  namaSiswa: string
  kelas: string
  unit: string
  nominalTunggakan: number
  nomorSurat: string
  kesanggupanBayar: string
  tanggalRencanaLunas: string
  statusPersetujuan: StatusPengajuanKeringanan
  nomorSuratRekomendasi: string
  alasanPengajuan: string
  catatanKeputusan: string
  dibuatPada: string
  diperbaruiPada: string
  diputuskanPada: string
  suratResmiIsi: string
  suratResmiDikirimPada: string
}

export type InputPengajuanKeringanan = {
  nis: string
  namaSiswa: string
  kelas?: string
  unit?: string
  nominalTunggakan: number
  nomorSurat: string
  kesanggupanBayar: string
  tanggalRencanaLunas: string
}

const TABEL = 'tabel_pengajuan_keringanan'
const KOLOM =
  'id,dibuat_pada,unit,nis,nama_siswa,kelas,nominal_tunggakan,kesanggupan_bayar,tanggal_rencana_lunas,alasan_pengajuan,status_persetujuan,catatan_kepsek,catatan_keputusan,tanggal_persetujuan,surat_resmi_isi,surat_resmi_dikirim_pada'

function lempar(error: { message?: string } | null, cadangan: string): never {
  throw new Error(error?.message || cadangan)
}

function kolomHilang(pesan: string) {
  return /column|schema cache|could not find/i.test(pesan)
}

function angkaNis(nilai: string) {
  return String(nilai || '').replace(/\D/g, '')
}

function statusSah(nilai: unknown): nilai is StatusPengajuanKeringanan {
  return (STATUS_PENGAJUAN_KERINGANAN as readonly string[]).includes(String(nilai || ''))
}

function petakan(row: Record<string, unknown>): PengajuanKeringanan | null {
  if (!statusSah(row.status_persetujuan)) return null
  const nis = String(row.nis || '').trim()
  if (!nis) return null
  return {
    id: String(row.id || ''),
    nis,
    namaSiswa: String(row.nama_siswa || ''),
    kelas: String(row.kelas || ''),
    unit: String(row.unit || ''),
    nominalTunggakan: Number(row.nominal_tunggakan) || 0,
    nomorSurat: String(row.nomor_surat || ''),
    kesanggupanBayar: String(row.kesanggupan_bayar || ''),
    alasanPengajuan: String(row.alasan_pengajuan || ''),
    tanggalRencanaLunas: String(row.tanggal_rencana_lunas || ''),
    statusPersetujuan: row.status_persetujuan,
    nomorSuratRekomendasi: String(row.nomor_surat_rekomendasi || ''),
    catatanKeputusan: String(row.catatan_kepsek || row.catatan_keputusan || ''),
    dibuatPada: String(row.dibuat_pada || ''),
    diperbaruiPada: String(row.diperbarui_pada || ''),
    diputuskanPada: String(row.tanggal_persetujuan || row.diputuskan_pada || ''),
    suratResmiIsi: String(row.surat_resmi_isi || ''),
    suratResmiDikirimPada: String(row.surat_resmi_dikirim_pada || ''),
  }
}

async function ambilBaris(
  bangun: (kolom: string) => PromiseLike<{ data: unknown; error: { message?: string } | null }>,
  cadangan: string,
) {
  const utama = await bangun(KOLOM)
  if (!utama.error) return utama.data
  const lengkap = await bangun('*')
  if (!lengkap.error) return lengkap.data
  lempar(utama.error.message ? utama.error : lengkap.error, cadangan)
}

export const KLAUSUL_SURAT_RESMI_WALI =
  'Saya menyatakan bahwa surat pernyataan ini dibuat dengan penuh kesadaran, dalam keadaan sehat jasmani dan rohani, serta tanpa paksaan dari pihak mana pun.'

export function adaSuratResmiWali(item: PengajuanKeringanan) {
  return Boolean(item.suratResmiDikirimPada || item.suratResmiIsi.trim() || item.kesanggupanBayar.trim())
}

export function isiSuratResmiUtama(item: PengajuanKeringanan) {
  if (item.suratResmiIsi.trim()) return item.suratResmiIsi.trim()
  const bagian = [item.kesanggupanBayar]
  if (item.alasanPengajuan.trim()) bagian.push(`Alasan pengajuan: ${item.alasanPengajuan.trim()}`)
  return bagian.filter(Boolean).join('\n\n')
}

export function tanggalSuratResmiWali(item: PengajuanKeringanan) {
  return item.suratResmiDikirimPada || item.dibuatPada
}

export function rupiahKeringanan(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai)
}

export function formatWaktuKeringanan(iso?: string) {
  if (!iso) return ''
  const saat = new Date(iso)
  if (Number.isNaN(saat.getTime())) return ''
  const teks = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(saat)
  return `${teks} WIB`
}

function bagianJakarta(saat: Date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(saat)
  const ambil = (jenis: string) => parts.find((item) => item.type === jenis)?.value || '00'
  const jam = ambil('hour') === '24' ? '00' : ambil('hour')
  return { tahun: ambil('year'), bulan: ambil('month'), hari: ambil('day'), jam, menit: ambil('minute') }
}

export function nilaiInputWaktuJakarta(iso?: string) {
  const saat = iso ? new Date(iso) : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  const dasar = Number.isNaN(saat.getTime()) ? new Date() : saat
  const bagian = bagianJakarta(dasar)
  return `${bagian.tahun}-${bagian.bulan}-${bagian.hari}T${bagian.jam}:${bagian.menit}`
}

export function isoDariInputJakarta(nilai: string) {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(nilai || '').trim())
  if (!cocok) return ''
  const iso = `${cocok[1]}-${cocok[2]}-${cocok[3]}T${cocok[4]}:${cocok[5]}:00+07:00`
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? new Date(ms).toISOString() : ''
}

export function susunNomorSuratRekomendasi(urut: number, tanggal: Date) {
  const angka = String(Math.max(1, urut))
  return `421.2/${angka}/SRK/SDIP-AM/${bulanRomawi(tanggal)}/${tanggal.getFullYear()}`
}

function nisSama(kiri: string, kanan: string) {
  const a = angkaNis(kiri)
  const b = angkaNis(kanan)
  return Boolean(a && b && a === b)
}

export function pengajuanTerbaru(daftar: PengajuanKeringanan[], nis: string) {
  return daftar
    .filter((item) => nisSama(item.nis, nis))
    .sort((a, b) => b.dibuatPada.localeCompare(a.dibuatPada))[0]
}

export async function muatPengajuanUntukNis(nis: string[]) {
  const unik = [...new Set(nis.flatMap((nilai) => [String(nilai || '').trim(), angkaNis(nilai)]).filter(Boolean))]
  if (unik.length === 0) return [] as PengajuanKeringanan[]
  const data = await ambilBaris(
    (kolom) => supabase.from(TABEL).select(kolom).in('nis', unik).order('dibuat_pada', { ascending: false }).limit(200),
    'Pengajuan keringanan belum dapat dimuat.',
  )
  const baris = Array.isArray(data) ? data : []
  return baris.map((row) => petakan(row as Record<string, unknown>)).filter((row): row is PengajuanKeringanan => Boolean(row))
}

export async function muatPengajuanUnit(unit: string) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return [] as PengajuanKeringanan[]
  const data = await ambilBaris(
    (kolom) =>
      supabase.from(TABEL).select(kolom).ilike('unit', `%${kunci}%`).order('dibuat_pada', { ascending: false }).limit(300),
    'Daftar pengajuan keringanan belum dapat dimuat.',
  )
  const baris = Array.isArray(data) ? data : []
  return baris.flatMap((row) => {
    const item = petakan(row as Record<string, unknown>)
    return item && unitSama(item.unit, kunci) ? [item] : []
  })
}

export async function ajukanKeringanan(input: InputPengajuanKeringanan) {
  const nis = String(input.nis || '').trim()
  const namaSiswa = String(input.namaSiswa || '').trim()
  const unit = kanonNamaUnit(input.unit)
  const nomorSurat = String(input.nomorSurat || '').trim()
  const kesanggupanBayar = String(input.kesanggupanBayar || '').trim()
  const tanggalRencanaLunas = isoDariInputJakarta(input.tanggalRencanaLunas) || String(input.tanggalRencanaLunas || '')
  const rencana = new Date(tanggalRencanaLunas)
  if (!nis || !namaSiswa) throw new Error('Data siswa belum lengkap.')
  if (!unit) throw new Error('Unit ananda belum terbaca. Pengajuan tidak dapat dikirim.')
  if (!(input.nominalTunggakan > 0)) throw new Error('Pengajuan hanya untuk ananda yang masih memiliki tunggakan.')
  if (nomorSurat.length < 1) throw new Error('Rencana atau nomor surat wajib diisi.')
  if (kesanggupanBayar.length < 10) throw new Error('Pernyataan kesanggupan melunasi masih terlalu singkat.')
  if (Number.isNaN(rencana.getTime()) || rencana.getTime() < Date.now() - 60_000) {
    throw new Error('Target pelunasan harus berupa tanggal dan waktu setelah saat ini.')
  }

  const sudah = await muatPengajuanUntukNis([nis])
  const aktif = sudah.find((item) => item.statusPersetujuan === 'Pending' || item.statusPersetujuan === 'Disetujui')
  if (aktif?.statusPersetujuan === 'Pending') throw new Error('Pengajuan sebelumnya masih menunggu persetujuan Kepala Sekolah.')
  if (aktif?.statusPersetujuan === 'Disetujui') throw new Error('Pengajuan ananda ini sudah disetujui.')

  const sekarang = new Date().toISOString()
  const { data, error } = await supabase
    .from(TABEL)
    .insert({
      nis,
      nama_siswa: namaSiswa,
      kelas: String(input.kelas || '').trim(),
      unit,
      nominal_tunggakan: input.nominalTunggakan,
      nomor_surat: nomorSurat.slice(0, 80),
      kesanggupan_bayar: kesanggupanBayar.slice(0, 1000),
      tanggal_rencana_lunas: rencana.toISOString(),
      status_persetujuan: 'Pending',
      dibuat_pada: sekarang,
      diperbarui_pada: sekarang,
    })
    .select('*')
    .single()
  if (error) lempar(error, 'Pengajuan keringanan belum dapat dikirim.')
  const hasil = petakan(data as Record<string, unknown>)
  if (!hasil) throw new Error('Pengajuan tersimpan, tetapi balasan database belum dapat dibaca.')
  return hasil
}

async function nomorRekomendasiBerikutnya(sekarang: Date) {
  const { data, error } = await supabase.from(TABEL).select('*').eq('status_persetujuan', 'Disetujui').order('dibuat_pada', { ascending: false }).limit(1000)
  if (error) lempar(error, 'Nomor surat rekomendasi belum dapat disusun.')
  const bagian = bagianJakarta(sekarang)
  const awalan = `${bagian.tahun}-${bagian.bulan}`
  const jumlah = (data || []).filter((row) => {
    const cap = (row as { tanggal_persetujuan?: unknown; diputuskan_pada?: unknown; dibuat_pada?: unknown })
    return bagianJakartaAman(cap.tanggal_persetujuan || cap.diputuskan_pada || cap.dibuat_pada) === awalan
  }).length
  return susunNomorSuratRekomendasi(jumlah + 1, sekarang)
}

function bagianJakartaAman(iso: unknown) {
  const saat = new Date(String(iso || ''))
  if (Number.isNaN(saat.getTime())) return ''
  const bagian = bagianJakarta(saat)
  return `${bagian.tahun}-${bagian.bulan}`
}

export async function putuskanPengajuan(id: string, status: 'Disetujui' | 'Ditolak', catatan = '') {
  if (!id) throw new Error('Pengajuan belum dipilih.')
  if (status !== 'Disetujui' && status !== 'Ditolak') throw new Error('Status keputusan tidak valid.')
  const ada = await ambilBaris(
    (kolom) => supabase.from(TABEL).select(kolom).eq('id', id).maybeSingle(),
    'Pengajuan belum dapat diputuskan.',
  )
  const mentah = (ada || {}) as Record<string, unknown>
  const sekarangBaris = petakan(mentah)
  if (!sekarangBaris) throw new Error('Pengajuan tidak ditemukan.')
  if (sekarangBaris.statusPersetujuan !== 'Pending') throw new Error('Pengajuan ini sudah diputuskan.')

  const saat = new Date()
  const cap = saat.toISOString()
  const catatanSimpan = catatan.trim().slice(0, 500) || null
  const dasar: Record<string, unknown> = { status_persetujuan: status }
  if ('catatan_kepsek' in mentah || !('catatan_keputusan' in mentah)) dasar.catatan_kepsek = catatanSimpan
  if ('catatan_keputusan' in mentah || !('catatan_kepsek' in mentah)) dasar.catatan_keputusan = catatanSimpan
  if ('tanggal_persetujuan' in mentah || !('diputuskan_pada' in mentah)) dasar.tanggal_persetujuan = cap
  if ('diputuskan_pada' in mentah || !('tanggal_persetujuan' in mentah)) dasar.diputuskan_pada = cap
  if ('diperbarui_pada' in mentah) dasar.diperbarui_pada = cap
  if (status === 'Disetujui') dasar.nomor_surat_rekomendasi = await nomorRekomendasiBerikutnya(saat)

  const percobaan = [
    dasar,
    { status_persetujuan: status, catatan_kepsek: catatanSimpan, tanggal_persetujuan: cap },
    { status_persetujuan: status, catatan_keputusan: catatanSimpan, diputuskan_pada: cap },
    { status_persetujuan: status },
  ]
  let pesan = ''
  for (const patch of percobaan) {
    const { data, error } = await supabase
      .from(TABEL)
      .update(patch)
      .eq('id', id)
      .eq('status_persetujuan', 'Pending')
      .select('*')
      .maybeSingle()
    if (!error && data) {
      const hasil = petakan(data as Record<string, unknown>)
      if (!hasil || hasil.statusPersetujuan !== status) {
        throw new Error('Keputusan tersimpan, tetapi balasan database belum dapat dibaca.')
      }
      return hasil
    }
    if (!error) throw new Error('Pengajuan ini sudah diputuskan.')
    pesan = error.message || pesan
    if (error && !kolomHilang(pesan)) break
  }
  throw new Error(pesan || 'Keputusan pengajuan belum dapat disimpan.')
}
