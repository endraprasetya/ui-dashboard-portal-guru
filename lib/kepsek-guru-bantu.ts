import { supabase } from '@/lib/supabase'
import { TABEL_ABSENSI, TABEL_IZIN, TABEL_USERS } from '@/lib/guru-bantu/constants'
import { UNIT_KEPALA_SEKOLAH } from '@/lib/kepala-sekolah'
import type { Absensi, Perizinan } from '@/lib/guru-bantu/types'
import { eachDate } from '@/lib/guru-bantu/utils'
import { monthRange, todayInputValue } from '@/lib/jurnal'

export type BarisAbsensiGuruBantuKepsek = {
  id_induk: string
  nama: string
  jam_masuk: string | null
  jam_pulang: string | null
  status: string
  foto_masuk: string | null
  foto_pulang: string | null
}

export type RekapAbsensiGuruBantuKepsek = {
  tanggal: string
  total: number
  sudahAbsen: number
  hadir: number
  terlambat: number
  tidakHadir: number
  izin: number
  sakit: number
  alpa: number
  baris: BarisAbsensiGuruBantuKepsek[]
}

export type BarisRekapBulananGuruBantu = {
  id_induk: string
  nama: string
  hadir: number
  izin: number
  sakit: number
  alpa: number
}

export type RekapBulananGuruBantuKepsek = {
  bulan: string
  labelBulan: string
  hariKerja: number
  baris: BarisRekapBulananGuruBantu[]
  total: { hadir: number; izin: number; sakit: number; alpa: number }
}

type GuruBantuUnit = { target_id: string; nama_lengkap: string }

export type KategoriAbsenGuruBantu = 'hadir' | 'terlambat' | 'izin' | 'sakit' | 'alpa'

function unitSama(nilai?: string) {
  return String(nilai || '').trim().toLowerCase() === UNIT_KEPALA_SEKOLAH.toLowerCase()
}

function peranGuruBantu(role?: string) {
  const teks = String(role || '').toLowerCase()
  return teks.includes('guru bantu') || teks.includes('guru_bantu') || teks.includes('gurubantu')
}

function potongJam(jam: string | null | undefined) {
  if (!jam) return null
  return jam.slice(0, 5)
}

export function kategoriAbsenGuruBantu(status: string | null | undefined): KategoriAbsenGuruBantu {
  const teks = String(status || '').trim()
  const lower = teks.toLowerCase()
  if (!teks || teks === 'Belum absen') return 'alpa'
  if (teks === 'Hadir') return 'hadir'
  if (teks === 'Terlambat') return 'terlambat'
  if (lower === 'alpa') return 'alpa'
  if (lower.includes('sakit') || lower.includes('kesehatan')) return 'sakit'
  return 'izin'
}

function labelDariKategori(kategori: KategoriAbsenGuruBantu, statusAsli?: string) {
  if (kategori === 'hadir') return 'Hadir'
  if (kategori === 'terlambat') return 'Terlambat'
  if (kategori === 'sakit') return statusAsli && statusAsli !== 'Belum absen' ? statusAsli : 'Sakit'
  if (kategori === 'izin') return statusAsli && statusAsli !== 'Belum absen' ? statusAsli : 'Izin'
  return statusAsli || 'Alpa'
}

/** Senin–Kamis & Sabtu, mengikuti kalender jurnal sekolah (Jumat & Minggu libur). */
function isHariKerja(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  if (!y || !m || !d) return false
  const hari = new Date(y, m - 1, d).getDay()
  return hari !== 0 && hari !== 5
}

function labelBulan(bulan: string) {
  const [y, m] = bulan.split('-').map(Number)
  if (!y || !m) return bulan
  return new Date(y, m - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

async function daftarGuruBantuUnit(): Promise<GuruBantuUnit[]> {
  const { data: users, error: galatUser } = await supabase
    .from(TABEL_USERS)
    .select('target_id,nama_lengkap,unit,role')
    .eq('unit', UNIT_KEPALA_SEKOLAH)
    .or('role.ilike.%guru bantu%,role.ilike.%guru_bantu%,role.ilike.%gurubantu%')
    .order('nama_lengkap')
  if (galatUser) throw new Error(galatUser.message)

  return (users || [])
    .filter((row) => unitSama(row.unit) && peranGuruBantu(row.role))
    .map((row) => ({
      target_id: String(row.target_id || '').trim(),
      nama_lengkap: String(row.nama_lengkap || row.target_id || '').trim(),
    }))
    .filter((row) => row.target_id)
}

function petaIzinPadaTanggal(izin: Pick<Perizinan, 'id_induk' | 'jenis_izin' | 'detail_izin'>[]) {
  const peta = new Map<string, string>()
  for (const row of izin) {
    const id = String(row.id_induk || '').trim()
    if (!id) continue
    const detail = String(row.detail_izin || '').trim()
    const jenis = String(row.jenis_izin || '').trim()
    peta.set(id, detail || jenis || 'Izin')
  }
  return peta
}

export function rekapAbsensiGuruBantuKosong(tanggal = todayInputValue()): RekapAbsensiGuruBantuKepsek {
  return {
    tanggal,
    total: 0,
    sudahAbsen: 0,
    hadir: 0,
    terlambat: 0,
    tidakHadir: 0,
    izin: 0,
    sakit: 0,
    alpa: 0,
    baris: [],
  }
}

export async function muatAbsensiGuruBantuKepsek(tanggal = todayInputValue()): Promise<RekapAbsensiGuruBantuKepsek> {
  const guru = await daftarGuruBantuUnit()
  const ids = guru.map((g) => g.target_id)
  let absensi: Absensi[] = []
  let izinHari: Pick<Perizinan, 'id_induk' | 'jenis_izin' | 'detail_izin'>[] = []

  if (ids.length) {
    const [absRes, izinRes] = await Promise.all([
      supabase.from(TABEL_ABSENSI).select('*').eq('tanggal', tanggal).in('id_induk', ids),
      supabase
        .from(TABEL_IZIN)
        .select('id_induk,jenis_izin,detail_izin')
        .in('id_induk', ids)
        .in('status', ['Disetujui', 'Pending'])
        .lte('tgl_mulai', tanggal)
        .gte('tgl_selesai', tanggal),
    ])
    if (absRes.error) throw new Error(absRes.error.message)
    if (izinRes.error) throw new Error(izinRes.error.message)
    absensi = (absRes.data || []) as Absensi[]
    izinHari = (izinRes.data || []) as Pick<Perizinan, 'id_induk' | 'jenis_izin' | 'detail_izin'>[]
  }

  const petaAbsen = new Map(absensi.map((row) => [row.id_induk, row]))
  const petaIzin = petaIzinPadaTanggal(izinHari)
  const hariIni = todayInputValue()
  const labelKosong = tanggal < hariIni ? 'Alpa' : 'Belum absen'

  let sudahAbsen = 0
  let hadir = 0
  let terlambat = 0
  let izin = 0
  let sakit = 0
  let alpa = 0

  const baris: BarisAbsensiGuruBantuKepsek[] = guru.map((g) => {
    const row = petaAbsen.get(g.target_id)
    const statusIzin = petaIzin.get(g.target_id)
    const status = row?.status || statusIzin || labelKosong
    const kategori = kategoriAbsenGuruBantu(status)

    if (row) sudahAbsen += 1
    if (kategori === 'hadir') hadir += 1
    else if (kategori === 'terlambat') terlambat += 1
    else if (kategori === 'sakit') sakit += 1
    else if (kategori === 'izin') izin += 1
    else alpa += 1

    return {
      id_induk: g.target_id,
      nama: g.nama_lengkap,
      jam_masuk: potongJam(row?.jam_masuk),
      jam_pulang: potongJam(row?.jam_pulang),
      status: labelDariKategori(kategori, status),
      foto_masuk: row?.foto_masuk || null,
      foto_pulang: row?.foto_pulang || null,
    }
  })

  return {
    tanggal,
    total: guru.length,
    sudahAbsen,
    hadir,
    terlambat,
    tidakHadir: izin + sakit + alpa,
    izin,
    sakit,
    alpa,
    baris,
  }
}

export async function muatRekapBulananGuruBantuKepsek(bulan: string): Promise<RekapBulananGuruBantuKepsek> {
  const guru = await daftarGuruBantuUnit()
  const { start, end } = monthRange(bulan)
  const hariIni = todayInputValue()
  const batas = hariIni < end ? hariIni : end
  const semuaTanggal = eachDate(start, batas)
  const hariKerja = semuaTanggal.filter(isHariKerja)
  const ids = guru.map((g) => g.target_id)

  let absensi: Absensi[] = []
  let izin: Perizinan[] = []
  if (ids.length) {
    const [absRes, izinRes] = await Promise.all([
      supabase.from(TABEL_ABSENSI).select('*').gte('tanggal', start).lte('tanggal', batas).in('id_induk', ids),
      supabase
        .from(TABEL_IZIN)
        .select('*')
        .eq('status', 'Disetujui')
        .in('id_induk', ids)
        .lte('tgl_mulai', batas)
        .gte('tgl_selesai', start),
    ])
    if (absRes.error) throw new Error(absRes.error.message)
    if (izinRes.error) throw new Error(izinRes.error.message)
    absensi = (absRes.data || []) as Absensi[]
    izin = (izinRes.data || []) as Perizinan[]
  }

  const petaAbsen = new Map<string, Absensi>()
  const tanggalAdaData = new Set<string>()
  for (const row of absensi) {
    petaAbsen.set(`${row.id_induk}|${row.tanggal}`, row)
    if (row.tanggal) tanggalAdaData.add(row.tanggal)
  }

  const izinPerGuru = new Map<string, Perizinan[]>()
  for (const row of izin) {
    const list = izinPerGuru.get(row.id_induk) || []
    list.push(row)
    izinPerGuru.set(row.id_induk, list)
  }

  const statusDariIzin = (idInduk: string, tanggal: string) => {
    const list = izinPerGuru.get(idInduk) || []
    const cocok = list.find((item) => item.tgl_mulai <= tanggal && item.tgl_selesai >= tanggal)
    if (!cocok) return null
    return String(cocok.detail_izin || cocok.jenis_izin || 'Izin')
  }

  const baris: BarisRekapBulananGuruBantu[] = guru.map((g) => {
    let hadir = 0
    let izinHari = 0
    let sakit = 0
    let alpa = 0

    for (const tanggal of semuaTanggal) {
      const row = petaAbsen.get(`${g.target_id}|${tanggal}`)
      const status = row?.status || statusDariIzin(g.target_id, tanggal)
      if (status) {
        const kategori = kategoriAbsenGuruBantu(status)
        if (kategori === 'hadir' || kategori === 'terlambat') hadir += 1
        else if (kategori === 'sakit') sakit += 1
        else if (kategori === 'izin') izinHari += 1
        else alpa += 1
      } else if (hariKerja.includes(tanggal) && tanggalAdaData.has(tanggal)) {
        alpa += 1
      }
    }

    return {
      id_induk: g.target_id,
      nama: g.nama_lengkap,
      hadir,
      izin: izinHari,
      sakit,
      alpa,
    }
  })

  const total = baris.reduce(
    (acc, row) => ({
      hadir: acc.hadir + row.hadir,
      izin: acc.izin + row.izin,
      sakit: acc.sakit + row.sakit,
      alpa: acc.alpa + row.alpa,
    }),
    { hadir: 0, izin: 0, sakit: 0, alpa: 0 },
  )

  const hariTerpakai = hariKerja.filter((tanggal) => tanggalAdaData.has(tanggal)).length

  return {
    bulan,
    labelBulan: labelBulan(bulan),
    hariKerja: hariTerpakai || hariKerja.length,
    baris,
    total,
  }
}
