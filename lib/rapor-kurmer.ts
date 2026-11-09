import { fetchPejabatUntukCetak, type PejabatCetak } from '@/lib/setting-cetak'
import { excludeAlumniSiswa, isKelasAlumni, unitLogin, unitSama } from '@/lib/siswa'
import { supabase } from '@/lib/supabase'

export const JENIS_ASESMEN_KURMER = ['ASTS', 'ASAS'] as const
export type JenisAsesmenKurmer = (typeof JENIS_ASESMEN_KURMER)[number]

export const KELOMPOK_MAPEL_KURMER = ['umum', 'diniyyah'] as const
export type KelompokMapelKurmer = (typeof KELOMPOK_MAPEL_KURMER)[number]

export type MapelKurmer = {
  kode: string
  nama: string
  kelompok: KelompokMapelKurmer
}

export const MAPEL_UMUM_KURMER: MapelKurmer[] = [
  { kode: 'pai', nama: 'PAI', kelompok: 'umum' },
  { kode: 'pkn', nama: 'PKN', kelompok: 'umum' },
  { kode: 'bind', nama: 'Bahasa Indonesia', kelompok: 'umum' },
  { kode: 'mtk', nama: 'Matematika', kelompok: 'umum' },
  { kode: 'ipas', nama: 'IPAS', kelompok: 'umum' },
  { kode: 'pjok', nama: 'PJOK', kelompok: 'umum' },
  { kode: 'seni', nama: 'Seni Budaya', kelompok: 'umum' },
  { kode: 'bing', nama: 'Bahasa Inggris', kelompok: 'umum' },
  { kode: 'bjaw', nama: 'Bahasa Jawa', kelompok: 'umum' },
]

export const MAPEL_DINIYYAH_KURMER: MapelKurmer[] = [
  { kode: 'aqidah', nama: 'Aqidah', kelompok: 'diniyyah' },
  { kode: 'fiqih', nama: 'Fiqih Akhlak', kelompok: 'diniyyah' },
  { kode: 'qq', nama: "Qiro'atul Qur'an / Tajwid", kelompok: 'diniyyah' },
  { kode: 'barab', nama: 'Bahasa Arab', kelompok: 'diniyyah' },
  { kode: 'hq', nama: "Hafalan Al-Qur'an", kelompok: 'diniyyah' },
  { kode: 'hadits', nama: 'Hafalan Hadits', kelompok: 'diniyyah' },
]

export const DAFTAR_MAPEL_KURMER: MapelKurmer[] = [...MAPEL_UMUM_KURMER, ...MAPEL_DINIYYAH_KURMER]

export const JUMLAH_TP_BAWAAN = 10
export const JUMLAH_TP_MIN = 1
/** Kolom Supabase `rapor_kurmer_nilai` hanya `tp1` … `tp10`. */
export const JUMLAH_TP_MAX = 10

export type OpsiSimpanNilaiKurmer = {
  jenisAsesmen: JenisAsesmenKurmer
  nisMenurutSiswa?: Record<string, string>
}

export type HasilSimpanKurmer = { ok: true } | { ok: false; error: string }

export type SiswaKurmer = {
  id_siswa: string
  nama_siswa: string
  kelas: string
  nis: string
  unit?: string
}

export type BarisNilaiKurmer = {
  id_siswa: string
  kelas: string
  kode_mapel: string
  tahun_ajaran: string
  semester: string
  tp: (number | null)[]
  nh: number | null
  asts: number | null
  asas: number | null
  jumlah_tp: number
}

export type CatatanKurmer = {
  id_siswa: string
  kelas: string
  tahun_ajaran: string
  semester: string
  jenis_asesmen: JenisAsesmenKurmer
  catatan_wali: string
  nama_wali: string
  nama_kepsek: string
  /** Hanya untuk tampilan cetak (belum disimpan di Supabase). */
  niy_wali?: string
}

export type BarisMuatanCetak =
  | { jenis: 'judul'; teks: string }
  | { jenis: 'mapel'; nomor: number | null; data: RingkasMapelKurmer; indent?: boolean }

export type SetelanTpKurmer = {
  kelas: string
  kode_mapel: string
  tahun_ajaran: string
  semester: string
  jumlah_tp: number
}

export type PeriodeKurmer = {
  semester: '1' | '2'
  tahunAjaran: string
  labelSemester: string
}

export type FilterKurmer = {
  kelas: string
  kodeMapel: string
  jenisAsesmen: JenisAsesmenKurmer
  tahunAjaran: string
  semester: string
}

export type RingkasMapelKurmer = {
  mapel: MapelKurmer
  nh: number | null
  asts: number | null
  asas: number | null
  na: number | null
  predikat: string
}

export type StatistikLedger = {
  total: number | null
  rata: number | null
  tertinggi: number | null
  terendah: number | null
  terisi: number
}

export type BarisLedgerKurmer = {
  siswa: SiswaKurmer
  nilai: Record<string, number | null>
  statistik: StatistikLedger
}

export type RekapMapelLedger = {
  mapel: MapelKurmer
  rata: number | null
  tertinggi: number | null
  terendah: number | null
  terisi: number
}

export type DataCetakKurmer = {
  siswa: SiswaKurmer
  filter: FilterKurmer
  periode: { tahunAjaran: string; semester: string; labelSemester: string; fase: string }
  umum: RingkasMapelKurmer[]
  diniyyah: RingkasMapelKurmer[]
  statistik: StatistikLedger
  catatan: CatatanKurmer
  kepsek: PejabatCetak
  lokasi: string
}

function teks(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

function round1(n: number) {
  return Math.round(n * 10) / 10
}

export function periodeKurmer(date = new Date()): PeriodeKurmer {
  const bulan = date.getMonth() + 1
  const tahun = date.getFullYear()
  const gasal = bulan >= 7
  const awal = gasal ? tahun : tahun - 1
  return {
    semester: gasal ? '1' : '2',
    tahunAjaran: `${awal}/${awal + 1}`,
    labelSemester: gasal ? 'Gasal' : 'Genap',
  }
}

export function labelSemesterKurmer(semester: string) {
  return String(semester) === '2' ? 'Genap' : 'Gasal'
}

export function faseKurmer(kelas: string) {
  const n = parseInt(String(kelas || '').replace(/\D/g, ''), 10) || 0
  if (n <= 2) return 'A'
  if (n <= 4) return 'B'
  return 'C'
}

export function mapelKurmer(kode: string) {
  return DAFTAR_MAPEL_KURMER.find((item) => item.kode === kode) || null
}

export function namaMapelKurmer(kode: string) {
  return mapelKurmer(kode)?.nama ?? teks(kode)
}

export function kodeMapelDariNama(nama: string) {
  const isi = teks(nama)
  const mapel =
    DAFTAR_MAPEL_KURMER.find((item) => item.nama === isi) ||
    DAFTAR_MAPEL_KURMER.find((item) => item.kode === isi.toLowerCase())
  return mapel?.kode ?? isi.toLowerCase()
}

export function semesterKeDb(semester: string) {
  return String(semester) === '2' ? 2 : 1
}

export function semesterDariDb(value: unknown) {
  return String(value) === '2' ? '2' : '1'
}

function semesterCocokFilter(value: unknown, semesterFilter: string) {
  return String(value) === semesterFilter || Number(value) === semesterKeDb(semesterFilter)
}

export function clampJumlahTp(n: number) {
  if (!Number.isFinite(n)) return JUMLAH_TP_BAWAAN
  return Math.min(JUMLAH_TP_MAX, Math.max(JUMLAH_TP_MIN, Math.round(n)))
}

export function parseNilaiKurmer(raw: string): number | null {
  const isi = raw.trim().replace(',', '.')
  if (!isi) return null
  const n = Number(isi)
  if (!Number.isFinite(n)) return null
  return Math.min(100, Math.max(0, round1(n)))
}

export function formatNilaiKurmer(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

export function predikatKurmer(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return '—'
  if (n >= 90) return 'SB'
  if (n >= 80) return 'B'
  if (n >= 70) return 'C'
  return 'PB'
}

export function labelPredikatKurmer(kode: string) {
  if (kode === 'SB') return 'Sangat Baik'
  if (kode === 'B') return 'Baik'
  if (kode === 'C') return 'Cukup'
  if (kode === 'PB') return 'Perlu Bimbingan'
  return '—'
}

export function nilaiFormatifDariTp(tp: (number | null)[]) {
  const isi = tp.filter((n): n is number => n != null && Number.isFinite(n))
  if (isi.length === 0) return null
  return round1(isi.reduce((jumlah, n) => jumlah + n, 0) / isi.length)
}

/** NA ASTS = (NH + ASTS) / 2. NA ASAS = (2×NH + ASTS + ASAS) / Σbobot yang terisi. */
export function nilaiAkhirKurmer(
  nh: number | null,
  asts: number | null,
  asas: number | null,
  jenis: JenisAsesmenKurmer,
) {
  if (jenis === 'ASTS') {
    const bagian = [nh, asts].filter((n): n is number => n != null && Number.isFinite(n))
    if (bagian.length === 0) return null
    return round1(bagian.reduce((jumlah, n) => jumlah + n, 0) / bagian.length)
  }

  let jumlah = 0
  let bobot = 0
  if (nh != null && Number.isFinite(nh)) {
    jumlah += nh * 2
    bobot += 2
  }
  if (asts != null && Number.isFinite(asts)) {
    jumlah += asts
    bobot += 1
  }
  if (asas != null && Number.isFinite(asas)) {
    jumlah += asas
    bobot += 1
  }
  if (bobot === 0) return null
  return round1(jumlah / bobot)
}

export function statistikDariNilai(nilai: (number | null)[]): StatistikLedger {
  const isi = nilai.filter((n): n is number => n != null && Number.isFinite(n))
  if (isi.length === 0) {
    return { total: null, rata: null, tertinggi: null, terendah: null, terisi: 0 }
  }
  const total = round1(isi.reduce((jumlah, n) => jumlah + n, 0))
  return {
    total,
    rata: round1(total / isi.length),
    tertinggi: Math.max(...isi),
    terendah: Math.min(...isi),
    terisi: isi.length,
  }
}

export function kunciNilaiKurmer(row: Pick<BarisNilaiKurmer, 'id_siswa' | 'kode_mapel' | 'tahun_ajaran' | 'semester'>) {
  return `${row.id_siswa}::${row.kode_mapel}::${row.tahun_ajaran}::${row.semester}`
}

export function kunciCatatanKurmer(row: Pick<CatatanKurmer, 'id_siswa' | 'tahun_ajaran' | 'semester' | 'jenis_asesmen'>) {
  return `${row.id_siswa}::${row.tahun_ajaran}::${row.semester}::${row.jenis_asesmen}`
}

export function kunciSetelanTp(row: Pick<SetelanTpKurmer, 'kelas' | 'kode_mapel' | 'tahun_ajaran' | 'semester'>) {
  return `${row.kelas}::${row.kode_mapel}::${row.tahun_ajaran}::${row.semester}`
}

export function barisNilaiKosong(
  siswa: Pick<SiswaKurmer, 'id_siswa' | 'kelas'>,
  filter: FilterKurmer,
  jumlahTp = JUMLAH_TP_BAWAAN,
): BarisNilaiKurmer {
  const jumlah = clampJumlahTp(jumlahTp)
  return {
    id_siswa: siswa.id_siswa,
    kelas: siswa.kelas,
    kode_mapel: filter.kodeMapel,
    tahun_ajaran: filter.tahunAjaran,
    semester: filter.semester,
    tp: Array.from({ length: jumlah }, () => null),
    nh: null,
    asts: null,
    asas: null,
    jumlah_tp: jumlah,
  }
}

export function normalisasiBarisNilai(row: BarisNilaiKurmer, jumlahTp: number): BarisNilaiKurmer {
  const jumlah = clampJumlahTp(jumlahTp)
  const tp = Array.from({ length: jumlah }, (_, i) => {
    const n = row.tp[i]
    return n == null || !Number.isFinite(n) ? null : n
  })
  return {
    ...row,
    jumlah_tp: jumlah,
    tp,
    nh: nilaiFormatifDariTp(tp),
  }
}

export function terapkanNilaiKeBaris(
  row: BarisNilaiKurmer,
  patch: { tp?: (number | null)[]; asts?: number | null; asas?: number | null },
) {
  const berikutnya = {
    ...row,
    tp: patch.tp ? [...patch.tp] : [...row.tp],
    asts: patch.asts !== undefined ? patch.asts : row.asts,
    asas: patch.asas !== undefined ? patch.asas : row.asas,
  }
  berikutnya.nh = nilaiFormatifDariTp(berikutnya.tp)
  return berikutnya
}

function tabelBelumAda(error?: { code?: string; message?: string } | null) {
  const pesan = String(error?.message || '').toLowerCase()
  return (
    error?.code === 'PGRST205' ||
    error?.code === '42P01' ||
    (pesan.includes('rapor_kurmer') &&
      (pesan.includes('does not exist') || pesan.includes('could not find') || pesan.includes('schema cache')))
  )
}

function pesanGalatSupabase(error: { message?: string; code?: string }) {
  if (tabelBelumAda(error)) {
    return 'Gagal mengakses data rapor Kurmer. Periksa koneksi atau hak akses Supabase.'
  }
  return String(error.message || 'Gagal menghubungi Supabase.')
}

function galatOperasional(error?: { message?: string; code?: string } | null) {
  if (!error || tabelBelumAda(error)) return null
  return pesanGalatSupabase(error)
}

function angkaAtauNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function tpDariKolomSupabase(row: Record<string, unknown>, jumlahTp: number): (number | null)[] {
  const jumlah = clampJumlahTp(jumlahTp)
  return Array.from({ length: jumlah }, (_, i) => {
    if (i >= JUMLAH_TP_MAX) return null
    const raw = row[`tp${i + 1}`]
    if (raw == null || raw === '') return null
    const n = Number(raw)
    if (!Number.isFinite(n)) return null
    return n === 0 ? null : n
  })
}

function tpKeKolomSupabase(tp: (number | null)[]) {
  const out: Record<string, number | null> = {}
  for (let i = 0; i < JUMLAH_TP_MAX; i++) {
    const n = tp[i]
    out[`tp${i + 1}`] = n == null || !Number.isFinite(n) ? null : n
  }
  return out
}

function dariBarisSupabase(row: Record<string, unknown>): BarisNilaiKurmer {
  const jumlah = JUMLAH_TP_BAWAAN
  const tp = tpDariKolomSupabase(row, jumlah)
  const nh = angkaAtauNull(row.nilai_formatif) ?? nilaiFormatifDariTp(tp)
  return {
    id_siswa: teks(row.id_siswa),
    kelas: teks(row.kelas),
    kode_mapel: kodeMapelDariNama(teks(row.mata_pelajaran) || teks(row.kode_mapel)),
    tahun_ajaran: teks(row.tahun_ajaran),
    semester: semesterDariDb(row.semester),
    tp,
    nh,
    asts: angkaAtauNull(row.asts),
    asas: angkaAtauNull(row.asas),
    jumlah_tp: jumlah,
  }
}

export async function fetchKelasKurmer(currentUser?: { unit?: string; sekolah?: string } | null) {
  const unit = unitLogin(currentUser)
  const counts = new Map<string, number>()
  const pageSize = 1000
  let from = 0

  while (true) {
    let query = supabase.from('siswa').select('kelas,unit').not('kelas', 'ilike', '%Alumni%').range(from, from + pageSize - 1)
    if (unit) query = query.eq('unit', unit)
    const { data, error } = await query
    if (error) break
    const rows = excludeAlumniSiswa(data || [])
    for (const row of rows) {
      if (unit && !unitSama(row.unit, unit)) continue
      const kelas = teks(row.kelas)
      if (!kelas || isKelasAlumni(kelas)) continue
      counts.set(kelas, (counts.get(kelas) || 0) + 1)
    }
    if (rows.length < pageSize) break
    from += pageSize
  }

  const { data: kelasRows } = await supabase.from('kelas').select('nama').order('nama', { ascending: true })
  const dariTabel = (kelasRows || [])
    .map((row) => teks(row.nama))
    .filter((nama) => nama && !isKelasAlumni(nama))
  const classes = dariTabel.length > 0 ? dariTabel : Array.from(counts.keys()).sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
  return { classes, counts: Object.fromEntries(counts) as Record<string, number> }
}

export async function fetchSiswaKelasKurmer(
  kelas: string,
  currentUser?: { unit?: string; sekolah?: string } | null,
): Promise<SiswaKurmer[]> {
  if (!kelas) return []
  const unit = unitLogin(currentUser)
  const pageSize = 1000
  const all: SiswaKurmer[] = []
  let from = 0
  let pakaiNis = true

  while (true) {
    const dasar = supabase.from('siswa')
    const query = pakaiNis
      ? dasar.select('id_siswa,nama_siswa,kelas,unit,nis')
      : dasar.select('id_siswa,nama_siswa,kelas,unit')
    let permintaan = query
      .eq('kelas', kelas)
      .not('kelas', 'ilike', '%Alumni%')
      .order('nama_siswa', { ascending: true })
      .range(from, from + pageSize - 1)
    if (unit) permintaan = permintaan.eq('unit', unit)

    const { data, error } = await permintaan
    if (error && pakaiNis && /nis/i.test(error.message)) {
      pakaiNis = false
      from = 0
      all.length = 0
      continue
    }
    if (error) break

    const rows = excludeAlumniSiswa((data || []) as unknown as Record<string, unknown>[])
    for (const row of rows) {
      const namaKelas = teks(row.kelas)
      if (isKelasAlumni(namaKelas)) continue
      if (unit && !unitSama(teks(row.unit), unit)) continue
      all.push({
        id_siswa: teks(row.id_siswa),
        nama_siswa: teks(row.nama_siswa),
        kelas: namaKelas,
        nis: teks(row.nis) || teks(row.id_siswa),
        unit: teks(row.unit),
      })
    }
    if ((data || []).length < pageSize) break
    from += pageSize
  }

  return all
}

export async function fetchSiswaKurmerById(
  idSiswa: string,
  currentUser?: { unit?: string; sekolah?: string } | null,
): Promise<SiswaKurmer | null> {
  const id = teks(idSiswa)
  if (!id) return null
  const unit = unitLogin(currentUser)
  const lengkap = await supabase
    .from('siswa')
    .select('id_siswa,nama_siswa,kelas,unit,nis')
    .eq('id_siswa', id)
    .maybeSingle()
  const row = lengkap.error
    ? (await supabase.from('siswa').select('id_siswa,nama_siswa,kelas,unit').eq('id_siswa', id).maybeSingle()).data
    : lengkap.data
  if (!row) return null
  const namaKelas = teks(row.kelas)
  if (isKelasAlumni(namaKelas)) return null
  if (unit && !unitSama(teks(row.unit), unit)) return null
  return {
    id_siswa: teks(row.id_siswa),
    nama_siswa: teks(row.nama_siswa),
    kelas: namaKelas,
    nis: teks((row as { nis?: string }).nis) || id,
    unit: teks(row.unit),
  }
}

export async function fetchNilaiKurmerKelas(filter: FilterKurmer) {
  const { data, error } = await supabase
    .from('rapor_kurmer_nilai')
    .select(
      'id_siswa,kelas,mata_pelajaran,tahun_ajaran,semester,tp1,tp2,tp3,tp4,tp5,tp6,tp7,tp8,tp9,tp10,nilai_formatif,asts,asas',
    )
    .eq('kelas', filter.kelas)
    .eq('tahun_ajaran', filter.tahunAjaran)
    .eq('semester', semesterKeDb(filter.semester))

  if (error) {
    console.error('Gagal memuat nilai rapor kurmer:', error.message)
    return { data: [] as BarisNilaiKurmer[], error: galatOperasional(error) }
  }
  return {
    data: (data || []).map((row) => dariBarisSupabase(row as Record<string, unknown>)),
    error: null as string | null,
  }
}

/** Tabel `rapor_kurmer_*` sudah aktif di proyek; cek hanya untuk log diagnostik. */
export async function cekTabelRaporKurmerSupabase() {
  return { siap: true, error: null as string | null }
}

/** Sinkronkan daftar nilai & catatan saat ada perubahan di Supabase (multi-guru / tab lain). */
export function pasangLanggananRealtimeKurmer(
  filter: Pick<FilterKurmer, 'kelas' | 'tahunAjaran' | 'semester'>,
  onPerubahan: () => void,
) {
  if (!filter.kelas) return () => {}

  const cocokNilai = (row: Record<string, unknown> | undefined) => {
    if (!row) return false
    return (
      teks(row.kelas) === filter.kelas &&
      teks(row.tahun_ajaran) === filter.tahunAjaran &&
      semesterCocokFilter(row.semester, filter.semester)
    )
  }

  const cocokCatatan = (row: Record<string, unknown> | undefined) => {
    if (!row) return false
    return teks(row.tahun_ajaran) === filter.tahunAjaran && semesterCocokFilter(row.semester, filter.semester)
  }

  const channel = supabase
    .channel(`rapor-kurmer-${filter.kelas}-${filter.tahunAjaran}-${filter.semester}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rapor_kurmer_nilai' }, (payload) => {
      const baris = (payload.new || payload.old) as Record<string, unknown> | undefined
      if (cocokNilai(baris)) onPerubahan()
    })
    .on('postgres_changes', { event: '*', schema: 'public', table: 'rapor_kurmer_catatan' }, (payload) => {
      const baris = (payload.new || payload.old) as Record<string, unknown> | undefined
      if (cocokCatatan(baris)) onPerubahan()
    })
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}

export async function fetchSetelanTpKurmer(filter: FilterKurmer): Promise<{ jumlah: number; error: string | null }> {
  const { data, error } = await supabase
    .from('rapor_kurmer_setelan')
    .select('jumlah_tp')
    .eq('kelas', filter.kelas)
    .eq('kode_mapel', filter.kodeMapel)
    .eq('tahun_ajaran', filter.tahunAjaran)
    .eq('semester', filter.semester)
    .maybeSingle()

  if (!error && data) {
    return { jumlah: clampJumlahTp(Number(data.jumlah_tp) || JUMLAH_TP_BAWAAN), error: null }
  }
  if (error && !tabelBelumAda(error)) {
    console.error('Gagal memuat setelan TP:', error.message)
  }
  return { jumlah: JUMLAH_TP_BAWAAN, error: galatOperasional(error) }
}

export async function simpanSetelanTpKurmer(filter: FilterKurmer, jumlahTp: number) {
  const jumlah = clampJumlahTp(jumlahTp)
  const payload = {
    kelas: filter.kelas,
    kode_mapel: filter.kodeMapel,
    tahun_ajaran: filter.tahunAjaran,
    semester: filter.semester,
    jumlah_tp: jumlah,
    updated_at: new Date().toISOString(),
  }

  const { error } = await supabase.from('rapor_kurmer_setelan').upsert(payload, {
    onConflict: 'kelas,kode_mapel,tahun_ajaran,semester',
  })
  if (error) return { ok: false as const, error: pesanGalatSupabase(error) }
  return { ok: true as const }
}

export async function simpanNilaiKurmer(
  baris: BarisNilaiKurmer[],
  _guru = '',
  opsi?: OpsiSimpanNilaiKurmer,
): Promise<HasilSimpanKurmer> {
  if (baris.length === 0) return { ok: true }
  const jenis = opsi?.jenisAsesmen ?? 'ASTS'
  const contoh = baris[0]
  const namaMapel = namaMapelKurmer(contoh.kode_mapel)

  const { data: existingRows, error: galatMuat } = await supabase
    .from('rapor_kurmer_nilai')
    .select('id_kurmer_nilai,id_siswa')
    .eq('kelas', contoh.kelas)
    .eq('mata_pelajaran', namaMapel)
    .eq('tahun_ajaran', contoh.tahun_ajaran)
    .eq('semester', semesterKeDb(contoh.semester))

  if (galatMuat) return { ok: false, error: pesanGalatSupabase(galatMuat) }

  const idMenurutSiswa = new Map(
    (existingRows || []).map((row) => [teks(row.id_siswa), Number(row.id_kurmer_nilai)] as const),
  )

  for (const row of baris) {
    const normal = normalisasiBarisNilai(row, row.jumlah_tp)
    const nh = normal.nh
    const na = nilaiAkhirKurmer(nh, normal.asts, normal.asas, jenis)
    const predikat = predikatKurmer(na)
    const nis = teks(opsi?.nisMenurutSiswa?.[normal.id_siswa]) || normal.id_siswa
    const kelas = teks(normal.kelas) || teks(contoh.kelas)
    const payload = {
      id_siswa: normal.id_siswa,
      nis,
      kelas,
      mata_pelajaran: namaMapelKurmer(normal.kode_mapel),
      jenis_asesmen: jenis,
      tahun_ajaran: normal.tahun_ajaran,
      semester: semesterKeDb(normal.semester),
      ...tpKeKolomSupabase(normal.tp),
      nilai_formatif: nh,
      asts: normal.asts,
      asas: normal.asas,
      nilai_akhir: na,
      predikat: predikat === '—' ? null : predikat,
      updated_at: new Date().toISOString(),
    }

    const idLama = idMenurutSiswa.get(normal.id_siswa)
    const { error } = idLama
      ? await supabase.from('rapor_kurmer_nilai').update(payload).eq('id_kurmer_nilai', idLama)
      : await supabase.from('rapor_kurmer_nilai').insert(payload)

    if (error) return { ok: false, error: pesanGalatSupabase(error) }
  }

  return { ok: true }
}

export async function fetchCatatanKurmer(
  idSiswa: string,
  filter: Pick<FilterKurmer, 'kelas' | 'tahunAjaran' | 'semester' | 'jenisAsesmen'>,
): Promise<CatatanKurmer | null> {
  const { data, error } = await supabase
    .from('rapor_kurmer_catatan')
    .select('id_siswa,tahun_ajaran,semester,catatan_wali_kelas')
    .eq('id_siswa', idSiswa)
    .eq('tahun_ajaran', filter.tahunAjaran)
    .eq('semester', semesterKeDb(filter.semester))
    .maybeSingle()

  if (error) {
    console.error('Gagal memuat catatan rapor kurmer:', error.message)
    return null
  }
  if (!data) return null

  return {
    id_siswa: teks(data.id_siswa),
    kelas: filter.kelas,
    tahun_ajaran: teks(data.tahun_ajaran),
    semester: semesterDariDb(data.semester),
    jenis_asesmen: filter.jenisAsesmen,
    catatan_wali: teks(data.catatan_wali_kelas),
    nama_wali: '',
    nama_kepsek: '',
  }
}

export async function simpanCatatanKurmer(catatan: CatatanKurmer, nis = ''): Promise<HasilSimpanKurmer> {
  const semester = semesterKeDb(catatan.semester)
  const { data: ada, error: galatCari } = await supabase
    .from('rapor_kurmer_catatan')
    .select('id_catatan_kurmer')
    .eq('id_siswa', catatan.id_siswa)
    .eq('tahun_ajaran', catatan.tahun_ajaran)
    .eq('semester', semester)
    .maybeSingle()

  if (galatCari) return { ok: false, error: pesanGalatSupabase(galatCari) }

  const payload = {
    id_siswa: catatan.id_siswa,
    nis: teks(nis) || catatan.id_siswa,
    tahun_ajaran: catatan.tahun_ajaran,
    semester,
    catatan_wali_kelas: catatan.catatan_wali.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error } = ada?.id_catatan_kurmer
    ? await supabase.from('rapor_kurmer_catatan').update(payload).eq('id_catatan_kurmer', ada.id_catatan_kurmer)
  : await supabase.from('rapor_kurmer_catatan').insert(payload)

  if (error) return { ok: false, error: pesanGalatSupabase(error) }
  return { ok: true }
}

export function gabungRosterNilai(
  siswa: SiswaKurmer[],
  nilai: BarisNilaiKurmer[],
  filter: FilterKurmer,
  jumlahTp: number,
) {
  const peta = new Map(
    nilai
      .filter((row) => row.kode_mapel === filter.kodeMapel)
      .map((row) => [row.id_siswa, normalisasiBarisNilai(row, jumlahTp)]),
  )
  return siswa.map((item) => peta.get(item.id_siswa) || barisNilaiKosong(item, filter, jumlahTp))
}

export function susunLedgerKelas(
  siswa: SiswaKurmer[],
  nilai: BarisNilaiKurmer[],
  jenis: JenisAsesmenKurmer,
): { baris: BarisLedgerKurmer[]; rekap: RekapMapelLedger[] } {
  const peta = new Map<string, BarisNilaiKurmer>()
  for (const row of nilai) peta.set(`${row.id_siswa}::${row.kode_mapel}`, row)

  const baris: BarisLedgerKurmer[] = siswa.map((item) => {
    const nilaiMapel: Record<string, number | null> = {}
    for (const mapel of DAFTAR_MAPEL_KURMER) {
      const row = peta.get(`${item.id_siswa}::${mapel.kode}`)
      nilaiMapel[mapel.kode] = row ? nilaiAkhirKurmer(row.nh, row.asts, row.asas, jenis) : null
    }
    return { siswa: item, nilai: nilaiMapel, statistik: statistikDariNilai(Object.values(nilaiMapel)) }
  })

  const rekap: RekapMapelLedger[] = DAFTAR_MAPEL_KURMER.map((mapel) => {
    const angka = baris.map((item) => item.nilai[mapel.kode] ?? null)
    const ringkas = statistikDariNilai(angka)
    return {
      mapel,
      rata: ringkas.rata,
      tertinggi: ringkas.tertinggi,
      terendah: ringkas.terendah,
      terisi: ringkas.terisi,
    }
  })

  return { baris, rekap }
}

/** Satu tabel rapor: mapel umum + sub-komponen diniyyah di bawah baris PAI (format lembar kerja sekolah). */
export function susunBarisMuatanCetak(umum: RingkasMapelKurmer[], diniyyah: RingkasMapelKurmer[]): BarisMuatanCetak[] {
  const petaDiniyyah = new Map(diniyyah.map((item) => [item.mapel.kode, item]))
  const baris: BarisMuatanCetak[] = [{ jenis: 'judul', teks: 'A. Kelompok Umum' }]
  let nomor = 0

  for (const item of umum) {
    nomor += 1
    baris.push({ jenis: 'mapel', nomor, data: item })
    if (item.mapel.kode === 'pai') {
      for (const sub of MAPEL_DINIYYAH_KURMER) {
        const data = petaDiniyyah.get(sub.kode) ?? {
          mapel: sub,
          nh: null,
          asts: null,
          asas: null,
          na: null,
          predikat: '—',
        }
        baris.push({ jenis: 'mapel', nomor: null, data, indent: true })
      }
    }
  }

  return baris
}

export function ringkasNilaiSiswa(
  nilai: BarisNilaiKurmer[],
  jenis: JenisAsesmenKurmer,
): { umum: RingkasMapelKurmer[]; diniyyah: RingkasMapelKurmer[]; statistik: StatistikLedger } {
  const peta = new Map(nilai.map((row) => [row.kode_mapel, row]))
  const semua = DAFTAR_MAPEL_KURMER.map((mapel) => {
    const row = peta.get(mapel.kode)
    const nh = row?.nh ?? null
    const asts = row?.asts ?? null
    const asas = row?.asas ?? null
    const na = nilaiAkhirKurmer(nh, asts, asas, jenis)
    return { mapel, nh, asts, asas, na, predikat: predikatKurmer(na) } satisfies RingkasMapelKurmer
  })
  return {
    umum: semua.filter((item) => item.mapel.kelompok === 'umum'),
    diniyyah: semua.filter((item) => item.mapel.kelompok === 'diniyyah'),
    statistik: statistikDariNilai(semua.map((item) => item.na)),
  }
}

export function susunDataCetakDariMemori(
  siswa: SiswaKurmer,
  nilai: BarisNilaiKurmer[],
  filter: FilterKurmer,
  catatan: Pick<CatatanKurmer, 'catatan_wali' | 'nama_wali' | 'nama_kepsek'>,
  kepsek: PejabatCetak,
  lokasi = '',
): DataCetakKurmer {
  const milik = nilai.filter((row) => row.id_siswa === siswa.id_siswa)
  const ringkas = ringkasNilaiSiswa(milik, filter.jenisAsesmen)
  return {
    siswa,
    filter: { ...filter, kelas: siswa.kelas },
    periode: {
      tahunAjaran: filter.tahunAjaran,
      semester: filter.semester,
      labelSemester: labelSemesterKurmer(filter.semester),
      fase: faseKurmer(siswa.kelas),
    },
    umum: ringkas.umum,
    diniyyah: ringkas.diniyyah,
    statistik: ringkas.statistik,
    catatan: {
      id_siswa: siswa.id_siswa,
      kelas: siswa.kelas,
      tahun_ajaran: filter.tahunAjaran,
      semester: filter.semester,
      jenis_asesmen: filter.jenisAsesmen,
      catatan_wali: catatan.catatan_wali,
      nama_wali: catatan.nama_wali,
      nama_kepsek: catatan.nama_kepsek,
    },
    kepsek: { nama: catatan.nama_kepsek || kepsek.nama, niy: kepsek.niy },
    lokasi: lokasi || teks(siswa.unit),
  }
}

export async function fetchDataCetakKurmer(
  idSiswa: string,
  filter: FilterKurmer,
  currentUser?: { unit?: string; sekolah?: string; nama_lengkap?: string; nama?: string; username?: string } | null,
): Promise<DataCetakKurmer | null> {
  const kelas = filter.kelas || (await fetchSiswaKurmerById(idSiswa, currentUser))?.kelas || ''
  if (!kelas) return null
  const filterEfektif = { ...filter, kelas }
  const siswaKelas = await fetchSiswaKelasKurmer(kelas, currentUser)
  const siswa = siswaKelas.find((item) => item.id_siswa === idSiswa)
  if (!siswa) return null

  const [{ data: nilai }, catatan, pejabat] = await Promise.all([
    fetchNilaiKurmerKelas(filterEfektif),
    fetchCatatanKurmer(idSiswa, filterEfektif),
    fetchPejabatUntukCetak({ unit: siswa.unit || unitLogin(currentUser), kelas: siswa.kelas, idSiswa, namaSiswa: siswa.nama_siswa }),
  ])

  const milik = nilai.filter((row) => row.id_siswa === idSiswa)
  const ringkas = ringkasNilaiSiswa(milik, filterEfektif.jenisAsesmen)
  const namaWali = catatan?.nama_wali || teks(currentUser?.nama_lengkap || currentUser?.nama || currentUser?.username)
  const namaKepsek = catatan?.nama_kepsek || pejabat.kepsek.nama

  return {
    siswa,
    filter: filterEfektif,
    periode: {
      tahunAjaran: filterEfektif.tahunAjaran,
      semester: filterEfektif.semester,
      labelSemester: labelSemesterKurmer(filterEfektif.semester),
      fase: faseKurmer(siswa.kelas),
    },
    umum: ringkas.umum,
    diniyyah: ringkas.diniyyah,
    statistik: ringkas.statistik,
    catatan: {
      id_siswa: idSiswa,
      kelas: siswa.kelas,
      tahun_ajaran: filterEfektif.tahunAjaran,
      semester: filterEfektif.semester,
      jenis_asesmen: filterEfektif.jenisAsesmen,
      catatan_wali: catatan?.catatan_wali || '',
      nama_wali: namaWali,
      nama_kepsek: namaKepsek,
    },
    kepsek: { nama: namaKepsek, niy: pejabat.kepsek.niy },
    lokasi: pejabat.lokasi || teks(siswa.unit),
  }
}
