import { supabase } from '@/lib/supabase'
import { excludeAlumniSiswa, isKelasAlumni, kanonNamaUnit, unitLogin, unitSama } from '@/lib/siswa'

export type JurnalLink = {
  tipe: string
  url: string
}

export type SiswaTidakHadir = {
  nama: string
  keterangan: string
  id_siswa?: string
}

export type SiswaKelas = {
  id_siswa: string
  nama_siswa: string
  kelas: string
  unit?: string
}

export type JurnalJam = {
  mapel: string
  materi: string
  kegiatan: string
  links: JurnalLink[]
  hadir: string
  absen: string
  siswaTidakHadir: SiswaTidakHadir[]
  ttd: string | null
  tugas: string
  guru?: string
}

export type JadwalItem = {
  j?: number
  w: string
  r?: string
  k?: number
}

export const JADWAL_PELAJARAN: JadwalItem[] = [
  { j: 1, w: '07.00 - 07.35' },
  { j: 2, w: '07.35 - 08.10' },
  { j: 3, w: '08.10 - 08.45' },
  { j: 4, w: '08.45 - 09.20' },
  { r: 'ISTIRAHAT I', w: '09.20 - 09.40' },
  { j: 5, w: '09.40 - 10.15' },
  { j: 6, w: '10.15 - 10.50' },
  { j: 7, w: '10.50 - 11.25' },
  { r: 'ISTIRAHAT II', w: '11.25 - 12.25' },
  { j: 8, w: '12.25 - 13.00' },
  { j: 9, w: '13.00 - 13.35' },
  { j: 10, w: '13.35 - 14.10' },
  { r: 'QAILULAH', w: '14.10 - 14.50', k: 1 },
  { r: 'SHOLAT ASHAR', w: '14.50 - 15.25', k: 1 },
  { j: 11, w: '15.25 - 16.00', k: 1 },
]

export const NAMA_HARI = ['Ahad', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']

export const DAFTAR_MAPEL = [
  "Qiro'atul Quran",
  "Hafalan Al Qur'an",
  'Hafalan Hadits',
  'Hadits Siroh',
  'Tajwid',
  'Aqidah',
  'Fikih Akhlak',
  'Bahasa Arab',
  'Bahasa Indonesia',
  'Bahasa Jawa',
  'Matematika',
  'IPAS',
  'PKn',
  'Bahasa Inggris',
  'TIK',
  'Coding',
  'PJOK',
  'SBdP',
]

export const TIPE_LINK: [string, string][] = [
  ['video', 'Video'],
  ['ppt', 'PPT'],
  ['canva', 'Canva'],
  ['notebook', 'Notebook'],
  ['lain', 'Lainnya'],
]

export const KETERANGAN_ABSEN = ['Sakit', 'Izin', 'Alpa'] as const

export const JURNAL_FIELDS =
  'id,kelas,tanggal,jam,semester,mapel,materi,kegiatan,links,hadir,tidak_hadir,siswa_tidak_hadir,ttd,tugas,guru'

export const JURNAL_FIELDS_TANPA_GURU =
  'id,kelas,tanggal,jam,semester,mapel,materi,kegiatan,links,hadir,tidak_hadir,siswa_tidak_hadir,ttd,tugas'

let kolomGuruTersedia: boolean | null = null

export function kolomGuruTidakAda(error?: { code?: string; message?: string } | null) {
  const pesan = String(error?.message || '').toLowerCase()
  return (
    error?.code === 'PGRST204' ||
    error?.code === '42703' ||
    (pesan.includes('guru') && pesan.includes('does not exist'))
  )
}

function bidangJurnal(): string {
  return kolomGuruTersedia === false ? JURNAL_FIELDS_TANPA_GURU : JURNAL_FIELDS
}

function catatKolomGuru(error?: { code?: string; message?: string } | null, baris?: { guru?: unknown }[] | null) {
  if (kolomGuruTidakAda(error)) {
    kolomGuruTersedia = false
    return
  }
  if (baris && baris.some((row) => Object.prototype.hasOwnProperty.call(row, 'guru'))) {
    kolomGuruTersedia = true
  }
}

function tanpaKolomGuru<T extends { guru?: unknown }>(rows: T[]) {
  return rows.map(({ guru: _guru, ...row }) => row)
}

export function emptyJurnalJam(hadirDefault = ''): JurnalJam {
  return {
    mapel: '',
    materi: '',
    kegiatan: '',
    links: [],
    hadir: hadirDefault,
    absen: '0',
    siswaTidakHadir: [],
    ttd: null,
    tugas: '',
    guru: '',
  }
}

export function jamHariIni(date: Date): JadwalItem[] | null {
  const hari = date.getDay()
  if (hari === 5 || hari === 0) return null
  const maks = hari === 6 ? 10 : 11
  return JADWAL_PELAJARAN.filter((item) => !(item.k && maks === 10))
}

export function defaultSemester(date = new Date()) {
  const month = date.getMonth() + 1
  return month >= 7 ? '1' : '2'
}

export function todayInputValue(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function teacherUnit(currentUser?: any) {
  const unit = String(currentUser?.unit || '').trim()
  if (!unit || unit === 'Semua Unit') return ''
  return unit
}

const PEMISAH_KELAS_UNIT = '::'
const UMUR_KONTEKS_JURNAL = 5 * 60 * 1000

type KonteksJurnal = { idSiswa: Set<string>; namaGuru: Set<string> }
const cacheKonteksJurnal = new Map<string, { at: number; data: KonteksJurnal }>()

/** Nama kelas yang tampil di layar. Awalan unit hanya dipakai di penyimpanan. */
export function kelasJurnalTampil(kelas?: string | null) {
  const teks = String(kelas || '').trim()
  const batas = teks.indexOf(PEMISAH_KELAS_UNIT)
  if (batas <= 0) return teks
  return teks.slice(batas + PEMISAH_KELAS_UNIT.length).trim()
}

/** Kelas disimpan bersama unit agar 1A Kartasura tidak menimpa 1A unit lain. */
export function kelasJurnalSimpan(kelas: string, unit?: string | null) {
  const tampil = kelasJurnalTampil(kelas)
  const kunci = kanonNamaUnit(unit)
  if (!kunci || !tampil) return tampil
  return `${kunci}${PEMISAH_KELAS_UNIT}${tampil}`
}

function unitDariKelasJurnal(kelas?: string | null) {
  const teks = String(kelas || '').trim()
  const batas = teks.indexOf(PEMISAH_KELAS_UNIT)
  if (batas <= 0) return ''
  return kanonNamaUnit(teks.slice(0, batas))
}

function normNamaOrang(nilai: unknown) {
  return String(nilai ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function idAbsenPadaBaris(row: { siswa_tidak_hadir?: unknown }) {
  return normalizeSiswaTidakHadir(row.siswa_tidak_hadir)
    .map((item) => String(item.id_siswa || '').trim())
    .filter(Boolean)
}

export function barisJurnalMilikUnit(
  row: { kelas?: string | null; guru?: string | null; siswa_tidak_hadir?: unknown },
  unit: string,
  konteks: KonteksJurnal,
) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return false
  const tertanda = unitDariKelasJurnal(row.kelas)
  if (tertanda) return unitSama(tertanda, kunci)
  const ids = idAbsenPadaBaris(row)
  if (ids.length > 0) {
    return ids.every((id) => konteks.idSiswa.has(id))
  }
  const guru = normNamaOrang(row.guru)
  return Boolean(guru && konteks.namaGuru.has(guru))
}

function normalkanKelasJurnal<T extends { kelas?: string | null }>(row: T): T {
  return { ...row, kelas: kelasJurnalTampil(row.kelas) }
}

async function konteksJurnalUnit(unit: string): Promise<KonteksJurnal | null> {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return null
  const ada = cacheKonteksJurnal.get(kunci)
  if (ada && Date.now() - ada.at < UMUR_KONTEKS_JURNAL) return ada.data

  const idSiswa = new Set<string>()
  let from = 0
  while (true) {
    const { data, error } = await supabase.from('siswa').select('id_siswa').ilike('unit', `%${kunci}%`).range(from, from + 999)
    if (error || !data) break
    for (const row of data) {
      const id = String(row.id_siswa || '').trim()
      if (id) idSiswa.add(id)
    }
    if (data.length < 1000) break
    from += 1000
  }

  const { data: pengguna } = await supabase.from('users').select('nama_lengkap,unit').limit(1000)
  const hitung = new Map<string, Set<string>>()
  for (const row of pengguna || []) {
    const nama = normNamaOrang(row.nama_lengkap)
    const unitBaris = kanonNamaUnit(String(row.unit || ''))
    if (!nama || !unitBaris) continue
    const daftar = hitung.get(nama) || new Set<string>()
    daftar.add(unitBaris)
    hitung.set(nama, daftar)
  }
  const namaGuru = new Set<string>()
  for (const [nama, daftar] of hitung) {
    if (daftar.size === 1 && daftar.has(kunci)) namaGuru.add(nama)
  }

  const data = { idSiswa, namaGuru }
  cacheKonteksJurnal.set(kunci, { at: Date.now(), data })
  return data
}

/** Buang jurnal unit lain. Baris tanpa penanda unit tidak dipakai sebagai pengganti. */
export async function saringJurnalUntukUnit<
  T extends { kelas?: string | null; guru?: string | null; siswa_tidak_hadir?: unknown },
>(rows: T[], unit?: string | null) {
  const kunci = kanonNamaUnit(unit)
  if (!kunci) return rows.map(normalkanKelasJurnal)
  const konteks = await konteksJurnalUnit(kunci)
  if (!konteks) return []
  return rows.filter((row) => barisJurnalMilikUnit(row, kunci, konteks)).map(normalkanKelasJurnal)
}

function kelasDicari(kelas: string, unit?: string | null) {
  const tampil = kelasJurnalTampil(kelas)
  const simpan = kelasJurnalSimpan(tampil, unit)
  return simpan === tampil ? [tampil] : [tampil, simpan]
}

export function teacherName(currentUser?: any) {
  return currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username || 'Guru'
}

export function teacherNip(currentUser?: any) {
  const nip = currentUser?.nip ?? currentUser?.NIP ?? currentUser?.nip_guru ?? ''
  return String(nip || '').trim()
}

export function saringAbsenKelas(
  absen: SiswaTidakHadir[],
  roster?: { id_siswa?: string; nama_siswa?: string }[] | null,
): SiswaTidakHadir[] {
  const bersih = absen.filter((item) => item.nama)
  if (!roster || roster.length === 0) return bersih

  const ids = new Set(roster.map((siswa) => String(siswa.id_siswa || '').trim()).filter(Boolean))
  const names = new Set(
    roster.map((siswa) => String(siswa.nama_siswa || '').trim().toLowerCase()).filter(Boolean),
  )

  return bersih.filter((item) => {
    const id = String(item.id_siswa || '').trim()
    if (id) return ids.has(id)
    return names.has(item.nama.trim().toLowerCase())
  })
}

function punyaDaftarAbsen(value: unknown) {
  if (Array.isArray(value)) return true
  return typeof value === 'string' && value.trim() !== ''
}

export function hitungKehadiran(totalSiswa: number, absen: SiswaTidakHadir[], absenManual?: string) {
  const dariDaftar = absen.length
  if (dariDaftar > 0) {
    return { hadir: Math.max(0, totalSiswa - dariDaftar), tidakHadir: dariDaftar }
  }
  if (absenManual == null || absenManual === '') {
    return { hadir: Math.max(0, totalSiswa), tidakHadir: 0 }
  }
  const manual = Number(absenManual)
  const tidakHadir = Number.isFinite(manual) && manual > 0 ? manual : 0
  return { hadir: Math.max(0, totalSiswa - tidakHadir), tidakHadir }
}

export function jamAktifDariJadwal(jadwal: JadwalItem[] | null): number[] {
  if (!jadwal) return []
  return jadwal.map((item) => item.j).filter((j): j is number => typeof j === 'number')
}

function kunciEntriAbsenSiswa(item: SiswaTidakHadir) {
  const id = String(item.id_siswa || '').trim()
  if (id) return `id:${id}`
  return `nama:${item.nama.trim().toLowerCase()}`
}

export function guruJurnalSama(a?: string | null, b?: string | null) {
  const rapikan = (nilai?: string | null) =>
    normNamaOrang(nilai)
      .replace(/\bs\s*pd\s*i?\b/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  const kiri = rapikan(a)
  const kanan = rapikan(b)
  if (!kiri || !kanan) return false
  if (kiri === kanan) return true
  const pendek = kiri.length <= kanan.length ? kiri : kanan
  const panjang = kiri.length <= kanan.length ? kanan : kiri
  return pendek.length >= 8 && panjang.includes(pendek)
}

function jurnalJamAdaIsi(entry?: JurnalJam | null) {
  if (!entry) return false
  return Boolean(
    entry.mapel?.trim() ||
      entry.materi?.trim() ||
      entry.kegiatan?.trim() ||
      entry.tugas?.trim() ||
      entry.ttd ||
      (entry.links || []).some((link) => link.url?.trim()),
  )
}

/** Jam tanpa isi sendiri, yang hanya menyalin absen Jam ke-1, tetap terbuka untuk guru lain. */
export function slotJurnalTerbuka(entry: JurnalJam | undefined, jam: number, entries: Record<number, JurnalJam>) {
  if (!entry || !String(entry.guru || '').trim()) return true
  if (jurnalJamAdaIsi(entry)) return false
  if (jam !== 1) {
    const sumber = entries[1]
    if (
      sumber &&
      guruJurnalSama(sumber.guru, entry.guru) &&
      daftarAbsenSetara(sumber.siswaTidakHadir || [], entry.siswaTidakHadir || [])
    ) {
      return true
    }
  }
  if ((entry.siswaTidakHadir || []).length > 0) return false
  return jam !== 1
}

export function daftarAbsenSetara(a: SiswaTidakHadir[], b: SiswaTidakHadir[]): boolean {
  const keMap = (list: SiswaTidakHadir[]) => {
    const map = new Map<string, string>()
    for (const item of list) map.set(kunciEntriAbsenSiswa(item), item.keterangan)
    return map
  }
  const ma = keMap(a)
  const mb = keMap(b)
  if (ma.size !== mb.size) return false
  for (const [kunci, ket] of ma) {
    if (mb.get(kunci) !== ket) return false
  }
  return true
}

/** Jam yang punya daftar absen berbeda dari Jam ke-1 (atau jam pertama hari itu). */
export function deteksiJamAbsenKustom(entries: Record<number, JurnalJam>, jamAktif: number[]): Set<number> {
  const kustom = new Set<number>()
  const jamSumber = jamAktif.includes(1) ? 1 : jamAktif[0]
  if (jamSumber == null) return kustom
  const referensi = entries[jamSumber]?.siswaTidakHadir || []
  for (const jam of jamAktif) {
    if (jam === jamSumber) continue
    const daftar = entries[jam]?.siswaTidakHadir || []
    if (!daftarAbsenSetara(referensi, daftar)) kustom.add(jam)
  }
  return kustom
}

/**
 * Salin absensi dari Jam ke-1 (atau jam pertama) ke jam lain pada hari yang sama.
 * Jam yang ada di `jamDikecualikan` tidak ditimpa (edit khusus per jam).
 */
export function salinAbsenJamPertama(
  entries: Record<number, JurnalJam>,
  jamAktif: number[],
  totalSiswa: number,
  jamDikecualikan: ReadonlySet<number> = new Set(),
): Record<number, JurnalJam> {
  const jamSumber = jamAktif.includes(1) ? 1 : jamAktif[0]
  if (jamSumber == null) return entries
  const sumber = entries[jamSumber]
  if (!sumber) return entries

  const daftarSalin = (sumber.siswaTidakHadir || []).map((item) => ({ ...item }))
  const rekap = hitungKehadiran(totalSiswa, daftarSalin)
  const next: Record<number, JurnalJam> = { ...entries }

  for (const jam of jamAktif) {
    if (jam === jamSumber || jamDikecualikan.has(jam)) continue
    const existing = next[jam] || emptyJurnalJam(String(totalSiswa))
    next[jam] = {
      ...existing,
      siswaTidakHadir: daftarSalin.map((item) => ({ ...item })),
      hadir: String(rekap.hadir),
      absen: String(rekap.tidakHadir),
    }
  }
  return next
}

export function rekapBarisJurnal(
  row: { hadir?: unknown; tidak_hadir?: unknown; siswa_tidak_hadir?: unknown },
  totalSiswa = 0,
  roster?: SiswaKelas[] | null,
) {
  const daftar = saringAbsenKelas(normalizeSiswaTidakHadir(row.siswa_tidak_hadir), roster)
  const { hadir, tidakHadir } = hitungKehadiran(
    totalSiswa,
    daftar,
    punyaDaftarAbsen(row.siswa_tidak_hadir) ? undefined : row.tidak_hadir == null ? '' : String(row.tidak_hadir),
  )
  return { daftar, hadir, tidakHadir }
}

export async function fetchKelasDanJumlahSiswa(currentUser?: any) {
  const unit = unitLogin(currentUser) || teacherUnit(currentUser)
  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  while (true) {
    let query = supabase
      .from('siswa')
      .select('kelas,unit')
      .not('kelas', 'ilike', '%Alumni%')
      .range(from, from + pageSize - 1)

    if (unit) query = query.eq('unit', unit)

    const { data, error } = await query

    if (error) {
      console.error('Gagal mengambil data siswa:', error.message)
      break
    }

    const rows = excludeAlumniSiswa(data || [])
    for (const row of rows) {
      if (unit && !unitSama(row.unit, unit)) continue
      const kelas = String(row.kelas || '').trim()
      if (!kelas || isKelasAlumni(kelas)) continue
      counts.set(kelas, (counts.get(kelas) || 0) + 1)
    }

    if (rows.length < pageSize) break
    from += pageSize
  }

  const { data: kelasRows, error: kelasError } = await supabase
    .from('kelas')
    .select('nama')
    .order('nama', { ascending: true })

  if (kelasError) {
    console.error('Gagal mengambil daftar kelas:', kelasError.message)
  }

  const fromTable = (kelasRows || [])
    .map((row) => String(row.nama || '').trim())
    .filter((nama) => nama && !isKelasAlumni(nama))
  const classes = fromTable.length > 0 ? fromTable : Array.from(counts.keys()).sort()

  return {
    classes,
    counts: Object.fromEntries(counts) as Record<string, number>,
  }
}

export async function fetchSiswaKelas(kelas: string, currentUser?: any): Promise<SiswaKelas[]> {
  if (!kelas) return []
  const unit = unitLogin(currentUser) || teacherUnit(currentUser)
  const { data, error } = await supabase
    .from('siswa')
    .select('id_siswa,nama_siswa,kelas,unit')
    .eq('kelas', kelas)
    .order('nama_siswa', { ascending: true })
    .limit(300)

  if (error) {
    console.error('Gagal mengambil siswa kelas:', error.message)
    return []
  }

  const rows = excludeAlumniSiswa((data || []) as SiswaKelas[])
  const milik = rows.filter((row) => {
    if (isKelasAlumni(row.kelas)) return false
    if (!unit) return true
    return unitSama(row.unit, unit)
  })
  return milik
}

export async function fetchJurnalHari(kelas: string, tanggal: string, unit?: string | null) {
  const daftarKelas = kelasDicari(kelas, unit)
  const pertama =
    kolomGuruTersedia === false
      ? await supabase.from('jurnal_pembelajaran').select(JURNAL_FIELDS_TANPA_GURU).in('kelas', daftarKelas).eq('tanggal', tanggal)
      : await supabase.from('jurnal_pembelajaran').select(JURNAL_FIELDS).in('kelas', daftarKelas).eq('tanggal', tanggal)

  if (!pertama.error) {
    catatKolomGuru(null, (pertama.data || []) as { guru?: unknown }[])
    const mentah = gabungBarisJurnalPerJam((pertama.data || []) as any[], unit)
    const rows = unit
      ? await saringJurnalUntukUnit(mentah, unit)
      : mentah.map(normalkanKelasJurnal)
    return { rows, error: null }
  }

  if (!kolomGuruTidakAda(pertama.error)) return { rows: [] as any[], error: pertama.error }

  kolomGuruTersedia = false
  const cadangan = await supabase
    .from('jurnal_pembelajaran')
    .select(JURNAL_FIELDS_TANPA_GURU)
    .in('kelas', daftarKelas)
    .eq('tanggal', tanggal)

  if (cadangan.error) return { rows: [] as any[], error: cadangan.error }
  const mentah = gabungBarisJurnalPerJam((cadangan.data || []) as any[], unit)
  const rows = unit
    ? await saringJurnalUntukUnit(mentah, unit)
    : mentah.map(normalkanKelasJurnal)
  return { rows, error: null }
}

export async function fetchJurnalRentang(opts: {
  kelas?: string
  start: string
  end: string
  semester?: string
  unit?: string | null
}) {
  const pageSize = 1000
  const all: any[] = []
  let from = 0

  while (true) {
    const kolom = bidangJurnal()
    let query = supabase
      .from('jurnal_pembelajaran')
      .select(kolom as typeof JURNAL_FIELDS)
      .gte('tanggal', opts.start)
      .lte('tanggal', opts.end)
      .order('tanggal', { ascending: true })
      .range(from, from + pageSize - 1)

    if (opts.kelas) query = query.in('kelas', kelasDicari(opts.kelas, opts.unit))
    if (opts.semester) query = query.eq('semester', Number(opts.semester))

    let { data, error } = await query
    if (error && kolomGuruTidakAda(error)) {
      kolomGuruTersedia = false
      let ulang = supabase
        .from('jurnal_pembelajaran')
        .select(JURNAL_FIELDS_TANPA_GURU)
        .gte('tanggal', opts.start)
        .lte('tanggal', opts.end)
        .order('tanggal', { ascending: true })
        .range(from, from + pageSize - 1)
      if (opts.kelas) ulang = ulang.in('kelas', kelasDicari(opts.kelas, opts.unit))
      if (opts.semester) ulang = ulang.eq('semester', Number(opts.semester))
      const cadangan = await ulang
      data = cadangan.data as typeof data
      error = cadangan.error
    }
    if (error) return { rows: all, error }
    catatKolomGuru(null, (data || []) as { guru?: unknown }[])

    const rows = data || []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }

  const mentah = opts.unit ? await saringJurnalUntukUnit(all, opts.unit) : all.map(normalkanKelasJurnal)
  const rows = gabungBarisJurnalPerSlot(mentah, opts.unit)
  return { rows, error: null }
}

const KOLOM_KEHADIRAN = 'tanggal,jam,kelas,semester,mapel,hadir,tidak_hadir,siswa_tidak_hadir'
const KOLOM_JURNAL_RINGKAS = 'tanggal,jam,kelas,mapel,materi,kegiatan,tugas,siswa_tidak_hadir'

function barisKelasUnitCocok(
  row: { kelas?: string | null },
  opts: { kelas?: string; unit?: string | null; kelasDikenal?: string[] },
) {
  const mentah = String(row.kelas || '')
  const tampil = kelasJurnalTampil(mentah)
  if (opts.kelas && tampil !== kelasJurnalTampil(opts.kelas)) return false
  const dari = unitDariKelasJurnal(mentah)
  if (opts.unit && dari) return unitSama(dari, opts.unit)
  if (opts.unit && !dari && !opts.kelas) {
    const dikenal = new Set((opts.kelasDikenal || []).map((nama) => kelasJurnalTampil(nama)))
    if (dikenal.size > 0) return dikenal.has(tampil)
  }
  return true
}

/** Rekap absensi: satu kelas + rentang tanggal, tanpa kolom TTD/tautan dan tanpa pindai seluruh siswa. */
export async function fetchJurnalKehadiran(opts: {
  kelas?: string
  start: string
  end: string
  semester?: string
  unit?: string | null
  kelasDikenal?: string[]
}) {
  if (!opts.start || !opts.end) return { rows: [] as any[], error: null }
  const pageSize = 400
  const batas = opts.kelas ? 2000 : 1600
  const all: any[] = []
  let from = 0

  while (from < batas) {
    let query = supabase
      .from('jurnal_pembelajaran')
      .select(KOLOM_KEHADIRAN)
      .gte('tanggal', opts.start)
      .lte('tanggal', opts.end)
      .order('tanggal', { ascending: true })
      .order('jam', { ascending: true })
      .range(from, from + pageSize - 1)

    if (opts.kelas) query = query.in('kelas', kelasDicari(opts.kelas, opts.unit))
    if (opts.semester) query = query.eq('semester', Number(opts.semester))

    const { data, error } = await query
    if (error) return { rows: [] as any[], error }
    const batch = data || []
    all.push(...batch)
    if (batch.length < pageSize) break
    from += pageSize
  }

  const milik = all.filter((row) => barisKelasUnitCocok(row, opts))
  return { rows: gabungBarisJurnalPerSlot(milik, opts.unit), error: null }
}

/** Riwayat jurnal satu kelas untuk wali: kolom teks saja, dibatasi tanggal. */
export async function fetchJurnalRingkasKelas(opts: {
  kelas: string
  start: string
  end: string
  unit?: string | null
}) {
  if (!opts.kelas || !opts.start || !opts.end) return { rows: [] as any[], error: null }
  const { data, error } = await supabase
    .from('jurnal_pembelajaran')
    .select(KOLOM_JURNAL_RINGKAS)
    .in('kelas', kelasDicari(opts.kelas, opts.unit))
    .gte('tanggal', opts.start)
    .lte('tanggal', opts.end)
    .order('tanggal', { ascending: false })
    .order('jam', { ascending: true })
    .limit(150)

  if (error) return { rows: [] as any[], error }
  const milik = (data || []).filter((row) => barisKelasUnitCocok(row, opts))
  return { rows: gabungBarisJurnalPerSlot(milik, opts.unit), error: null }
}

function normalizeLinks(value: unknown): JurnalLink[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        tipe: String(item?.tipe || 'video'),
        url: String(item?.url || '').trim(),
      }))
      .filter((item) => item.url || item.tipe)
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeLinks(JSON.parse(value))
    } catch {
      return [{ tipe: 'lain', url: value.trim() }]
    }
  }

  return []
}

export function normalizeSiswaTidakHadir(value: unknown): SiswaTidakHadir[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        nama: String(item?.nama || '').trim(),
        keterangan: String(item?.keterangan || 'Alpa').trim() || 'Alpa',
        id_siswa: item?.id_siswa ? String(item.id_siswa) : undefined,
      }))
      .filter((item) => item.nama)
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      return normalizeSiswaTidakHadir(JSON.parse(value))
    } catch {
      return []
    }
  }

  return []
}

function isiBarisJurnal(row: Record<string, unknown>) {
  return Boolean(row.mapel || row.materi || row.kegiatan || row.tugas || row.guru || row.nama_guru)
}

function skorBarisJurnalDb(row: Record<string, unknown>, unit?: string | null) {
  const links = Array.isArray(row.links) ? row.links.length : 0
  let poin =
    (String(row.mapel || '').trim() ? 1 : 0) +
    (String(row.materi || '').trim() ? 1 : 0) +
    (String(row.kegiatan || '').trim() ? 1 : 0) +
    (String(row.tugas || '').trim() ? 1 : 0) +
    (String(row.guru || row.nama_guru || '').trim() ? 1 : 0) +
    links
  const dari = unitDariKelasJurnal(String(row.kelas || ''))
  const kunci = kanonNamaUnit(unit)
  if (kunci && dari && unitSama(dari, kunci)) poin += 8
  else if (kunci && !dari) poin += 1
  return poin
}

function barisJurnalLebihBaik(a: Record<string, unknown>, b: Record<string, unknown>, unit?: string | null) {
  const sa = skorBarisJurnalDb(a, unit)
  const sb = skorBarisJurnalDb(b, unit)
  if (sa !== sb) return sa > sb ? a : b
  const kunci = kanonNamaUnit(unit)
  const pa = Boolean(kunci && unitDariKelasJurnal(String(a.kelas || '')) && unitSama(unitDariKelasJurnal(String(a.kelas || '')), kunci))
  const pb = Boolean(kunci && unitDariKelasJurnal(String(b.kelas || '')) && unitSama(unitDariKelasJurnal(String(b.kelas || '')), kunci))
  if (pa !== pb) return pa ? a : b
  return isiBarisJurnal(a) ? a : b
}

function kunciSlotJurnal(row: Record<string, unknown>) {
  const tanggal = String(row.tanggal || '').slice(0, 10)
  const kelas = kelasJurnalTampil(String(row.kelas || ''))
  const jam = Number(row.jam)
  if (!tanggal || !kelas || !Number.isFinite(jam)) return ''
  return `${tanggal}|${kelas.toLowerCase()}|${jam}`
}

/** Satu slot jam = satu baris; hindari ganda 1C + Nogosari::1C. */
export function gabungBarisJurnalPerJam(rows: Record<string, unknown>[], unit?: string | null) {
  const map = new Map<number, Record<string, unknown>>()
  for (const row of rows) {
    const jam = Number(row.jam)
    if (!Number.isFinite(jam)) continue
    const ada = map.get(jam)
    map.set(jam, ada ? barisJurnalLebihBaik(ada, row, unit) : row)
  }
  return [...map.values()]
}

/** Satu tanggal + kelas + jam = satu baris (dashboard Kepsek & rentang bulan). */
export function gabungBarisJurnalPerSlot<T extends { kelas?: string | null; tanggal?: unknown; jam?: unknown }>(
  rows: T[],
  unit?: string | null,
): T[] {
  const map = new Map<string, T>()
  for (const row of rows) {
    const kunci = kunciSlotJurnal(row as Record<string, unknown>)
    if (!kunci) continue
    const ada = map.get(kunci)
    map.set(
      kunci,
      ada ? (barisJurnalLebihBaik(ada as Record<string, unknown>, row as Record<string, unknown>, unit) as T) : row,
    )
  }
  return [...map.values()].map((row) => normalkanKelasJurnal(row))
}

async function bersihkanDuplikatJurnalSlot(opts: {
  kelas: string
  tanggal: string
  jam: number
  unit?: string | null
}) {
  const variasi = kelasDicari(opts.kelas, opts.unit)
  const kelasCan = kelasJurnalSimpan(kelasJurnalTampil(opts.kelas), opts.unit)
  const { data, error } = await supabase
    .from('jurnal_pembelajaran')
    .select('id,kelas,mapel,materi,kegiatan,tugas,guru,links')
    .eq('tanggal', opts.tanggal)
    .eq('jam', opts.jam)
    .in('kelas', variasi)
  if (error || !data?.length) return

  type BarisDuplikat = (typeof data)[number]
  let pertahankan: BarisDuplikat | undefined = data.find((row) => String(row.kelas || '') === kelasCan)
  if (!pertahankan) {
    pertahankan = data.slice(1).reduce<BarisDuplikat>((terbaik, row) => {
      return barisJurnalLebihBaik(terbaik as Record<string, unknown>, row as Record<string, unknown>, opts.unit) as BarisDuplikat
    }, data[0])
  }
  const idPertahankan = String(pertahankan?.id || '')
  const hapus = data.filter((row) => String(row.id) !== idPertahankan).map((row) => String(row.id))
  if (hapus.length === 0) return
  await supabase.from('jurnal_pembelajaran').delete().in('id', hapus)
}

export function rowsToEntries(rows: any[], totalSiswa = 0, kelasSiswaList?: SiswaKelas[]): Record<number, JurnalJam> {
  const entries: Record<number, JurnalJam> = {}
  for (const row of gabungBarisJurnalPerJam(rows)) {
    const jam = Number(row.jam)
    if (!Number.isFinite(jam)) continue
    const baris = row as any
    const { daftar, hadir, tidakHadir } = rekapBarisJurnal(baris, totalSiswa, kelasSiswaList)
    entries[jam] = {
      mapel: baris.mapel || '',
      materi: baris.materi || '',
      kegiatan: baris.kegiatan || '',
      links: normalizeLinks(baris.links),
      hadir: String(hadir),
      absen: String(tidakHadir),
      siswaTidakHadir: daftar,
      ttd: baris.ttd || null,
      tugas: baris.tugas || '',
      guru: baris.guru || baris.nama_guru || '',
    }
  }
  return entries
}

export async function simpanJurnalHari(payload: {
  kelas: string
  tanggal: string
  semester: number
  totalSiswa: number
  entries: Record<number, JurnalJam>
  guru?: string
  unit?: string
  roster?: SiswaKelas[]
  jamDisimpan?: number[]
}) {
  const jamKeys = payload.jamDisimpan?.length
    ? payload.jamDisimpan.map((jam) => String(jam))
    : Object.keys(payload.entries)

  const rows = jamKeys
    .map((jamKey) => {
      const entry = payload.entries[Number(jamKey)]
      if (!entry) return null
      const siswaTidakHadir = saringAbsenKelas(entry.siswaTidakHadir || [], payload.roster)
      const { hadir, tidakHadir } = hitungKehadiran(payload.totalSiswa, siswaTidakHadir)
      return {
        kelas: kelasJurnalSimpan(payload.kelas, payload.unit),
        tanggal: payload.tanggal,
        jam: Number(jamKey),
        semester: payload.semester,
        mapel: entry.mapel || '',
        materi: entry.materi || '',
        kegiatan: entry.kegiatan || '',
        links: (entry.links || []).filter((link) => link.url),
        hadir,
        tidak_hadir: tidakHadir,
        siswa_tidak_hadir: siswaTidakHadir,
        ttd: entry.ttd || null,
        tugas: entry.tugas || '',
        guru: entry.guru || payload.guru || '',
      }
    })
    .filter((row): row is NonNullable<typeof row> => Boolean(row))

  if (rows.length === 0) return { error: null }

  const payloadBaris = kolomGuruTersedia === false ? tanpaKolomGuru(rows) : rows
  const { error } = await supabase.from('jurnal_pembelajaran').upsert(payloadBaris, {
    onConflict: 'kelas,tanggal,jam',
  })

  if (error && kolomGuruTidakAda(error)) {
    kolomGuruTersedia = false
    const ulang = await supabase.from('jurnal_pembelajaran').upsert(tanpaKolomGuru(rows), {
      onConflict: 'kelas,tanggal,jam',
    })
    return { error: ulang.error }
  }

  if (!error) {
    kolomGuruTersedia = kolomGuruTersedia === false ? false : true
    for (const jamKey of jamKeys) {
      await bersihkanDuplikatJurnalSlot({
        kelas: payload.kelas,
        tanggal: payload.tanggal,
        jam: Number(jamKey),
        unit: payload.unit,
      })
    }
  }
  return { error }
}

export function monthRange(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const last = new Date(year, month, 0).getDate()
  const end = `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`
  return { start, end }
}

export function semesterRange(year: number, semester: string) {
  if (semester === '2') {
    return { start: `${year}-01-01`, end: `${year}-06-30` }
  }
  return { start: `${year}-07-01`, end: `${year}-12-31` }
}

export type SimbolHadir = '' | '•' | 'S' | 'I' | 'A'

export type BarisMatriksAbsen = {
  key: string
  nama: string
  simbol: SimbolHadir[]
  sakit: number
  izin: number
  alpa: number
  hadir: number
  persen: number | null
}

export function jenisAbsen(value: string): 'sakit' | 'izin' | 'alpa' {
  const key = value.toLowerCase()
  if (key.includes('sakit')) return 'sakit'
  if (key.includes('izin')) return 'izin'
  return 'alpa'
}

export function hariLiburSekolah(year: number, month: number, day: number) {
  const hari = new Date(year, month - 1, day).getDay()
  return hari === 0 || hari === 5
}

const RANK_ABSEN = { alpa: 3, sakit: 2, izin: 1 } as const
const SIMBOL_ABSEN = { sakit: 'S', izin: 'I', alpa: 'A' } as const

export function buildRekapMatriks(opts: {
  bulan: string
  rows: { tanggal?: string; siswa_tidak_hadir?: unknown }[]
  siswa: { id_siswa: string; nama_siswa: string }[]
}) {
  const [year, month] = opts.bulan.split('-').map(Number)
  const jumlahHari = year && month ? new Date(year, month, 0).getDate() : 0
  const libur = Array.from({ length: jumlahHari }, (_, index) => hariLiburSekolah(year, month, index + 1))
  const hariDenganData = new Set<number>()
  const absenHari = new Map<number, Map<string, 'S' | 'I' | 'A'>>()
  const rankHari = new Map<number, Map<string, number>>()

  for (const row of opts.rows) {
    const iso = String(row.tanggal || '').slice(0, 10)
    if (iso.slice(0, 7) !== opts.bulan) continue
    const day = Number(iso.slice(8, 10))
    if (!day || day > jumlahHari) continue
    hariDenganData.add(day)

    for (const item of normalizeSiswaTidakHadir(row.siswa_tidak_hadir)) {
      const jenis = jenisAbsen(item.keterangan)
      const simbol = SIMBOL_ABSEN[jenis]
      const rank = RANK_ABSEN[jenis]
      if (!absenHari.has(day)) absenHari.set(day, new Map())
      if (!rankHari.has(day)) rankHari.set(day, new Map())
      const simbolMap = absenHari.get(day)!
      const rankMap = rankHari.get(day)!
      const keys = [
        item.id_siswa ? `id:${item.id_siswa}` : '',
        item.nama ? `nama:${item.nama.trim().toLowerCase()}` : '',
      ].filter(Boolean)

      for (const key of keys) {
        if (rank < (rankMap.get(key) || 0)) continue
        rankMap.set(key, rank)
        simbolMap.set(key, simbol)
      }
    }
  }

  const hariEfektif = hariDenganData.size
  const baris: BarisMatriksAbsen[] = opts.siswa.map((siswa) => {
    const idKey = siswa.id_siswa ? `id:${String(siswa.id_siswa)}` : ''
    const namaKey = `nama:${String(siswa.nama_siswa || '').trim().toLowerCase()}`
    let sakit = 0
    let izin = 0
    let alpa = 0
    let hadir = 0
    const simbol: SimbolHadir[] = []

    for (let day = 1; day <= jumlahHari; day += 1) {
      if (!hariDenganData.has(day)) {
        simbol.push('')
        continue
      }
      const map = absenHari.get(day)
      const mark = (idKey && map?.get(idKey)) || map?.get(namaKey) || '•'
      simbol.push(mark)
      if (mark === '•') hadir += 1
      else if (mark === 'S') sakit += 1
      else if (mark === 'I') izin += 1
      else alpa += 1
    }

    const persen = hariEfektif > 0 ? Math.round((hadir / hariEfektif) * 1000) / 10 : null
    return {
      key: String(siswa.id_siswa || siswa.nama_siswa),
      nama: siswa.nama_siswa,
      simbol,
      sakit,
      izin,
      alpa,
      hadir,
      persen,
    }
  })

  return { jumlahHari, hariEfektif, libur, baris }
}

export type StatusAbsenLabel = 'Sakit' | 'Izin' | 'Alpa'

export type RincianTidakHadir = {
  tanggal: string
  status: StatusAbsenLabel
  keterangan: string
}

export type RekapSiswaPerHari = {
  key: string
  nama: string
  hariHadir: number
  hariTidakHadir: number
  persen: number | null
  sakit: number
  izin: number
  alpa: number
  rincian: RincianTidakHadir[]
}

const STATUS_ABSEN_LABEL: Record<'sakit' | 'izin' | 'alpa', StatusAbsenLabel> = {
  sakit: 'Sakit',
  izin: 'Izin',
  alpa: 'Alpa',
}

function kunciAbsenSiswa(id?: string, nama?: string) {
  return [
    id ? `id:${String(id).trim()}` : '',
    nama ? `nama:${String(nama).trim().toLowerCase()}` : '',
  ].filter(Boolean)
}

/**
 * Rekap kehadiran per siswa berdasarkan hari efektif (tanggal unik yang punya jurnal),
 * bukan per sesi jam pelajaran.
 */
export function buildRekapSiswaPerHari(opts: {
  rows: { tanggal?: string; siswa_tidak_hadir?: unknown }[]
  siswa: { id_siswa: string; nama_siswa: string }[]
  roster?: SiswaKelas[] | null
}): { hariEfektif: number; baris: RekapSiswaPerHari[] } {
  const hariEfektifSet = new Set<string>()
  const absenHari = new Map<
    string,
    Map<string, { rank: number; status: StatusAbsenLabel; alasan: Set<string> }>
  >()

  for (const row of opts.rows) {
    const tanggal = String(row.tanggal || '').slice(0, 10)
    if (!tanggal) continue
    hariEfektifSet.add(tanggal)

    const daftar = saringAbsenKelas(normalizeSiswaTidakHadir(row.siswa_tidak_hadir), opts.roster)
    if (daftar.length === 0) continue
    if (!absenHari.has(tanggal)) absenHari.set(tanggal, new Map())
    const peta = absenHari.get(tanggal)!

    for (const item of daftar) {
      const jenis = jenisAbsen(item.keterangan)
      const status = STATUS_ABSEN_LABEL[jenis]
      const rank = RANK_ABSEN[jenis]
      const catatan = String(item.keterangan || '').trim()

      for (const key of kunciAbsenSiswa(item.id_siswa, item.nama)) {
        const lama = peta.get(key)
        if (!lama) {
          peta.set(key, { rank, status, alasan: new Set(catatan ? [catatan] : []) })
          continue
        }
        if (catatan) lama.alasan.add(catatan)
        if (rank >= lama.rank) {
          lama.rank = rank
          lama.status = status
        }
      }
    }
  }

  const hariEfektif = hariEfektifSet.size
  const tanggalUrut = Array.from(hariEfektifSet).sort()

  const baris = opts.siswa.map((siswa) => {
    const idKey = siswa.id_siswa ? `id:${String(siswa.id_siswa).trim()}` : ''
    const namaKey = `nama:${String(siswa.nama_siswa || '').trim().toLowerCase()}`
    const rincian: RincianTidakHadir[] = []

    for (const tanggal of tanggalUrut) {
      const peta = absenHari.get(tanggal)
      const rec = (idKey && peta?.get(idKey)) || peta?.get(namaKey)
      if (!rec) continue
      rincian.push({
        tanggal,
        status: rec.status,
        keterangan: Array.from(rec.alasan)
          .filter((teks) => teks && teks.toLowerCase() !== rec.status.toLowerCase())
          .join('; '),
      })
    }

    const sakit = rincian.filter((item) => item.status === 'Sakit').length
    const izin = rincian.filter((item) => item.status === 'Izin').length
    const alpa = rincian.filter((item) => item.status === 'Alpa').length
    const hariTidakHadir = rincian.length
    const hariHadir = Math.max(0, hariEfektif - hariTidakHadir)
    const persen = hariEfektif > 0 ? Math.round((hariHadir / hariEfektif) * 1000) / 10 : null

    return {
      key: String(siswa.id_siswa || siswa.nama_siswa),
      nama: siswa.nama_siswa,
      hariHadir,
      hariTidakHadir,
      persen,
      sakit,
      izin,
      alpa,
      rincian,
    }
  })

  return { hariEfektif, baris }
}
