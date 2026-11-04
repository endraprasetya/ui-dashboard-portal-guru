import { fetchAllSiswa } from '@/lib/siswa'
import { buildRekapSiswaPerHari, fetchJurnalRentang, todayInputValue, type SiswaKelas } from '@/lib/jurnal'

export type RekapAbsensiCepatHariIni = {
  /** Ada baris jurnal hari ini untuk kelas binaan */
  adaData: boolean
  tanggal: string
  totalSiswa: number
  hadir: number
  tidakHadir: number
  sakit: number
  izin: number
  alpa: number
  labelKelas: string
}

export async function muatAbsensiCepatHariIni(
  currentUser?: { target_id?: string; nama_lengkap?: string; nama?: string; username?: string; unit?: string } | null,
  sekarang = new Date(),
): Promise<RekapAbsensiCepatHariIni> {
  const tanggal = todayInputValue(sekarang)
  const kosong: RekapAbsensiCepatHariIni = {
    adaData: false,
    tanggal,
    totalSiswa: 0,
    hadir: 0,
    tidakHadir: 0,
    sakit: 0,
    izin: 0,
    alpa: 0,
    labelKelas: '',
  }

  if (!currentUser) return kosong

  const daftarSiswa = await fetchAllSiswa(currentUser)
  if (daftarSiswa.length === 0) return kosong

  const roster: SiswaKelas[] = daftarSiswa.map((row) => ({
    id_siswa: String(row.id_siswa),
    nama_siswa: String(row.nama_siswa || ''),
    kelas: String(row.kelas || ''),
    unit: row.unit ? String(row.unit) : undefined,
  }))

  const kelasSet = new Set(roster.map((row) => row.kelas.trim()).filter(Boolean))
  const labelKelas =
    kelasSet.size === 0
      ? ''
      : kelasSet.size === 1
        ? `Kelas ${Array.from(kelasSet)[0]}`
        : `${kelasSet.size} kelas binaan`

  const { rows, error } = await fetchJurnalRentang({ start: tanggal, end: tanggal })
  if (error) {
    console.error('Gagal memuat absensi hari ini:', error.message)
    return { ...kosong, totalSiswa: roster.length, labelKelas }
  }

  const barisHari = rows.filter((row) => kelasSet.has(String(row.kelas || '').trim()))
  if (barisHari.length === 0) {
    return { ...kosong, totalSiswa: roster.length, labelKelas }
  }

  const { baris } = buildRekapSiswaPerHari({
    rows: barisHari,
    siswa: roster.map((row) => ({ id_siswa: row.id_siswa, nama_siswa: row.nama_siswa })),
    roster,
  })

  let hadir = 0
  let sakit = 0
  let izin = 0
  let alpa = 0

  for (const row of baris) {
    const absenHariIni = row.rincian.some((item) => item.tanggal.slice(0, 10) === tanggal)
    if (!absenHariIni) {
      hadir += 1
      continue
    }
    const status = row.rincian.find((item) => item.tanggal.slice(0, 10) === tanggal)?.status
    if (status === 'Sakit') sakit += 1
    else if (status === 'Izin') izin += 1
    else alpa += 1
  }

  const tidakHadir = sakit + izin + alpa

  return {
    adaData: true,
    tanggal,
    totalSiswa: roster.length,
    hadir,
    tidakHadir,
    sakit,
    izin,
    alpa,
    labelKelas,
  }
}
