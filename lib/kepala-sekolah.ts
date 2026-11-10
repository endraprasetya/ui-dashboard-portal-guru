import { supabase } from '@/lib/supabase'
import { isKelasAlumni } from '@/lib/siswa'
import {
  jenisAbsen,
  monthRange,
  normalizeSiswaTidakHadir,
  todayInputValue,
} from '@/lib/jurnal'
import {
  muatAbsensiGuruBantuKepsek,
  rekapAbsensiGuruBantuKosong,
  type RekapAbsensiGuruBantuKepsek,
} from '@/lib/kepsek-guru-bantu'
import {
  hitungPemantauanRaporHq,
  muatDataRaporHqKepsek,
  ringkasPemantauanRaporHq,
  type DataMentahRaporHq,
  type RingkasRaporHq,
} from '@/lib/kepsek-rapor-hq'
import { hitungRingkasJurnal } from '@/lib/kepsek-rekap'
import {
  labelStatusPengajuan,
  menungguJadwal,
  namaPengujiCocok,
  pengujiUntukKelas,
  normalKelas,
  sudahTerjadwal,
  teacherDisplayName,
  waktuDariStatus,
} from '@/lib/qiroah'
import { periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'
import { cariRekapan } from '@/lib/ujian-relasi'

export const KEPALA_SEKOLAH = {
  nama: 'Sri Sunarko Utomo, S.Pd',
  niy: '197805202013 0208',
}

export function teksPeran(role?: string | null) {
  return String(role || '').trim().toLowerCase()
}

export function adalahPeranKepala(role?: string | null) {
  const peran = teksPeran(role)
  return peran.includes('kepala') || peran.includes('kepsek')
}

export function adalahKepalaSekolah(user?: { role?: string } | null) {
  return adalahPeranKepala(user?.role)
}

export type BarisGuru = {
  nama: string
  unit: string
  jurnal: 'Sudah' | 'Belum'
  qiroah: 'Sudah' | 'Belum'
  tahfidz: 'Sudah' | 'Belum' | 'Tidak tercatat'
}

export type BarisUjian = {
  id: string
  nama: string
  kelas: string
  unit: string
  jilid: string
  pengampu: string
  penguji: string
  status: string
  tanggal: string
  waktu: string
}

export type RekapLulus = {
  id_ujian: string
  tanggal_ujian: string
  id_siswa: string
  nama: string
  kelas: string
  unit: string
  guru_pengampu: string
  jilid_asal: string
  jilid_tujuan: string
  penguji: string
  kelancaran: number
  makhraj: number
  harakat: number
  tajwid: number
  adab: number
  nilai_akhir: number
  predikat: string
  keputusan: string
  kelebihan_siswa: string
}

export type TitikTren = { label: string; persen: number | null }

export type AbsenSiswa = {
  nama: string
  kelas: string
  keterangan: 'S' | 'I' | 'A'
}

export type BarisJurnal = {
  kunci: string
  kelas: string
  jam: number
  mapel: string
  materi: string
  kegiatan: string
  guru?: string
}

export type StatUjianBulan = {
  label: string
  bulan: string
  totalPengajuan: number
  sudahUjian: number
  lulus: number
  mengulang: number
}

export type BarisTertib = {
  id_siswa: string
  nama: string
  kelas: string
  label: string
  pts: number
  guru: string
  waktu: string
}

export type SetoranHarian = {
  tanggal: string
  tahfidzId: string[]
  qiroahId: string[]
}

export type BarisSetoranRingkas = { id_siswa: string; tanggal: string }

export type RingkasJurnal = {
  tanggal: string
  terisi: number
  belum: number
  expected: number
}

export type LaporanKepsek = {
  unit: string
  tanggalLaporan: string
  kehadiran: { hadir: number; sakit: number; izin: number; alpa: number; kelas: number }
  tidakHadir: AbsenSiswa[]
  setoranTahfidz: number
  setoranQiroah: number
  setoranHariIni: SetoranHarian
  setoranBulan: { tahfidz: BarisSetoranRingkas[]; qiroah: BarisSetoranRingkas[] }
  ujianAktif: number
  ujianBulan: StatUjianBulan
  tertibHariIni: number
  tertibBulan: BarisTertib[]
  trenMingguan: TitikTren[]
  trenBulanan: TitikTren[]
  jurnalRingkas: RingkasJurnal
  predikat: { nama: string; jumlah: number }[]
  guru: BarisGuru[]
  ujian: BarisUjian[]
  hasilUjian: RekapLulus[]
  lulus: RekapLulus[]
  siswa: { id_siswa: string; nama_siswa: string; kelas: string; unit: string; id_pembimbing?: string | null }[]
  raporHqMentah: DataMentahRaporHq
  raporHqRingkas: RingkasRaporHq
  guruBantu: RekapAbsensiGuruBantuKepsek
  jurnalHariIni: BarisJurnal[]
  jurnalBulan: {
    tanggal?: string
    kelas?: string
    jam?: number | string | null
    mapel?: string | null
    materi?: string | null
    kegiatan?: string | null
    semester?: number | string | null
    siswa_tidak_hadir?: unknown
    guru?: string | null
  }[]
  kelas: string[]
  catatan: string[]
}

const PREDIKAT = ['Mumtaz', 'Jayyid Jiddan', 'Jayyid', 'Mengulang']
export const UNIT_KEPALA_SEKOLAH = 'Nogosari'
const SIMBOL_ABSEN = { sakit: 'S', izin: 'I', alpa: 'A' } as const

function unitKepalaSekolah(nilai?: string) {
  return String(nilai || '').trim().toLowerCase() === UNIT_KEPALA_SEKOLAH.toLowerCase()
}

async function halaman<T>(buat: (dari: number, sampai: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>) {
  const ukuran = 1000
  const semua: T[] = []
  let dari = 0
  while (dari <= 8000) {
    const { data, error } = await buat(dari, dari + ukuran - 1)
    if (error) throw new Error(error.message)
    const baris = data || []
    semua.push(...baris)
    if (baris.length < ukuran) break
    dari += ukuran
  }
  return semua
}

function tanggalJakarta(nilai: unknown) {
  const teks = String(nilai || '').trim()
  if (!teks) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(teks.slice(0, 10)) && teks.length <= 10) return teks.slice(0, 10)
  const waktu = Date.parse(teks)
  if (!Number.isFinite(waktu)) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date(waktu))
}

function diHariIni(nilai: unknown, hari: string, mulai: number) {
  const teks = String(nilai || '').trim()
  if (!teks) return false
  if (/^\d{4}-\d{2}-\d{2}$/.test(teks.slice(0, 10)) && teks.length <= 10) return teks.slice(0, 10) === hari
  const waktu = Date.parse(teks)
  return Number.isFinite(waktu) && waktu >= mulai
}

function rekapAbsen(
  rows: { kelas?: string; siswa_tidak_hadir?: unknown }[],
  jumlahKelas: Map<string, number>,
  kenali: (absen: { id_siswa?: string; nama: string }, kelas: string) => { nama: string; kelas: string } | null,
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

function namaGuru(row: any) {
  return teacherDisplayName(row)
}

export async function muatLaporanKepsek(sekarang = new Date()): Promise<LaporanKepsek> {
  const hari = todayInputValue(sekarang)
  const mulai = new Date(sekarang)
  mulai.setHours(0, 0, 0, 0)
  const sejak = new Date(mulai)
  sejak.setDate(sejak.getDate() - 1)
  const { start } = monthRange(hari.slice(0, 7))
  const catatan: string[] = []

  const [siswa, jurnal, qiroah, tahfidzContoh, pengajuan, tertib, rekapan, guru] = await Promise.all([
    halaman<{ id_siswa: string; nama_siswa: string; kelas: string; unit: string; id_pembimbing?: string | null }>((dari, sampai) =>
      supabase
        .from('siswa')
        .select('id_siswa,nama_siswa,kelas,unit,id_pembimbing')
        .eq('unit', UNIT_KEPALA_SEKOLAH)
        .not('kelas', 'ilike', '%Alumni%')
        .range(dari, sampai),
    ).catch((error: Error) => {
      catatan.push('Data siswa belum dapat dimuat.')
      console.error(error.message)
      return []
    }),
    halaman<{
      tanggal?: string
      kelas?: string
      jam?: number | string | null
      mapel?: string | null
      materi?: string | null
      kegiatan?: string | null
      semester?: number | string | null
      siswa_tidak_hadir?: unknown
      guru?: string | null
    }>((dari, sampai) =>
      supabase
        .from('jurnal_pembelajaran')
        .select('tanggal,kelas,jam,mapel,materi,kegiatan,semester,siswa_tidak_hadir,guru')
        .gte('tanggal', start)
        .lte('tanggal', hari)
        .range(dari, sampai),
    ).catch((error: Error) => {
      catatan.push('Jurnal pembelajaran belum dapat dimuat.')
      console.error(error.message)
      return []
    }),
    supabase
      .from('setoran_qiroah')
      .select('id_qiroah,tanggal,ustadz,unit,id_siswa')
      .eq('unit', UNIT_KEPALA_SEKOLAH)
      .gte('tanggal', start)
      .limit(4000),
    supabase
      .from('setoran_tahfidz')
      .select('id_setoran,tanggal,id_siswa')
      .gte('tanggal', start)
      .limit(4000),
    halaman<any>((dari, sampai) =>
      supabase
        .from('pengajuan')
        .select(
          'id_pengajuan,id_siswa,nama_siswa,kelas,unit,jilid_diujikan,diajukan_oleh,nama_penguji,status,tanggal_pelaksanaan,tanggal_diajukan',
        )
        .eq('unit', UNIT_KEPALA_SEKOLAH)
        .order('tanggal_diajukan', { ascending: false })
        .range(dari, sampai),
    ).catch((error: Error) => {
      catatan.push('Pengajuan ujian belum dapat dimuat.')
      console.error(error.message)
      return []
    }),
    supabase
      .from('tertib_point')
      .select('id_tertib_point,created_at,guru,unit,pts,label,id_siswa')
      .eq('unit', UNIT_KEPALA_SEKOLAH)
      .gte('created_at', `${start}T00:00:00+07:00`)
      .limit(2000),
    halaman<any>((dari, sampai) =>
      supabase
        .from('rekapan')
        .select('id_ujian,tanggal_ujian,id_siswa,nama,kelas,guru_pengampu,jilid_asal,jilid_tujuan,penguji,kelancaran,makhraj,harakat,tajwid,adab,nilai_akhir,predikat,keputusan,kelebihan_siswa')
        .order('tanggal_ujian', { ascending: false })
        .range(dari, sampai),
    ).catch((error: Error) => {
      catatan.push('Rekapan ujian belum dapat dimuat.')
      console.error(error.message)
      return []
    }),
    muatPengguna(catatan),
  ])

  const daftarSiswa = (siswa || []).filter((row) => unitKepalaSekolah(row.unit) && !isKelasAlumni(row.kelas))
  const jumlahKelas = new Map<string, number>()
  const kelasUnit = new Set<string>()
  const siswaById = new Map(daftarSiswa.map((row) => [String(row.id_siswa), row]))
  const siswaByNama = new Map(
    daftarSiswa.map((row) => [`${row.nama_siswa.trim().toLowerCase()}|${normalKelas(row.kelas)}`, row]),
  )
  for (const row of daftarSiswa) {
    const kunci = normalKelas(row.kelas)
    if (!kunci) continue
    jumlahKelas.set(kunci, (jumlahKelas.get(kunci) || 0) + 1)
    kelasUnit.add(kunci)
  }

  const kenali = (absen: { id_siswa?: string; nama: string }, kelas: string) => {
    const dariId = absen.id_siswa ? siswaById.get(String(absen.id_siswa)) : undefined
    const dariNama = siswaByNama.get(`${absen.nama.trim().toLowerCase()}|${kelas}`)
    const ketemu = dariId || dariNama
    if (!ketemu) return null
    return { nama: ketemu.nama_siswa, kelas: ketemu.kelas }
  }

  const jurnalUnit = jurnal.filter((row) => kelasUnit.has(normalKelas(row.kelas)))
  const jurnalHari = jurnalUnit.filter((row) => String(row.tanggal || '').slice(0, 10) === hari)
  const rekapHari = rekapAbsen(jurnalHari, jumlahKelas, kenali)
  const kelasJurnal = new Set(jurnalHari.map((row) => normalKelas(row.kelas)).filter(Boolean))
  const jurnalHariIni: BarisJurnal[] = jurnalHari
    .map((row) => ({
      kunci: `${normalKelas(row.kelas)}-${Number(row.jam) || 0}-${row.mapel || ''}`,
      kelas: normalKelas(row.kelas),
      jam: Number(row.jam) || 0,
      mapel: String(row.mapel || '').trim() || 'Belum diisi',
      materi: String(row.materi || '').trim(),
      kegiatan: String(row.kegiatan || '').trim(),
      guru: String(row.guru || '').trim() || undefined,
    }))
    .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.jam - b.jam)

  const jurnalRingkas = hitungRingkasJurnal(jurnalUnit, hari, kelasUnit.size)

  const setoranQiroahSemua = (qiroah.error ? [] : qiroah.data || []).filter((row) => unitKepalaSekolah(row.unit))
  const setoranQiroah = setoranQiroahSemua.filter((row) => diHariIni(row.tanggal, hari, mulai.getTime()))
  const setoranTahfidzSemua = (tahfidzContoh.error ? [] : tahfidzContoh.data || []).filter((row) =>
    siswaById.has(String(row.id_siswa)),
  )
  const setoranTahfidz = setoranTahfidzSemua.filter((row) => diHariIni(row.tanggal, hari, mulai.getTime()))
  const tahfidzIdHari = [...new Set(setoranTahfidz.map((row) => String(row.id_siswa)))]
  const qiroahIdHari = [
    ...new Set(
      setoranQiroah.map((row) => String(row.id_siswa || '')).filter((id) => id && siswaById.has(id)),
    ),
  ]
  const setoranBulan = {
    tahfidz: setoranTahfidzSemua.map((row) => ({
      id_siswa: String(row.id_siswa),
      tanggal: tanggalJakarta(row.tanggal) || String(row.tanggal || '').slice(0, 10),
    })),
    qiroah: setoranQiroahSemua
      .filter((row) => row.id_siswa && siswaById.has(String(row.id_siswa)))
      .map((row) => ({
        id_siswa: String(row.id_siswa),
        tanggal: tanggalJakarta(row.tanggal) || String(row.tanggal || '').slice(0, 10),
      })),
  }
  if (tahfidzContoh.error) catatan.push('Setoran tahfidz belum dapat dimuat.')
  if (qiroah.error) catatan.push('Setoran qiroah belum dapat dimuat.')
  if (tertib.error) catatan.push('Tertib point belum dapat dimuat.')

  const tertibBulan: BarisTertib[] = (tertib.data || [])
    .filter((row) => unitKepalaSekolah(row.unit))
    .map((row) => {
      const siswa = row.id_siswa ? siswaById.get(String(row.id_siswa)) : undefined
      return {
        id_siswa: String(row.id_siswa || ''),
        nama: siswa?.nama_siswa || 'Siswa',
        kelas: siswa?.kelas || '-',
        label: String(row.label || '').trim() || 'Catatan',
        pts: Number(row.pts || 0),
        guru: String(row.guru || '').trim() || '-',
        waktu: tanggalJakarta(row.created_at),
      } satisfies BarisTertib
    })
    .sort((a, b) => b.waktu.localeCompare(a.waktu) || a.kelas.localeCompare(b.kelas, 'id', { numeric: true }))

  const tertibHariIni = tertibBulan.filter((row) => row.waktu === hari).length

  const bulanKunci = hari.slice(0, 7)
  const labelBulan = new Date(`${hari}T12:00:00`).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
  const pengajuanBulan = (pengajuan || []).filter(
    (row) =>
      unitKepalaSekolah(row.unit) && String(row.tanggal_diajukan || row.tanggal_pelaksanaan || '').slice(0, 7) === bulanKunci,
  )
  const rekapanBulan = (rekapan || []).filter(
    (row) => siswaById.has(String(row.id_siswa)) && String(row.tanggal_ujian || '').slice(0, 7) === bulanKunci,
  )
  const lulusBulan = rekapanBulan.filter((row) => String(row.keputusan || '').trim().toLowerCase() === 'lulus').length
  const mengulangBulan = rekapanBulan.filter((row) => {
    const keputusan = String(row.keputusan || '').trim().toLowerCase()
    if (keputusan && keputusan !== 'lulus') return true
    const predikat = String(row.predikat || '').trim().toLowerCase()
    return predikat.includes('mengulang') || predikat === 'maqbul'
  }).length
  const ujianBulan: StatUjianBulan = {
    label: labelBulan,
    bulan: bulanKunci,
    totalPengajuan: pengajuanBulan.length,
    sudahUjian: rekapanBulan.length,
    lulus: lulusBulan,
    mengulang: mengulangBulan,
  }
  const ujian = (pengajuan || [])
    .filter(
      (row) =>
        unitKepalaSekolah(row.unit) &&
        (menungguJadwal(row.status) || sudahTerjadwal(row.status)) &&
        !cariRekapan(row, rekapan || []),
    )
    .map((row) => ({
      id: String(row.id_pengajuan),
      nama: row.nama_siswa || 'Siswa',
      kelas: row.kelas || '-',
      unit: row.unit || UNIT_KEPALA_SEKOLAH,
      jilid: row.jilid_diujikan || '-',
      pengampu: row.diajukan_oleh || '-',
      penguji: row.nama_penguji || pengujiUntukKelas(row.kelas, row.unit) || '-',
      status: labelStatusPengajuan(row.status),
      tanggal: String(row.tanggal_pelaksanaan || '').slice(0, 10),
      waktu: waktuDariStatus(row.status),
    }))

  const hitungPredikat = new Map(PREDIKAT.map((nama) => [nama, 0]))
  const hasilUjian: RekapLulus[] = []
  const lulus: RekapLulus[] = []
  for (const row of rekapan || []) {
    if (!siswaById.has(String(row.id_siswa))) continue
    const teks = String(row.predikat || '').trim().toLowerCase()
    const normal = teks === 'maqbul' ? 'mengulang' : teks
    const nama = PREDIKAT.find((item) => normal === item.toLowerCase() || normal.startsWith(`${item.toLowerCase()} `) || normal.startsWith(`${item.toLowerCase()}(`)) || 'Lainnya'
    hitungPredikat.set(nama, (hitungPredikat.get(nama) || 0) + 1)
    const baris: RekapLulus = {
      id_ujian: String(row.id_ujian || ''),
      tanggal_ujian: String(row.tanggal_ujian || ''),
      id_siswa: String(row.id_siswa || ''),
      nama: row.nama || 'Siswa',
      kelas: row.kelas || '-',
      unit: UNIT_KEPALA_SEKOLAH,
      guru_pengampu: row.guru_pengampu || '',
      jilid_asal: row.jilid_asal || '',
      jilid_tujuan: row.jilid_tujuan || '',
      penguji: row.penguji || '',
      kelancaran: Number(row.kelancaran || 0),
      makhraj: Number(row.makhraj || 0),
      harakat: Number(row.harakat || 0),
      tajwid: Number(row.tajwid || 0),
      adab: Number(row.adab || 0),
      nilai_akhir: Number(row.nilai_akhir || 0),
      predikat: row.predikat || '-',
      keputusan: row.keputusan || '-',
      kelebihan_siswa: row.kelebihan_siswa || '',
    }
    hasilUjian.push(baris)
    if (String(row.keputusan || '').toLowerCase() === 'lulus' && lulus.length < 40) {
      lulus.push(baris)
    }
  }
  hasilUjian.sort((a, b) => String(b.tanggal_ujian).localeCompare(String(a.tanggal_ujian)))

  const kelasBinaan = (row: { target_id?: string; username?: string }) => {
    const id = String(row.target_id || row.username || '').trim().toUpperCase()
    if (!id) return [] as string[]
    const kelas = new Set<string>()
    for (const siswa of daftarSiswa) {
      const pembimbing = String(siswa.id_pembimbing || '')
        .split(',')
        .map((item) => item.trim().toUpperCase())
      if (!pembimbing.includes(id)) continue
      const kunci = normalKelas(siswa.kelas)
      if (kunci) kelas.add(kunci)
    }
    return [...kelas]
  }

  const barisGuru: BarisGuru[] = guru
    .filter((row) => unitKepalaSekolah(row.unit) && !adalahKepalaSekolah(row))
    .map((row) => {
      const nama = namaGuru(row)
      const kelas = kelasBinaan(row)
      const jurnalSudah = kelas.length ? kelas.some((item) => kelasJurnal.has(item)) : false
      const qiroahSudah = setoranQiroah.some((item) => namaPengujiCocok(nama, item.ustadz))
      return {
        nama,
        unit: UNIT_KEPALA_SEKOLAH,
        jurnal: jurnalSudah ? 'Sudah' : 'Belum',
        qiroah: qiroahSudah ? 'Sudah' : 'Belum',
        tahfidz: 'Tidak tercatat',
      } as BarisGuru
    })
    .sort((a, b) => Number(a.jurnal === 'Sudah') - Number(b.jurnal === 'Sudah') || a.nama.localeCompare(b.nama, 'id'))

  const guruUnik = new Map<string, BarisGuru>()
  for (const row of barisGuru) {
    const kunci = `${row.nama}|${row.unit}`
    const lama = guruUnik.get(kunci)
    if (!lama) {
      guruUnik.set(kunci, row)
      continue
    }
    guruUnik.set(kunci, {
      ...lama,
      jurnal: lama.jurnal === 'Sudah' || row.jurnal === 'Sudah' ? 'Sudah' : 'Belum',
      qiroah: lama.qiroah === 'Sudah' || row.qiroah === 'Sudah' ? 'Sudah' : 'Belum',
      tahfidz: lama.tahfidz === 'Sudah' || row.tahfidz === 'Sudah' ? 'Sudah' : lama.tahfidz === 'Tidak tercatat' ? row.tahfidz : lama.tahfidz,
    })
  }

  const trenMingguan = Array.from({ length: 7 }, (_, index) => {
    const tanggal = new Date(mulai)
    tanggal.setDate(mulai.getDate() - (6 - index))
    const iso = todayInputValue(tanggal)
    const baris = jurnalUnit.filter((row) => String(row.tanggal || '').slice(0, 10) === iso)
    return {
      label: tanggal.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric' }),
      persen: rekapAbsen(baris, jumlahKelas, kenali).persen,
    }
  })

  const hariBulan = Number(hari.slice(8, 10))
  const trenBulanan = [1, 2, 3, 4]
    .filter((minggu) => (minggu - 1) * 7 + 1 <= hariBulan)
    .map((minggu) => {
      const awal = (minggu - 1) * 7 + 1
      const akhir = Math.min(minggu * 7, 31)
      const baris = jurnalUnit.filter((row) => {
        const tanggal = Number(String(row.tanggal || '').slice(8, 10))
        return tanggal >= awal && tanggal <= akhir
      })
      return { label: `Minggu ${minggu}`, persen: rekapAbsen(baris, jumlahKelas, kenali).persen }
    })

  const kelas = Array.from(jumlahKelas.keys()).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))

  const siswaLaporan = daftarSiswa.map(({ id_siswa, nama_siswa, kelas, unit, id_pembimbing }) => ({
    id_siswa,
    nama_siswa,
    kelas,
    unit,
    id_pembimbing,
  }))

  const [raporHqHasil, guruBantu] = await Promise.all([
    muatDataRaporHqKepsek(siswaLaporan).catch((error: Error) => {
      catatan.push('Pemantauan Rapor HQ belum dapat dimuat.')
      console.error(error.message)
      return {
        mentah: {
          ...periodeAjaranSekarang(),
          guruKelas: [],
          headerNilai: [],
        } satisfies DataMentahRaporHq,
        catatan: [] as string[],
      }
    }),
    muatAbsensiGuruBantuKepsek(hari).catch((error: Error) => {
      catatan.push('Absensi guru bantu belum dapat dimuat.')
      console.error(error.message)
      return rekapAbsensiGuruBantuKosong(hari)
    }),
  ])
  catatan.push(...raporHqHasil.catatan)

  const asesmenAwal = 'ASTS I' as const
  const barisRaporHq = hitungPemantauanRaporHq(raporHqHasil.mentah, asesmenAwal)
  const raporHqRingkas = ringkasPemantauanRaporHq(barisRaporHq, asesmenAwal)

  return {
    unit: UNIT_KEPALA_SEKOLAH,
    tanggalLaporan: hari,
    kehadiran: {
      hadir: rekapHari.hadir,
      sakit: rekapHari.sakit,
      izin: rekapHari.izin,
      alpa: rekapHari.alpa,
      kelas: rekapHari.kelas,
    },
    tidakHadir: rekapHari.tidakHadir,
    setoranTahfidz: setoranTahfidz.length,
    setoranQiroah: setoranQiroah.length,
    setoranHariIni: { tanggal: hari, tahfidzId: tahfidzIdHari, qiroahId: qiroahIdHari },
    setoranBulan,
    ujianAktif: ujian.length,
    ujianBulan,
    tertibHariIni,
    tertibBulan,
    trenMingguan,
    trenBulanan,
    jurnalRingkas,
    predikat: Array.from(hitungPredikat.entries()).map(([nama, jumlah]) => ({ nama, jumlah })),
    guru: [...guruUnik.values()],
    ujian,
    hasilUjian,
    lulus,
    siswa: siswaLaporan,
    raporHqMentah: raporHqHasil.mentah,
    raporHqRingkas,
    guruBantu,
    jurnalHariIni,
    jurnalBulan: jurnalUnit,
    kelas,
    catatan,
  }
}

async function muatPengguna(catatan: string[]) {
  const pilihan = ['nama_lengkap,username,unit,role,target_id', 'nama_lengkap,username,unit,role']
  for (const kolom of pilihan) {
    const { data, error } = await supabase.from('users').select(kolom).eq('unit', UNIT_KEPALA_SEKOLAH).limit(500)
    if (!error) return (data || []) as { nama_lengkap?: string; username?: string; unit?: string; role?: string; target_id?: string }[]
  }
  catatan.push('Daftar guru belum dapat dimuat.')
  return []
}
