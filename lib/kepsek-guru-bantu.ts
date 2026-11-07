import { supabase } from '@/lib/supabase'
import { TABEL_ABSENSI, TABEL_USERS } from '@/lib/guru-bantu/constants'
import { UNIT_KEPALA_SEKOLAH } from '@/lib/kepala-sekolah'
import type { Absensi } from '@/lib/guru-bantu/types'
import { todayInputValue } from '@/lib/jurnal'

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
  baris: BarisAbsensiGuruBantuKepsek[]
}

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

function klasifikasiStatus(status: string) {
  const teks = String(status || '').trim()
  if (teks === 'Hadir') return 'hadir' as const
  if (teks === 'Terlambat') return 'terlambat' as const
  return 'tidak' as const
}

export async function muatAbsensiGuruBantuKepsek(tanggal = todayInputValue()): Promise<RekapAbsensiGuruBantuKepsek> {
  const { data: users, error: galatUser } = await supabase
    .from(TABEL_USERS)
    .select('target_id,nama_lengkap,unit,role')
    .eq('unit', UNIT_KEPALA_SEKOLAH)
    .or('role.ilike.%guru bantu%,role.ilike.%guru_bantu%,role.ilike.%gurubantu%')
    .order('nama_lengkap')
  if (galatUser) throw new Error(galatUser.message)

  const guru = (users || [])
    .filter((row) => unitSama(row.unit) && peranGuruBantu(row.role))
    .map((row) => ({
      target_id: String(row.target_id || '').trim(),
      nama_lengkap: String(row.nama_lengkap || row.target_id || '').trim(),
    }))
    .filter((row) => row.target_id)

  const ids = guru.map((g) => g.target_id)
  let absensi: Absensi[] = []
  if (ids.length) {
    const { data, error } = await supabase.from(TABEL_ABSENSI).select('*').eq('tanggal', tanggal).in('id_induk', ids)
    if (error) throw new Error(error.message)
    absensi = (data || []) as Absensi[]
  }
  const peta = new Map(absensi.map((row) => [row.id_induk, row]))

  let sudahAbsen = 0
  let hadir = 0
  let terlambat = 0
  let tidakHadir = 0

  const baris: BarisAbsensiGuruBantuKepsek[] = guru.map((g) => {
    const row = peta.get(g.target_id)
    if (!row) {
      return {
        id_induk: g.target_id,
        nama: g.nama_lengkap,
        jam_masuk: null,
        jam_pulang: null,
        status: 'Belum absen',
        foto_masuk: null,
        foto_pulang: null,
      }
    }
    sudahAbsen += 1
    const kelas = klasifikasiStatus(row.status)
    if (kelas === 'hadir') hadir += 1
    else if (kelas === 'terlambat') terlambat += 1
    else tidakHadir += 1

    return {
      id_induk: g.target_id,
      nama: g.nama_lengkap,
      jam_masuk: potongJam(row.jam_masuk),
      jam_pulang: potongJam(row.jam_pulang),
      status: row.status || 'Tidak Hadir',
      foto_masuk: row.foto_masuk,
      foto_pulang: row.foto_pulang,
    }
  })

  return {
    tanggal,
    total: guru.length,
    sudahAbsen,
    hadir,
    terlambat,
    tidakHadir,
    baris,
  }
}
