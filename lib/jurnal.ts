import { supabase } from '@/lib/supabase'
import { excludeAlumniSiswa, isKelasAlumni } from '@/lib/siswa'

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
  'Fikih Akhlak',
  'Bahasa Arab',
  'Bahasa Indonesia',
  'Matematika',
  'IPA',
  'IPS',
  'PKn',
  'Bahasa Inggris',
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
  'id,kelas,tanggal,jam,semester,mapel,materi,kegiatan,links,hadir,tidak_hadir,siswa_tidak_hadir,ttd'

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

export function teacherName(currentUser?: any) {
  return currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username || 'Guru'
}

export function hitungKehadiran(totalSiswa: number, absen: SiswaTidakHadir[], absenManual?: string) {
  const dariDaftar = absen.length
  const manual = Number(absenManual)
  const tidakHadir = dariDaftar > 0 ? dariDaftar : Number.isFinite(manual) && manual > 0 ? manual : 0
  const hadir = Math.max(0, totalSiswa - tidakHadir)
  return { hadir, tidakHadir }
}

export async function fetchKelasDanJumlahSiswa(currentUser?: any) {
  const unit = teacherUnit(currentUser)
  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  while (true) {
    const { data, error } = await supabase
      .from('siswa')
      .select('kelas,unit')
      .not('kelas', 'ilike', '%Alumni%')
      .range(from, from + pageSize - 1)

    if (error) {
      console.error('Gagal mengambil data siswa:', error.message)
      break
    }

    const rows = excludeAlumniSiswa(data || [])
    for (const row of rows) {
      if (unit && String(row.unit || '').trim() !== unit) continue
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
  const unit = teacherUnit(currentUser)
  const pageSize = 1000
  const all: SiswaKelas[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from('siswa')
      .select('id_siswa,nama_siswa,kelas,unit')
      .eq('kelas', kelas)
      .not('kelas', 'ilike', '%Alumni%')
      .order('nama_siswa', { ascending: true })
      .range(from, from + pageSize - 1)

    const { data, error } = await query
    if (error) {
      console.error('Gagal mengambil siswa kelas:', error.message)
      break
    }

    const rows = excludeAlumniSiswa((data || []) as SiswaKelas[])
    for (const row of rows) {
      if (isKelasAlumni(row.kelas)) continue
      if (unit && String(row.unit || '').trim() !== unit) continue
      all.push(row)
    }

    if (rows.length < pageSize) break
    from += pageSize
  }

  return all
}

export async function fetchJurnalHari(kelas: string, tanggal: string) {
  const { data, error } = await supabase
    .from('jurnal_pembelajaran')
    .select(JURNAL_FIELDS)
    .eq('kelas', kelas)
    .eq('tanggal', tanggal)

  if (error) return { rows: [], error }
  return { rows: data || [], error: null }
}

export async function fetchJurnalRentang(opts: {
  kelas?: string
  start: string
  end: string
  semester?: string
}) {
  const pageSize = 1000
  const all: any[] = []
  let from = 0

  while (true) {
    let query = supabase
      .from('jurnal_pembelajaran')
      .select(JURNAL_FIELDS)
      .gte('tanggal', opts.start)
      .lte('tanggal', opts.end)
      .order('tanggal', { ascending: true })
      .range(from, from + pageSize - 1)

    if (opts.kelas) query = query.eq('kelas', opts.kelas)
    if (opts.semester) query = query.eq('semester', Number(opts.semester))

    const { data, error } = await query
    if (error) return { rows: all, error }

    const rows = data || []
    all.push(...rows)
    if (rows.length < pageSize) break
    from += pageSize
  }

  return { rows: all, error: null }
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

export function rowsToEntries(rows: any[], totalSiswa = 0): Record<number, JurnalJam> {
  const entries: Record<number, JurnalJam> = {}
  for (const row of rows) {
    const jam = Number(row.jam)
    if (!Number.isFinite(jam)) continue
    const siswaTidakHadir = normalizeSiswaTidakHadir(row.siswa_tidak_hadir)
    const { hadir, tidakHadir } = hitungKehadiran(
      totalSiswa,
      siswaTidakHadir,
      row.tidak_hadir == null ? '' : String(row.tidak_hadir),
    )
    entries[jam] = {
      mapel: row.mapel || '',
      materi: row.materi || '',
      kegiatan: row.kegiatan || '',
      links: normalizeLinks(row.links),
      hadir: String(row.hadir ?? hadir),
      absen: String(row.tidak_hadir ?? tidakHadir),
      siswaTidakHadir,
      ttd: row.ttd || null,
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
}) {
  const rows = Object.entries(payload.entries).map(([jamKey, entry]) => {
    const { hadir, tidakHadir } = hitungKehadiran(payload.totalSiswa, entry.siswaTidakHadir || [], entry.absen)
    return {
      kelas: payload.kelas,
      tanggal: payload.tanggal,
      jam: Number(jamKey),
      semester: payload.semester,
      mapel: entry.mapel || '',
      materi: entry.materi || '',
      kegiatan: entry.kegiatan || '',
      links: (entry.links || []).filter((link) => link.url),
      hadir,
      tidak_hadir: tidakHadir,
      siswa_tidak_hadir: entry.siswaTidakHadir || [],
      ttd: entry.ttd || null,
    }
  })

  const { error } = await supabase.from('jurnal_pembelajaran').upsert(rows, {
    onConflict: 'kelas,tanggal,jam',
  })

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
