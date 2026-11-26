import { MASTER_JADWAL_PIKET, UNIT_MASTER_PIKET } from '@/lib/piket-jadwal-master'
import { supabase } from '@/lib/supabase'
import { kanonNamaUnit, unitSama } from '@/lib/siswa'

export const JENIS_PIKET = ['Piket Guru/Karyawan', 'Piket Gerbang'] as const
export type JenisPiket = (typeof JENIS_PIKET)[number]

export const STATUS_PIKET = ['Hadir', 'Izin'] as const
export type StatusPiket = (typeof STATUS_PIKET)[number]

export const SESI_PIKET = ['Pagi', 'Sore'] as const
export type SesiPiket = (typeof SESI_PIKET)[number]
export type StatusSesiPiket = StatusPiket | 'Belum'

export const NAMA_HARI_PIKET = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const

export const CATATAN_WAKTU_PIKET =
  'Catatan Kehadiran Piket: Hadir atau Izin untuk Piket Pagi dan Piket Sore dapat dicatat kapan saja selama masih pada tanggal yang sama. Jam yang tersimpan adalah waktu aktual saat tombol diklik.'

export type BarisJadwalPiket = {
  id: string
  unit: string
  jenis: JenisPiket
  hari: number
  id_guru: string
  nama_guru: string
  keterangan: string
  tanggal: string
  statusPagi: StatusSesiPiket
  statusSore: StatusSesiPiket
  waktuPagi?: string
  waktuSore?: string
}

export type BarisAbsensiPiket = {
  id: string
  unit: string
  jenis: JenisPiket
  tanggal: string
  id_guru: string
  nama_guru: string
  statusPagi: StatusSesiPiket
  statusSore: StatusSesiPiket
  waktuPagi?: string
  waktuSore?: string
}

export type BarisMonitorPiket = {
  id: string
  jenis: JenisPiket
  id_guru: string
  nama_guru: string
  statusPagi: StatusSesiPiket
  statusSore: StatusSesiPiket
  waktuPagi?: string
  waktuSore?: string
}

export type SesiKehadiranPiket = {
  pagi: StatusSesiPiket
  sore: StatusSesiPiket
  waktuPagi?: string
  waktuSore?: string
}

export type IdentitasGuruPiket = {
  target_id?: string | null
  id_user?: string | null
  username?: string | null
  nip?: string | null
  nama_lengkap?: string | null
  nama?: string | null
  unit?: string | null
}

const TABEL_PIKET = 'tabel_piket_guru'
const PESAN_TABEL = 'Tabel tabel_piket_guru belum dapat dibaca dari portal.'

function norm(nilai: unknown) {
  return String(nilai ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function jenisSah(nilai: unknown): nilai is JenisPiket {
  return (JENIS_PIKET as readonly string[]).includes(String(nilai || ''))
}

function hariDariTanggal(tanggal: string) {
  const [tahun, bulan, hari] = tanggal.split('-').map(Number)
  if (!tahun || !bulan || !hari) return tanggalHariJakarta().hari
  const saat = new Date(Date.UTC(tahun, bulan - 1, hari, 12))
  const nama = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' }).format(saat)
  const peta: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  return peta[nama] ?? tanggalHariJakarta().hari
}

function tanggalPadaHari(hari: number, jangkar = '') {
  const dasar = jangkar || tanggalHariJakarta().tanggal
  const [tahun, bulan, tanggal] = dasar.split('-').map(Number)
  const indeks = hariDariTanggal(dasar)
  const saat = new Date(Date.UTC(tahun, (bulan || 1) - 1, tanggal || 1, 12))
  saat.setUTCDate(saat.getUTCDate() + (hari - indeks))
  const tahunHasil = saat.getUTCFullYear()
  const bulanHasil = String(saat.getUTCMonth() + 1).padStart(2, '0')
  const tanggalHasil = String(saat.getUTCDate()).padStart(2, '0')
  return `${tahunHasil}-${bulanHasil}-${tanggalHasil}`
}

function gagalTabel(pesan: string) {
  return /schema cache|does not exist|could not find the table/i.test(pesan)
}

function indeksHari(nilai: unknown) {
  if (typeof nilai === 'number' && Number.isInteger(nilai) && nilai >= 0 && nilai <= 6) return nilai
  const teks = String(nilai ?? '')
    .trim()
    .toLowerCase()
    .replace(/'/g, '')
  if (/^[0-6]$/.test(teks)) return Number(teks)
  const peta: Record<string, number> = {
    ahad: 0,
    minggu: 0,
    senin: 1,
    selasa: 2,
    rabu: 3,
    kamis: 4,
    jumat: 5,
    sabtu: 6,
  }
  return peta[teks] ?? null
}

function keStatusSesi(nilai: unknown, cadangan: StatusSesiPiket = 'Belum'): StatusSesiPiket {
  const teks = String(nilai ?? '').trim().toLowerCase()
  if (teks === 'hadir') return 'Hadir'
  if (teks === 'izin' || teks === 'sakit') return 'Izin'
  if (teks === 'belum') return 'Belum'
  return cadangan
}

function potongSesiPiket(nilai: string): { status: StatusSesiPiket; waktu?: string } {
  const bersih = nilai.trim()
  const batas = bersih.indexOf('#')
  const statusRaw = batas >= 0 ? bersih.slice(0, batas) : bersih
  const waktu = batas >= 0 ? bersih.slice(batas + 1).trim() : ''
  return { status: keStatusSesi(statusRaw, 'Belum'), waktu: waktu || undefined }
}

function tulisPotongSesi(status: StatusSesiPiket, waktu?: string) {
  if (status === 'Belum') return 'Belum'
  if (waktu && (status === 'Hadir' || status === 'Izin')) return `${status}#${waktu}`
  return status
}

function msDariCapWaktu(nilai?: string) {
  if (!nilai) return Number.NaN
  const ms = /^\d+$/.test(nilai) ? Number(nilai) : Date.parse(nilai)
  return Number.isFinite(ms) ? ms : Number.NaN
}

export function formatCapWaktuPiket(nilai?: string) {
  const jam = formatJamAbsenPiket(nilai)
  return jam ? `${jam} WIB` : ''
}

/** Jam:menit:detik WIB untuk label monitoring (contoh 06:31:16). */
export function formatJamAbsenPiket(nilai?: string) {
  const ms = msDariCapWaktu(nilai)
  if (!Number.isFinite(ms)) return ''
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(ms)
  const ambil = (jenis: string) => parts.find((item) => item.type === jenis)?.value || '00'
  return `${ambil('hour')}:${ambil('minute')}:${ambil('second')}`
}

export function labelStatusSesiPiket(status: StatusSesiPiket, waktu?: string) {
  if (status === 'Belum') return 'Belum absen'
  const cap = formatCapWaktuPiket(waktu)
  return cap ? `${status} · ${cap}` : status
}

/** Format tabel monitoring Kepsek: "Pagi Hadir - 06:31:16". */
export function labelStatusSesiPiketDetail(sesi: SesiPiket, status: StatusSesiPiket, waktu?: string) {
  if (status === 'Belum') return `${sesi} belum absen`
  const jam = formatJamAbsenPiket(waktu)
  return jam ? `${sesi} ${status} - ${jam}` : `${sesi} ${status}`
}

function waktuAbsenDariKolom(iso?: string | null, sumber?: string) {
  const teks = String(iso ?? '').trim()
  if (teks) return teks
  return sumber?.trim() || undefined
}

function kolomWaktuAbsenTidakAda(pesan?: string) {
  return /waktu_absen_pagi|waktu_absen_sore|waktu_absen[^_]|schema cache|could not find/i.test(String(pesan || ''))
}

function statusKehadiranTerlaluPanjang(pesan?: string) {
  return /value too long|character varying/i.test(String(pesan || ''))
}

/** Cocokkan baris jadwal/absensi yang sama (jenis + id atau nama guru). */
export function cocokSlotPiket(
  a: { jenis: JenisPiket | string; id_guru?: string | null; nama_guru?: string | null },
  b: { jenis: JenisPiket | string; id_guru?: string | null; nama_guru?: string | null },
) {
  if (a.jenis !== b.jenis) return false
  if (normId(a.id_guru) && normId(a.id_guru) === normId(b.id_guru)) return true
  return (
    cocokNamaPiket(a.nama_guru, b.nama_guru) ||
    cocokNamaPiket(a.id_guru, b.nama_guru) ||
    cocokNamaPiket(a.nama_guru, b.id_guru)
  )
}

export function bacaSesiKehadiran(nilai: unknown): SesiKehadiranPiket {
  const teks = String(nilai ?? '').trim()
  const pagi = teks.match(/pagi\s*:\s*([^|]+)/i)
  const sore = teks.match(/sore\s*:\s*([^|]+)/i)
  if (pagi || sore) {
    const pagiPotong = potongSesiPiket(pagi?.[1] || 'Belum')
    const sorePotong = potongSesiPiket(sore?.[1] || 'Belum')
    return {
      pagi: pagiPotong.status,
      sore: sorePotong.status,
      waktuPagi: pagiPotong.waktu,
      waktuSore: sorePotong.waktu,
    }
  }
  const tunggal = keStatusSesi(teks, 'Belum')
  if (tunggal === 'Hadir' || tunggal === 'Izin') return { pagi: tunggal, sore: 'Belum' }
  return { pagi: 'Belum', sore: 'Belum' }
}

export function tulisSesiKehadiran(pagi: StatusSesiPiket, sore: StatusSesiPiket, waktu?: { pagi?: string; sore?: string }) {
  return `Pagi:${tulisPotongSesi(pagi, waktu?.pagi)}|Sore:${tulisPotongSesi(sore, waktu?.sore)}`
}

type BarisMentahPiket = {
  id?: string
  unit?: string | null
  jenis_piket?: string | null
  hari?: string | number | null
  tanggal?: string | null
  id_guru?: string | null
  nama_guru?: string | null
  status_kehadiran?: string | null
  waktu_absen_pagi?: string | null
  waktu_absen_sore?: string | null
}

function lempar(error: { message?: string } | null, cadangan: string): never {
  const pesan = error?.message || cadangan
  throw new Error(gagalTabel(pesan) ? PESAN_TABEL : pesan)
}

export function tanggalHariJakarta(sekarang = new Date()) {
  const tanggal = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(sekarang)
  const namaPendek = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Jakarta', weekday: 'short' }).format(sekarang)
  const peta: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }
  const hari = peta[namaPendek] ?? sekarang.getDay()
  const label = new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(sekarang)
  return { tanggal, hari, namaHari: NAMA_HARI_PIKET[hari] || 'Hari', label }
}

function normId(nilai: unknown) {
  return String(nilai ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
}

function normNama(nilai: unknown) {
  return String(nilai ?? '')
    .toLowerCase()
    .replace(/s\.?\s*pd\.?\s*i\b/g, ' ')
    .replace(/s\.?\s*pd\b/g, ' ')
    .replace(/a\.?\s*md(?:\.?\s*kes)?\b/g, ' ')
    .replace(/a\.?\s*ma\b/g, ' ')
    .replace(/s\.?\s*ds\b/g, ' ')
    .replace(/s\.?\s*si\b/g, ' ')
    .replace(/s\.?\s*sos\b/g, ' ')
    .replace(/s\.?\s*psi\b/g, ' ')
    .replace(/b\.?\s*a\b/g, ' ')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\b(ustadzah|ustadz|ust)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function tokenNama(nilai: unknown) {
  return normNama(nilai)
    .split(' ')
    .filter((token) => token.length > 1)
}

function tokenBerurutan(kunci: string[], sumber: string[]) {
  let indeks = 0
  for (const token of kunci) {
    if (indeks >= sumber.length) return false
    if (sumber[indeks] === token) {
      indeks += 1
      continue
    }
    if (indeks + 1 < sumber.length && sumber[indeks] + sumber[indeks + 1] === token) {
      indeks += 2
      continue
    }
    return false
  }
  return kunci.length >= 2
}

export function cocokNamaPiket(kiri: unknown, kanan: unknown) {
  const a = tokenNama(kiri)
  const b = tokenNama(kanan)
  if (!a.length || !b.length) return false
  if (a.join(' ') === b.join(' ')) return true
  const iris = a.filter((token) => b.includes(token))
  if (a.length >= 2 && b.length >= 2 && iris.length >= 2) return true
  if (a.length === 1 && b.length >= 2 && a[0] === b.join('')) return true
  if (b.length === 1 && a.length >= 2 && b[0] === a.join('')) return true
  if (a.length >= 2 && b.length >= 2 && (tokenBerurutan(a, b) || tokenBerurutan(b, a))) return true
  const pendek = a.length <= b.length ? a : b
  const panjang = a.length <= b.length ? b : a
  return pendek.length === 1 && pendek[0].length >= 3 && panjang[0] === pendek[0]
}

export function cocokGuruPiket(baris: { id_guru?: string | null; nama_guru?: string | null }, user?: IdentitasGuruPiket | null) {
  if (!user) return false
  const idBaris = normId(baris.id_guru)
  const identitas = [user.target_id, user.id_user, user.username, user.nip].map(normId).filter((item) => item.length >= 3)
  if (idBaris.length >= 3 && identitas.includes(idBaris)) return true
  const calon = [user.nama_lengkap, user.nama, user.username]
  const namaJadwal = [baris.nama_guru, String(baris.id_guru || '').replace(/-/g, ' ')]
  return calon.some((nama) => namaJadwal.some((jadwal) => cocokNamaPiket(jadwal, nama)))
}

function slugGuru(nama: string) {
  return tokenNama(nama).join('-') || 'guru'
}

function slotSama(a: { jenis: string; hari: number; nama_guru: string; id_guru: string }, b: { jenis: string; hari: number; nama_guru: string; id_guru: string }) {
  if (a.jenis !== b.jenis || a.hari !== b.hari) return false
  return cocokNamaPiket(a.nama_guru, b.nama_guru) || cocokNamaPiket(a.id_guru, b.nama_guru) || cocokNamaPiket(a.nama_guru, b.id_guru)
}

function jadwalMasterUnit(unit: string): BarisJadwalPiket[] {
  if (!unitSama(unit, UNIT_MASTER_PIKET)) return []
  return MASTER_JADWAL_PIKET.filter((item) => jenisSah(item.jenis)).map((item) => ({
    id: `master:${item.hari}:${item.jenis}:${slugGuru(item.nama)}`,
    unit: UNIT_MASTER_PIKET,
    jenis: item.jenis,
    hari: item.hari,
    id_guru: slugGuru(item.nama),
    nama_guru: item.nama,
    keterangan: '',
    tanggal: tanggalPadaHari(item.hari),
    statusPagi: 'Belum',
    statusSore: 'Belum',
  }))
}

export function ringkasMonitor(baris: BarisMonitorPiket[]) {
  const hitung = (sesi: 'statusPagi' | 'statusSore', status: StatusSesiPiket) =>
    baris.filter((item) => item[sesi] === status).length
  return {
    total: baris.length,
    pagiHadir: hitung('statusPagi', 'Hadir'),
    pagiIzin: hitung('statusPagi', 'Izin'),
    pagiBelum: hitung('statusPagi', 'Belum'),
    soreHadir: hitung('statusSore', 'Hadir'),
    soreIzin: hitung('statusSore', 'Izin'),
    soreBelum: hitung('statusSore', 'Belum'),
  }
}

export function slotUntukHari(jadwal: BarisJadwalPiket[], absensi: BarisAbsensiPiket[], hari: number) {
  const dasar = jadwal
    .filter((item) => item.hari === hari)
    .map((slot) => {
      const catat = absensi.find((item) => cocokSlotPiket(slot, item))
      if (!catat) return slot
      return {
        ...slot,
        statusPagi: catat.statusPagi,
        statusSore: catat.statusSore,
        waktuPagi: catat.waktuPagi,
        waktuSore: catat.waktuSore,
      }
    })
  const tambahan = absensi
    .filter((item) => !dasar.some((slot) => cocokSlotPiket(slot, item)))
    .map(
      (item) =>
        ({
          id: item.id,
          unit: item.unit,
          jenis: item.jenis,
          hari,
          id_guru: item.id_guru,
          nama_guru: item.nama_guru,
          keterangan: '',
          tanggal: item.tanggal,
          statusPagi: item.statusPagi,
          statusSore: item.statusSore,
          waktuPagi: item.waktuPagi,
          waktuSore: item.waktuSore,
        }) satisfies BarisJadwalPiket,
    )
  return [...dasar, ...tambahan]
}

export function susunMonitorPiket(jadwal: BarisJadwalPiket[], absensi: BarisAbsensiPiket[]): BarisMonitorPiket[] {
  return jadwal
    .map((slot) => {
      const catat = absensi.find((item) => cocokSlotPiket(slot, item))
      return {
        id: slot.id,
        jenis: slot.jenis,
        id_guru: slot.id_guru,
        nama_guru: slot.nama_guru,
        statusPagi: catat?.statusPagi || slot.statusPagi || 'Belum',
        statusSore: catat?.statusSore || slot.statusSore || 'Belum',
        waktuPagi: catat?.waktuPagi,
        waktuSore: catat?.waktuSore,
      } satisfies BarisMonitorPiket
    })
    .sort((a, b) => a.jenis.localeCompare(b.jenis, 'id') || a.nama_guru.localeCompare(b.nama_guru, 'id'))
}

function petakanJadwal(row: BarisMentahPiket): BarisJadwalPiket | null {
  if (!jenisSah(row.jenis_piket)) return null
  const tanggal = String(row.tanggal || '').slice(0, 10)
  const hari = indeksHari(row.hari) ?? (tanggal ? hariDariTanggal(tanggal) : null)
  if (hari === null || !tanggal) return null
  const sesi = bacaSesiKehadiran(row.status_kehadiran)
  return {
    id: String(row.id || ''),
    unit: String(row.unit || ''),
    jenis: row.jenis_piket,
    hari,
    id_guru: String(row.id_guru || ''),
    nama_guru: String(row.nama_guru || ''),
    keterangan: '',
    tanggal,
    statusPagi: sesi.pagi,
    statusSore: sesi.sore,
    waktuPagi: waktuAbsenDariKolom(row.waktu_absen_pagi, sesi.waktuPagi),
    waktuSore: waktuAbsenDariKolom(row.waktu_absen_sore, sesi.waktuSore),
  }
}

function petakanAbsensi(row: BarisMentahPiket): BarisAbsensiPiket | null {
  if (!jenisSah(row.jenis_piket) || !row.tanggal) return null
  const sesi = bacaSesiKehadiran(row.status_kehadiran)
  return {
    id: String(row.id || ''),
    unit: String(row.unit || ''),
    jenis: row.jenis_piket,
    tanggal: String(row.tanggal).slice(0, 10),
    id_guru: String(row.id_guru || ''),
    nama_guru: String(row.nama_guru || ''),
    statusPagi: sesi.pagi,
    statusSore: sesi.sore,
    waktuPagi: waktuAbsenDariKolom(row.waktu_absen_pagi, sesi.waktuPagi),
    waktuSore: waktuAbsenDariKolom(row.waktu_absen_sore, sesi.waktuSore),
  }
}

const PILIHAN_PIKET = [
  'id,unit,jenis_piket,hari,tanggal,id_guru,nama_guru,status_kehadiran,waktu_absen_pagi,waktu_absen_sore',
  'id,unit,jenis_piket,hari,tanggal,id_guru,nama_guru,status_kehadiran',
] as const

async function muatBarisPiket(unit: string) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return [] as BarisMentahPiket[]
  const awal = tanggalPadaHari(0)
  const akhir = tanggalPadaHari(6)
  let data: BarisMentahPiket[] | null = null
  let error: { message?: string } | null = null
  for (const kolom of PILIHAN_PIKET) {
    const hasil = await supabase
      .from(TABEL_PIKET)
      .select(kolom)
      .ilike('unit', `%${kunci}%`)
      .gte('tanggal', awal)
      .lte('tanggal', akhir)
      .limit(2000)
    data = (hasil.data || []) as BarisMentahPiket[]
    error = hasil.error
    if (!error) break
    if (!kolomWaktuAbsenTidakAda(error.message)) break
  }
  if (error) lempar(error, 'Jadwal piket belum dapat dimuat.')
  return (data || []).filter((row) => unitSama(String(row.unit || ''), kunci))
}

function unikSlot(slot: BarisJadwalPiket[]) {
  const hasil: BarisJadwalPiket[] = []
  for (const item of slot) {
    if (hasil.some((ada) => slotSama(ada, item))) continue
    hasil.push(item)
  }
  return hasil
}

function urutSesuaiMaster(unit: string, slot: BarisJadwalPiket[]) {
  const master = jadwalMasterUnit(unit)
  const peringkat = (item: BarisJadwalPiket) => {
    const indeks = master.findIndex((resmi) => slotSama(item, resmi))
    return indeks < 0 ? master.length + 1 : indeks
  }
  return unikSlot(slot).sort((a, b) => peringkat(a) - peringkat(b) || a.nama_guru.localeCompare(b.nama_guru, 'id'))
}

const NAMA_GERBANG_LAMA: Record<number, string[]> = {
  1: ['Vita'],
  3: ['Hindun', 'Aisyah'],
}

function sesiMasihKosong(item: BarisJadwalPiket) {
  return item.statusPagi === 'Belum' && item.statusSore === 'Belum'
}

async function selaraskanGerbangMaster(unit: string, tersimpan: BarisJadwalPiket[]) {
  const master = jadwalMasterUnit(unit).filter((item) => item.jenis === 'Piket Gerbang')
  if (master.length === 0) return false
  const terpakai = new Set<string>()
  let berubah = false
  for (const resmi of master) {
    const calon = tersimpan
      .filter((item) => item.jenis === 'Piket Gerbang' && !terpakai.has(item.id) && slotSama(item, resmi))
      .sort((a, b) => Number(sesiMasihKosong(a)) - Number(sesiMasihKosong(b)))
    const ada = calon[0]
    if (!ada) continue
    terpakai.add(ada.id)
    if (ada.nama_guru !== resmi.nama_guru) {
      const { error } = await supabase.from(TABEL_PIKET).update({ nama_guru: resmi.nama_guru }).eq('id', ada.id)
      if (error) lempar(error, 'Nama piket gerbang belum dapat diperbarui.')
      berubah = true
    }
    for (const ganda of calon.slice(1)) {
      if (!sesiMasihKosong(ganda)) continue
      const { error } = await supabase.from(TABEL_PIKET).delete().eq('id', ganda.id)
      if (error) lempar(error, 'Jadwal piket gerbang ganda belum dapat dirapikan.')
      berubah = true
    }
  }
  for (const item of tersimpan) {
    if (item.jenis !== 'Piket Gerbang' || terpakai.has(item.id) || !sesiMasihKosong(item)) continue
    const lama = (NAMA_GERBANG_LAMA[item.hari] || []).some((nama) => cocokNamaPiket(item.nama_guru, nama))
    if (!lama) continue
    const { error } = await supabase.from(TABEL_PIKET).delete().eq('id', item.id)
    if (error) lempar(error, 'Jadwal piket gerbang lama belum dapat diperbarui.')
    berubah = true
  }
  return berubah
}

export async function muatJadwalPiket(unit: string) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return []
  const baca = async () => {
    const baris = await muatBarisPiket(kunci)
    return baris.map((row) => petakanJadwal(row)).filter((row): row is BarisJadwalPiket => Boolean(row))
  }
  let tersimpan = await baca()
  if (await selaraskanGerbangMaster(kunci, tersimpan)) tersimpan = await baca()
  const master = jadwalMasterUnit(kunci)
  const kurang = master.filter((item) => !tersimpan.some((ada) => slotSama(ada, item)))
  if (kurang.length > 0) {
    const { error } = await supabase.from(TABEL_PIKET).insert(
      kurang.map((item) => ({
        unit: kunci,
        jenis_piket: item.jenis,
        hari: NAMA_HARI_PIKET[item.hari] || item.hari,
        tanggal: item.tanggal,
        id_guru: item.id_guru,
        nama_guru: item.nama_guru,
        status_kehadiran: tulisSesiKehadiran('Belum', 'Belum'),
      })),
    )
    if (!error) return urutSesuaiMaster(kunci, await baca())
  }
  return urutSesuaiMaster(kunci, [...tersimpan, ...kurang])
}

export async function muatAbsensiPiket(unit: string, tanggal: string) {
  if (!tanggal) return []
  const baris = await muatBarisPiket(unit)
  return baris
    .filter((row) => String(row.tanggal || '').slice(0, 10) === tanggal)
    .map((row) => petakanAbsensi(row))
    .filter((row): row is BarisAbsensiPiket => Boolean(row))
}

export type ModeRekapPiket = 'tanggal' | 'bulan'

export type BarisRekapPiketTampil = {
  namaGuru: string
  jamPagi: string
  jamSore: string
  keterangan: string
}

function jamSesiRekap(status: StatusSesiPiket, waktu?: string) {
  if (status === 'Hadir') return formatJamAbsenPiket(waktu) || 'Hadir'
  if (status === 'Izin') return 'Izin'
  return '—'
}

function keteranganHarianPiket(item: BarisAbsensiPiket) {
  const catatan: string[] = [item.jenis]
  if (item.statusPagi === 'Izin') catatan.push('Izin pagi')
  if (item.statusSore === 'Izin') catatan.push('Izin sore')
  if (item.statusPagi === 'Belum') catatan.push('Pagi belum absen')
  if (item.statusSore === 'Belum') catatan.push('Sore belum absen')
  return catatan.join(' · ')
}

function skorAbsensiPiket(item: BarisAbsensiPiket) {
  const bobot = (status: StatusSesiPiket) => (status === 'Hadir' ? 2 : status === 'Izin' ? 1 : 0)
  return bobot(item.statusPagi) + bobot(item.statusSore) + (item.waktuPagi ? 1 : 0) + (item.waktuSore ? 1 : 0)
}

function susunRekapPiketHarian(baris: BarisAbsensiPiket[]): BarisRekapPiketTampil[] {
  const unik = new Map<string, BarisAbsensiPiket>()
  for (const item of baris) {
    const kunci = `${item.tanggal}|${item.jenis}|${norm(item.nama_guru) || norm(item.id_guru)}`
    const ada = unik.get(kunci)
    if (!ada || skorAbsensiPiket(item) > skorAbsensiPiket(ada)) unik.set(kunci, item)
  }
  return [...unik.values()]
    .sort((a, b) => a.nama_guru.localeCompare(b.nama_guru, 'id') || a.jenis.localeCompare(b.jenis, 'id'))
    .map((item) => ({
      namaGuru: item.nama_guru,
      jamPagi: jamSesiRekap(item.statusPagi, item.waktuPagi),
      jamSore: jamSesiRekap(item.statusSore, item.waktuSore),
      keterangan: keteranganHarianPiket(item),
    }))
}

function susunRekapPiketBulanan(baris: BarisAbsensiPiket[]): BarisRekapPiketTampil[] {
  type Ember = {
    nama: string
    jenis: Set<string>
    tanggal: Set<string>
    pagiHadir: Set<string>
    pagiIzin: Set<string>
    soreHadir: Set<string>
    soreIzin: Set<string>
  }
  const map = new Map<string, Ember>()
  for (const item of baris) {
    const kunci = norm(item.nama_guru) || norm(item.id_guru)
    if (!kunci || !item.tanggal) continue
    let ember = map.get(kunci)
    if (!ember) {
      ember = {
        nama: item.nama_guru,
        jenis: new Set(),
        tanggal: new Set(),
        pagiHadir: new Set(),
        pagiIzin: new Set(),
        soreHadir: new Set(),
        soreIzin: new Set(),
      }
      map.set(kunci, ember)
    }
    ember.jenis.add(item.jenis)
    ember.tanggal.add(item.tanggal)
    if (item.statusPagi === 'Hadir') ember.pagiHadir.add(item.tanggal)
    if (item.statusPagi === 'Izin') ember.pagiIzin.add(item.tanggal)
    if (item.statusSore === 'Hadir') ember.soreHadir.add(item.tanggal)
    if (item.statusSore === 'Izin') ember.soreIzin.add(item.tanggal)
  }

  const teksJam = (hadir: number, izin: number) => {
    if (hadir > 0) return `${hadir} hadir`
    if (izin > 0) return `${izin} izin`
    return '—'
  }

  return [...map.values()]
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
    .map((item) => {
      const pagiBelum = [...item.tanggal].filter((tgl) => !item.pagiHadir.has(tgl) && !item.pagiIzin.has(tgl)).length
      const soreBelum = [...item.tanggal].filter((tgl) => !item.soreHadir.has(tgl) && !item.soreIzin.has(tgl)).length
      const catatan = [[...item.jenis].join(', '), `${item.tanggal.size} hari`]
      if (item.pagiIzin.size) catatan.push(`izin pagi ${item.pagiIzin.size}`)
      if (item.soreIzin.size) catatan.push(`izin sore ${item.soreIzin.size}`)
      if (pagiBelum) catatan.push(`pagi belum absen ${pagiBelum}`)
      if (soreBelum) catatan.push(`sore belum absen ${soreBelum}`)
      return {
        namaGuru: item.nama,
        jamPagi: teksJam(item.pagiHadir.size, item.pagiIzin.size),
        jamSore: teksJam(item.soreHadir.size, item.soreIzin.size),
        keterangan: catatan.join(' · '),
      }
    })
}

async function muatAbsensiPiketRentang(unit: string, dari: string, sampai: string) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci || !/^\d{4}-\d{2}-\d{2}$/.test(dari) || !/^\d{4}-\d{2}-\d{2}$/.test(sampai)) return [] as BarisAbsensiPiket[]
  let data: BarisMentahPiket[] | null = null
  let error: { message?: string } | null = null
  for (const kolom of PILIHAN_PIKET) {
    const semua: BarisMentahPiket[] = []
    let galat: { message?: string } | null = null
    for (let from = 0; from < 6000; from += 1000) {
      const hasil = await supabase
        .from(TABEL_PIKET)
        .select(kolom)
        .ilike('unit', `%${kunci}%`)
        .gte('tanggal', dari)
        .lte('tanggal', sampai)
        .order('tanggal', { ascending: true })
        .range(from, from + 999)
      if (hasil.error) {
        galat = hasil.error
        break
      }
      const potong = (hasil.data || []) as BarisMentahPiket[]
      semua.push(...potong)
      if (potong.length < 1000) break
    }
    data = semua
    error = galat
    if (!error) break
    if (!kolomWaktuAbsenTidakAda(error.message)) break
  }
  if (error) lempar(error, 'Rekap piket belum dapat dimuat.')
  return (data || [])
    .filter((row) => unitSama(String(row.unit || ''), kunci))
    .map((row) => petakanAbsensi(row))
    .filter((row): row is BarisAbsensiPiket => Boolean(row))
}

export async function muatRekapPiket(unit: string, dari: string, sampai: string, mode: ModeRekapPiket) {
  const baris = await muatAbsensiPiketRentang(unit, dari, sampai)
  return mode === 'bulan' ? susunRekapPiketBulanan(baris) : susunRekapPiketHarian(baris)
}

export async function simpanAbsensiPiket(input: {
  unit: string
  jenis: JenisPiket
  tanggal: string
  id_guru: string
  nama_guru: string
  sesi: SesiPiket
  status: StatusPiket
}) {
  const unit = kanonNamaUnit(input.unit)
  if (!unit) throw new Error('Unit akun belum terbaca. Absensi tidak disimpan ke unit lain.')
  const tanggal = String(input.tanggal || '').slice(0, 10)
  if (tanggal !== tanggalHariJakarta().tanggal) {
    throw new Error('Absensi piket hanya dapat dicatat pada tanggal yang sama.')
  }
  const hari = NAMA_HARI_PIKET[hariDariTanggal(tanggal)] || tanggalHariJakarta().namaHari
  const { data: ada, error: galatBaca } = await supabase
    .from(TABEL_PIKET)
    .select('id,unit,jenis_piket,id_guru,nama_guru,status_kehadiran')
    .ilike('unit', `%${unit}%`)
    .eq('tanggal', tanggal)
    .limit(400)
  if (galatBaca) lempar(galatBaca, 'Absensi piket belum dapat disimpan.')
  const cocokOrang = (row: { unit?: string | null; id_guru?: string | null; nama_guru?: string | null; jenis_piket?: string | null }) =>
    unitSama(String(row.unit || ''), unit) &&
    row.jenis_piket === input.jenis &&
    cocokSlotPiket(
      { jenis: input.jenis, id_guru: input.id_guru, nama_guru: input.nama_guru },
      { jenis: row.jenis_piket || '', id_guru: row.id_guru, nama_guru: row.nama_guru },
    )
  const sasaran = (ada || []).filter(cocokOrang)
  const sekarang = new Date().toISOString()
  const gabung = (nilai: unknown) => {
    const sesi = bacaSesiKehadiran(nilai)
    if (input.sesi === 'Pagi') sesi.pagi = input.status
    else sesi.sore = input.status
    return tulisSesiKehadiran(sesi.pagi, sesi.sore)
  }
  const muatPayloadAbsen = (status_kehadiran: string) => {
    const dasar: Record<string, unknown> = {
      status_kehadiran,
      nama_guru: input.nama_guru,
    }
    if (input.status === 'Hadir' || input.status === 'Izin') {
      if (input.sesi === 'Pagi') dasar.waktu_absen_pagi = sekarang
      else dasar.waktu_absen_sore = sekarang
    }
    return dasar
  }
  const simpanBaris = async (id: string | undefined, status_kehadiran: string, nama_guru?: string | null) => {
    const dasar = muatPayloadAbsen(status_kehadiran)
    if (nama_guru) dasar.nama_guru = nama_guru
    let { error } = await supabase.from(TABEL_PIKET).update(dasar).eq('id', id)
    if (error && kolomWaktuAbsenTidakAda(error.message)) {
      const { waktu_absen_pagi: _p, waktu_absen_sore: _s, ...tanpaWaktu } = dasar
      error = (await supabase.from(TABEL_PIKET).update(tanpaWaktu).eq('id', id)).error
    }
    if (error && statusKehadiranTerlaluPanjang(error.message)) {
      throw new Error(
        'Kolom status_kehadiran di Supabase terlalu pendek. Jalankan perluasan kolom pada supabase/piket-guru.sql.',
      )
    }
    if (error) lempar(error, 'Absensi piket belum dapat disimpan.')
  }
  if (sasaran.length > 0) {
    for (const row of sasaran) {
      await simpanBaris(row.id, gabung(row.status_kehadiran), row.nama_guru || input.nama_guru)
    }
    return
  }
  const kosong: SesiKehadiranPiket = { pagi: 'Belum', sore: 'Belum' }
  if (input.sesi === 'Pagi') kosong.pagi = input.status
  else kosong.sore = input.status
  const status_kehadiran = tulisSesiKehadiran(kosong.pagi, kosong.sore)
  const insert: Record<string, unknown> = {
    unit,
    jenis_piket: input.jenis,
    hari,
    tanggal,
    id_guru: input.id_guru,
    nama_guru: input.nama_guru,
    status_kehadiran,
  }
  if (input.status === 'Hadir' || input.status === 'Izin') {
    if (input.sesi === 'Pagi') insert.waktu_absen_pagi = sekarang
    else insert.waktu_absen_sore = sekarang
  }
  let { error } = await supabase.from(TABEL_PIKET).insert(insert)
  if (error && kolomWaktuAbsenTidakAda(error.message)) {
    const { waktu_absen_pagi: _p, waktu_absen_sore: _s, ...tanpa } = insert
    error = (await supabase.from(TABEL_PIKET).insert(tanpa)).error
  }
  if (error && statusKehadiranTerlaluPanjang(error.message)) {
    throw new Error(
      'Kolom status_kehadiran di Supabase terlalu pendek. Jalankan perluasan kolom pada supabase/piket-guru.sql.',
    )
  }
  if (error) lempar(error, 'Absensi piket belum dapat disimpan.')
}

export async function simpanJadwalPiket(input: {
  unit: string
  jenis: JenisPiket
  hari: number
  id_guru: string
  nama_guru: string
}) {
  const unit = kanonNamaUnit(input.unit)
  if (!unit) throw new Error('Unit akun belum terbaca. Jadwal tidak disimpan ke unit lain.')
  if (!input.id_guru || !input.nama_guru) throw new Error('Guru piket belum dipilih.')
  const namaHari = NAMA_HARI_PIKET[input.hari]
  if (!namaHari) throw new Error('Hari piket tidak dikenali.')
  const tanggal = tanggalPadaHari(input.hari)
  const { data: ada, error: galatBaca } = await supabase
    .from(TABEL_PIKET)
    .select('id,unit')
    .ilike('unit', `%${unit}%`)
    .eq('jenis_piket', input.jenis)
    .eq('id_guru', input.id_guru)
    .eq('tanggal', tanggal)
    .limit(5)
  if (galatBaca) lempar(galatBaca, 'Jadwal piket belum dapat disimpan.')
  const sasaran = (ada || []).find((row) => unitSama(String(row.unit || ''), unit))
  if (sasaran?.id) {
    const { error } = await supabase.from(TABEL_PIKET).update({ nama_guru: input.nama_guru, hari: namaHari }).eq('id', sasaran.id)
    if (error) lempar(error, 'Jadwal piket belum dapat disimpan.')
    return
  }
  const { error } = await supabase.from(TABEL_PIKET).insert({
    unit,
    jenis_piket: input.jenis,
    hari: namaHari,
    tanggal,
    id_guru: input.id_guru,
    nama_guru: input.nama_guru,
    status_kehadiran: 'Belum',
  })
  if (error) lempar(error, 'Jadwal piket belum dapat disimpan.')
}

export async function hapusJadwalPiket(id: string, unit: string) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci || !id) return
  const { error } = await supabase.from(TABEL_PIKET).delete().eq('id', id).ilike('unit', `%${kunci}%`)
  if (error) lempar(error, 'Jadwal piket belum dapat dihapus.')
}

export async function muatGuruUnit(unit: string) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return [] as { id: string; nama: string }[]
  const { data, error } = await supabase.from('users').select('target_id,username,nama_lengkap,unit,role').ilike('unit', `%${kunci}%`).limit(500)
  if (error) throw new Error(error.message || 'Daftar guru belum dapat dimuat.')
  const hasil = new Map<string, string>()
  for (const row of data || []) {
    if (!unitSama(String(row.unit || ''), kunci)) continue
    const id = String(row.target_id || row.username || '').trim()
    const nama = String(row.nama_lengkap || row.username || '').trim()
    if (!id || !nama) continue
    hasil.set(id, nama)
  }
  return [...hasil.entries()]
    .map(([id, nama]) => ({ id, nama }))
    .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
}
