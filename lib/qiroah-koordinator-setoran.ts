import { formatCapaianQiroah, parseCustomDate } from '@/lib/qiroah'
import { kunciHariJakarta } from '@/lib/tahfidz'
import { educationCalendar } from '@/lib/teacher-data'
import { hariLiburSekolah } from '@/lib/jurnal'
import { supabase } from '@/lib/supabase'
import { ambilBarisSiswa, type Siswa } from '@/lib/siswa'

export type SetoranRingkas = {
  id_qiroah?: string
  id_siswa?: string
  nama_siswa?: string
  kelas?: string
  jilid?: string
  halaman?: string
  tanggal?: string
  unit?: string
  status?: string
}

export type StatSetoranSantri = {
  jumlah7: number
  jumlah30: number
  halaman7: number
  halaman30: number
  terakhir: SetoranRingkas | null
}

export type ProgresBulananSantri = {
  siswa: Siswa
  capaianAwal: SetoranRingkas | null
  capaianHari7: SetoranRingkas | null
  capaianAkhir: SetoranRingkas | null
  jumlahSetoranBulan: number
  tempo: 'cepat' | 'normal' | 'lambat'
  anchorHari7: number
  anchorAkhir: number
}

const BULAN_ID: Record<string, number> = {
  jan: 0, january: 0, januari: 0,
  feb: 1, february: 1, februari: 1,
  mar: 2, march: 2, maret: 2,
  apr: 3, april: 3,
  mei: 4, may: 4,
  jun: 5, june: 5, juni: 5,
  jul: 6, july: 6, juli: 6,
  agu: 7, aug: 7, august: 7, agustus: 7,
  sep: 8, sept: 8, september: 8,
  okt: 9, oct: 9, oktober: 9, october: 9,
  nov: 10, november: 10,
  des: 11, dec: 11, desember: 11, december: 11,
}

function tanggalDariTeksLibur(teks: string) {
  const bagian: string[] = []
  for (const item of educationCalendar) {
    bagian.push(item.date, item.detail)
  }
  const hasil = new Set<string>()
  for (const sumber of bagian) {
    const cocok = [...String(sumber).matchAll(/(\d{1,2})\s+([A-Za-z.]+)\s+(\d{4})/g)]
    for (const m of cocok) {
      const bulan = BULAN_ID[m[2].toLowerCase().replace(/\./g, '')]
      if (bulan == null) continue
      const y = Number(m[3])
      const d = Number(m[1])
      const kunci = kunciHariJakarta(new Date(y, bulan, d))
      hasil.add(kunci)
    }
  }
  return hasil
}

const LIBUR_BESAR = tanggalDariTeksLibur('')

export function liburKbm(year: number, month: number, day: number) {
  if (hariLiburSekolah(year, month, day)) return true
  const kunci = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return LIBUR_BESAR.has(kunci)
}

/** Mundur satu hari jika tanggal jatuh pada libur KBM / hari besar. */
export function tanggalEfektifStudi(year: number, month: number, day: number) {
  let d = Math.min(day, new Date(year, month, 0).getDate())
  while (d >= 1 && liburKbm(year, month, d)) d -= 1
  return Math.max(1, d)
}

export function bulanSekarangJakarta() {
  return kunciHariJakarta().slice(0, 7)
}

export function kunciTanggalSetoran(row: SetoranRingkas) {
  const parsed = parseTanggalSetoran(row.tanggal)
  if (!parsed) return ''
  return kunciHariJakarta(parsed)
}

export function setoranDalamBulan(row: SetoranRingkas, bulan: string) {
  const kunci = kunciTanggalSetoran(row)
  return Boolean(kunci && kunci.startsWith(`${bulan}-`))
}

export function kunciIdSiswa(id: unknown) {
  return String(id ?? '').trim().toUpperCase()
}

export function normKelas(kelas: unknown) {
  return String(kelas ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

/** Tanggal setoran — ISO, YYYY-MM-DD, atau format DD/MM/YYYY seperti di form lama. */
export function parseTanggalSetoran(dateStr: unknown): Date | null {
  const raw = String(dateStr ?? '').trim()
  if (!raw) return null

  if (raw.includes('/')) {
    const dariKustom = parseCustomDate(raw)
    if (dariKustom && !Number.isNaN(dariKustom.getTime())) return dariKustom
  }

  const iso = new Date(raw)
  if (!Number.isNaN(iso.getTime())) return iso

  const awal = raw.slice(0, 10)
  if (/^\d{4}-\d{2}-\d{2}$/.test(awal)) {
    const fix = new Date(`${awal}T12:00:00+07:00`)
    if (!Number.isNaN(fix.getTime())) return fix
  }
  return null
}

/** Apakah tanggal setoran berada dalam N hari kalender terakhir (zona Asia/Jakarta, inklusif hari ini). */
export function dalamRentangHariJakarta(dateStr: unknown, jumlahHari: number, hariAkhir = new Date()) {
  const kunciAkhir = kunciHariJakarta(hariAkhir)
  const [y, m, d] = kunciAkhir.split('-').map(Number)
  const mulaiUtc = new Date(Date.UTC(y, m - 1, d))
  mulaiUtc.setUTCDate(mulaiUtc.getUTCDate() - (jumlahHari - 1))
  const kunciMulai = kunciHariJakarta(mulaiUtc)

  const parsed = parseTanggalSetoran(dateStr)
  if (!parsed) return false
  const kunci = kunciHariJakarta(parsed)
  return kunci >= kunciMulai && kunci <= kunciAkhir
}

function angkaHalaman(teks: unknown) {
  const s = String(teks ?? '').trim()
  if (!s || s === '-') return 0
  const n = parseInt(s.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) && n > 0 ? n : 1
}

/** Pemetaan id_siswa / NIS di setoran → id kanonik dari tabel siswa. */
export function buatAliasSiswa(siswa: Siswa[]) {
  const keKanin = new Map<string, string>()
  for (const s of siswa) {
    const kanon = String(s.id_siswa)
    keKanin.set(kunciIdSiswa(s.id_siswa), kanon)
    const nis = kunciIdSiswa(s.nis)
    if (nis) keKanin.set(nis, kanon)
  }
  return keKanin
}

function idKanunSetoran(row: SetoranRingkas, alias: Map<string, string>) {
  const k = kunciIdSiswa(row.id_siswa)
  return alias.get(k) || String(row.id_siswa || '').trim()
}

export async function muatSetoranQiroah(
  siswa: Siswa[],
  opsi?: { bulan?: string },
): Promise<SetoranRingkas[]> {
  const ids = Array.from(new Set(siswa.map((s) => String(s.id_siswa).trim()).filter(Boolean)))
  if (ids.length === 0) return []

  const kolom =
    'id_qiroah,id_siswa,nama_siswa,kelas,jilid,halaman,tanggal,unit,status'

  let tanggalDari: string | undefined
  if (opsi?.bulan && /^\d{4}-\d{2}$/.test(opsi.bulan)) {
    const [y, m] = opsi.bulan.split('-').map(Number)
    const basis = new Date(Date.UTC(y, m - 2, 1, 0, 0, 0))
    tanggalDari = basis.toISOString()
  }

  const viaIds = await ambilBarisSiswa(ids, (bagian, from, to) => {
    let q = supabase
      .from('setoran_qiroah')
      .select(kolom)
      .in('id_siswa', bagian)
      .order('tanggal', { ascending: false, nullsFirst: false })
    if (tanggalDari) q = q.gte('tanggal', tanggalDari)
    return q.range(from, to)
  })

  const nisList = siswa
    .map((s) => String(s.nis || '').trim())
    .filter((n) => n && !ids.some((id) => kunciIdSiswa(id) === kunciIdSiswa(n)))

  let viaNis: SetoranRingkas[] = []
  if (nisList.length > 0) {
    viaNis = await ambilBarisSiswa(nisList, (bagian, from, to) => {
      let q = supabase
        .from('setoran_qiroah')
        .select(kolom)
        .in('id_siswa', bagian)
        .order('tanggal', { ascending: false, nullsFirst: false })
      if (tanggalDari) q = q.gte('tanggal', tanggalDari)
      return q.range(from, to)
    })
  }

  const peta = new Map<string, SetoranRingkas>()
  const gabung = [...viaIds, ...viaNis] as SetoranRingkas[]
  for (const row of gabung) {
    const k = String(row.id_qiroah || `${row.id_siswa}|${row.tanggal}|${row.jilid}|${row.halaman}`)
    peta.set(k, row)
  }

  const hasil = [...peta.values()]
  if (!opsi?.bulan) return hasil
  return hasil.filter((row) => {
    if (setoranDalamBulan(row, opsi.bulan!)) return true
    const kunci = kunciTanggalSetoran(row)
    const [y, m] = opsi.bulan!.split('-').map(Number)
    const awal = `${y}-${String(m).padStart(2, '0')}-01`
    return Boolean(kunci && kunci < awal)
  })
}

function capaianPadaTanggal(daftar: SetoranRingkas[], anchorYmd: string) {
  const cocok = daftar
    .map((row) => ({ row, kunci: kunciTanggalSetoran(row) }))
    .filter((x) => x.kunci && x.kunci <= anchorYmd)
    .sort((a, b) => b.kunci.localeCompare(a.kunci))
  return cocok[0]?.row ?? null
}

function adaPerubahanCapaian(a: SetoranRingkas | null, b: SetoranRingkas | null) {
  if (!a && !b) return false
  if (!b) return false
  return formatCapaianQiroah(a) !== formatCapaianQiroah(b)
}

export function hitungProgresBulananSantri(
  siswa: Siswa[],
  setoran: SetoranRingkas[],
  bulan: string,
): ProgresBulananSantri[] {
  if (!/^\d{4}-\d{2}$/.test(bulan)) return []

  const [year, month] = bulan.split('-').map(Number)
  const hari7 = tanggalEfektifStudi(year, month, 7)
  const hariAkhir = tanggalEfektifStudi(year, month, new Date(year, month, 0).getDate())
  const awalYmd = `${bulan}-01`
  const ymd7 = `${bulan}-${String(hari7).padStart(2, '0')}`
  const ymdAkhir = `${bulan}-${String(hariAkhir).padStart(2, '0')}`

  const alias = buatAliasSiswa(siswa)
  const perSiswa = new Map<string, SetoranRingkas[]>()
  for (const row of setoran) {
    const id = idKanunSetoran(row, alias)
    if (!id) continue
    const daftar = perSiswa.get(id) || []
    daftar.push(row)
    perSiswa.set(id, daftar)
  }

  const jumlahBulanKelas = new Map<string, number[]>()

  const baris = siswa.map((s) => {
    const daftar = perSiswa.get(s.id_siswa) || []
    const capaianAwal = capaianPadaTanggal(daftar, awalYmd)
    const capaianHari7 = capaianPadaTanggal(daftar, ymd7)
    const capaianAkhir = capaianPadaTanggal(daftar, ymdAkhir)
    const jumlahSetoranBulan = daftar.filter((row) => setoranDalamBulan(row, bulan)).length

    return {
      siswa: s,
      capaianAwal,
      capaianHari7,
      capaianAkhir,
      jumlahSetoranBulan,
      tempo: 'normal' as 'cepat' | 'normal' | 'lambat',
      anchorHari7: hari7,
      anchorAkhir: hariAkhir,
    }
  })

  for (const row of baris) {
    const kelas = String(row.siswa.kelas || '-')
    const bucket = jumlahBulanKelas.get(kelas) || []
    bucket.push(row.jumlahSetoranBulan)
    jumlahBulanKelas.set(kelas, bucket)
  }

  return baris.map((row) => {
    const kelas = String(row.siswa.kelas || '-')
    const list = jumlahBulanKelas.get(kelas) || []
    const rata = list.length ? list.reduce((a, b) => a + b, 0) / list.length : 0
    let tempo: 'cepat' | 'normal' | 'lambat' = 'normal'
    if (row.jumlahSetoranBulan === 0 && !adaPerubahanCapaian(row.capaianAwal, row.capaianAkhir)) {
      tempo = 'lambat'
    } else if (rata > 0 && row.jumlahSetoranBulan >= rata * 1.35) {
      tempo = 'cepat'
    } else if (row.jumlahSetoranBulan === 0) {
      tempo = 'lambat'
    } else if (rata > 0 && row.jumlahSetoranBulan < rata * 0.45) {
      tempo = 'lambat'
    }

    return { ...row, tempo }
  })
}

export function hitungStatSetoranPerSantri(
  siswa: Siswa[],
  setoran: SetoranRingkas[],
): Map<string, StatSetoranSantri> {
  const alias = buatAliasSiswa(siswa)
  const hasil = new Map<string, StatSetoranSantri>()

  for (const s of siswa) {
    hasil.set(s.id_siswa, { jumlah7: 0, jumlah30: 0, halaman7: 0, halaman30: 0, terakhir: null })
  }

  for (const row of setoran) {
    const id = idKanunSetoran(row, alias)
    if (!id || !hasil.has(id)) continue

    const entri = hasil.get(id)!
    const dalam7 = dalamRentangHariJakarta(row.tanggal, 7)
    const dalam30 = dalamRentangHariJakarta(row.tanggal, 30)
    const lembar = angkaHalaman(row.halaman)

    if (dalam7) {
      entri.jumlah7 += 1
      entri.halaman7 += lembar
    }
    if (dalam30) {
      entri.jumlah30 += 1
      entri.halaman30 += lembar
    }

    const waktu = parseTanggalSetoran(row.tanggal)?.getTime() ?? 0
    const waktuTerakhir = entri.terakhir ? parseTanggalSetoran(entri.terakhir.tanggal)?.getTime() ?? 0 : 0
    if (!entri.terakhir || waktu >= waktuTerakhir) {
      entri.terakhir = row
    }
  }

  return hasil
}

export function tempoProgresSantri(jumlah7: number, rataKelas7: number): 'cepat' | 'normal' | 'lambat' {
  if (jumlah7 === 0) return 'lambat'
  if (rataKelas7 > 0 && jumlah7 >= rataKelas7 * 1.4) return 'cepat'
  if (rataKelas7 > 0 && jumlah7 < rataKelas7 * 0.5) return 'lambat'
  return 'normal'
}
