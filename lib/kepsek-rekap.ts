import {
  jenisAbsen,
  JADWAL_PELAJARAN,
  normalizeSiswaTidakHadir,
  todayInputValue,
} from '@/lib/jurnal'
import type { AbsenSiswa, TitikTren } from '@/lib/kepala-sekolah'
import { normalKelas } from '@/lib/qiroah'

const SIMBOL_ABSEN = { sakit: 'S', izin: 'I', alpa: 'A' } as const

export type KonteksSiswaUnit = {
  jumlahKelas: Map<string, number>
  kenali: (absen: { id_siswa?: string; nama: string }, kelas: string) => { nama: string; kelas: string } | null
}

export function buatKonteksSiswa(
  siswa: { id_siswa: string; nama_siswa: string; kelas: string }[],
): KonteksSiswaUnit {
  const jumlahKelas = new Map<string, number>()
  const siswaById = new Map(siswa.map((row) => [String(row.id_siswa), row]))
  const siswaByNama = new Map(
    siswa.map((row) => [`${row.nama_siswa.trim().toLowerCase()}|${normalKelas(row.kelas)}`, row]),
  )
  for (const row of siswa) {
    const kunci = normalKelas(row.kelas)
    if (!kunci) continue
    jumlahKelas.set(kunci, (jumlahKelas.get(kunci) || 0) + 1)
  }
  const kenali = (absen: { id_siswa?: string; nama: string }, kelas: string) => {
    const dariId = absen.id_siswa ? siswaById.get(String(absen.id_siswa)) : undefined
    const dariNama = siswaByNama.get(`${absen.nama.trim().toLowerCase()}|${kelas}`)
    const ketemu = dariId || dariNama
    if (!ketemu) return null
    return { nama: ketemu.nama_siswa, kelas: ketemu.kelas }
  }
  return { jumlahKelas, kenali }
}

function petaKelas(jumlahKelas: Map<string, number>, kelas?: string) {
  if (!kelas) return jumlahKelas
  return new Map([[kelas, jumlahKelas.get(kelas) || 0]])
}

export function rekapKehadiranDariJurnal(
  baris: { tanggal?: string; kelas?: string; siswa_tidak_hadir?: unknown }[],
  tanggal: string,
  ctx: KonteksSiswaUnit,
  kelas?: string,
) {
  const hariIni = baris.filter((row) => String(row.tanggal || '').slice(0, 10) === tanggal)
  const saring = kelas ? hariIni.filter((row) => normalKelas(row.kelas) === kelas) : hariIni
  return rekapAbsenInternal(saring, petaKelas(ctx.jumlahKelas, kelas), ctx.kenali)
}

function rekapAbsenInternal(
  rows: { kelas?: string; siswa_tidak_hadir?: unknown }[],
  jumlahKelas: Map<string, number>,
  kenali: KonteksSiswaUnit['kenali'],
) {
  const perKelas = new Map<string, Map<string, { nama: string; jenis: 'sakit' | 'izin' | 'alpa' }>>()
  for (const row of rows) {
    const kelasJurnal = normalKelas(row.kelas)
    if (!kelasJurnal) continue
    for (const absen of normalizeSiswaTidakHadir(row.siswa_tidak_hadir)) {
      const siswa = kenali(absen, kelasJurnal)
      if (!siswa) continue
      const kelas = normalKelas(siswa.kelas) || kelasJurnal
      if (!perKelas.has(kelas)) perKelas.set(kelas, new Map())
      const peta = perKelas.get(kelas)!
      const kunci = absen.id_siswa || siswa.nama.toLowerCase()
      if (!kunci || peta.has(kunci)) continue
      peta.set(kunci, { nama: siswa.nama, jenis: jenisAbsen(absen.keterangan) })
    }
  }
  let hadir = 0
  let sakit = 0
  let izin = 0
  let alpa = 0
  const tidakHadir: AbsenSiswa[] = []
  for (const [kelas, absen] of perKelas) {
    for (const item of absen.values()) {
      if (item.jenis === 'sakit') sakit += 1
      else if (item.jenis === 'izin') izin += 1
      else alpa += 1
      tidakHadir.push({ nama: item.nama, kelas, keterangan: SIMBOL_ABSEN[item.jenis] })
    }
    const total = jumlahKelas.get(kelas) || absen.size
    hadir += Math.max(0, total - absen.size)
  }
  const tercatat = hadir + sakit + izin + alpa
  tidakHadir.sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'))
  return {
    hadir,
    sakit,
    izin,
    alpa,
    kelas: perKelas.size,
    persen: tercatat > 0 ? Math.round((hadir / tercatat) * 10) / 10 : null,
    tidakHadir,
  }
}

export function trenKehadiran7Hari(
  baris: { tanggal?: string; kelas?: string; siswa_tidak_hadir?: unknown }[],
  tanggalAkhir: string,
  ctx: KonteksSiswaUnit,
  kelas?: string,
): TitikTren[] {
  const basis = new Date(`${tanggalAkhir}T12:00:00`)
  const mulai = new Date(basis)
  mulai.setHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, index) => {
    const tanggal = new Date(mulai)
    tanggal.setDate(mulai.getDate() - (6 - index))
    const iso = todayInputValue(tanggal)
    let subset = baris.filter((row) => String(row.tanggal || '').slice(0, 10) === iso)
    if (kelas) subset = subset.filter((row) => normalKelas(row.kelas) === kelas)
    return {
      label: tanggal.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      persen: rekapKehadiranDariJurnal(baris, iso, ctx, kelas).persen,
    }
  })
}

export function slotJurnalPerKelasPerHari() {
  return JADWAL_PELAJARAN.filter((item) => item.j).length
}

export function hitungRingkasJurnal(
  baris: { tanggal?: string; kelas?: string }[],
  tanggal: string,
  jumlahKelasUnit: number,
) {
  const terisi = baris.filter((row) => String(row.tanggal || '').slice(0, 10) === tanggal).length
  const expected = jumlahKelasUnit * slotJurnalPerKelasPerHari()
  return { tanggal, terisi, belum: Math.max(0, expected - terisi), expected }
}
