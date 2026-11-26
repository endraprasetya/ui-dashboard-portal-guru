export type KelompokSidia = 'Putra' | 'Putri'

export type StatusKehadiranSidia = 'Masuk' | 'Tidak Masuk' | 'Izin'

export type KetepatanSidia = 'Terlambat' | 'Awal Waktu' | 'Tepat Waktu' | '—'

export type BarisAbsensiSidia = {
  tanggal: string
  kelompok: KelompokSidia
  lembaga: string
  namaGuru: string
  status: StatusKehadiranSidia
  ketepatan: KetepatanSidia
  jamMasuk?: string
  jamPulang?: string
  keterangan: string
  /** Foto bukti absen masuk (IN). */
  fotoUrl?: string
  /** Foto bukti absen pulang (OUT). */
  fotoPulangUrl?: string
  sumberAkun: KelompokSidia
}

export type RekapAbsensiSidia = {
  tanggal: string
  diambilPada: string
  catatan: string[]
  ringkas: {
    total: number
    masuk: number
    izin: number
    tidakMasuk: number
    terlambat: number
    tepatWaktu: number
    awalWaktu: number
  }
  baris: BarisAbsensiSidia[]
}

export type SelBulanSidia = {
  status: StatusKehadiranSidia
  ketepatan: KetepatanSidia
  jamMasuk?: string
  jamPulang?: string
}

export type BarisBulanSidia = {
  kelompok: KelompokSidia
  lembaga: string
  namaGuru: string
  hari: Record<string, SelBulanSidia>
}

export type RekapBulananSidia = {
  tahun: number
  bulan: number
  jumlahHari: number
  labelBulan: string
  diambilPada: string
  catatan: string[]
  lembaga: string[]
  baris: BarisBulanSidia[]
}

type BarisMentahSidia = unknown[]

const UMUR_SESI_MS = 25 * 60 * 1000
const BATAS_MS = 55_000

type SesiSidia = { cookie: string; at: number }
const sesi = new Map<KelompokSidia, SesiSidia>()
const antrian = new Map<KelompokSidia, Promise<SesiSidia>>()

function dasarUrl() {
  return (process.env.SIDIA_BASE_URL || 'https://pptqalmadinah.com/sitqam').replace(/\/$/, '')
}

function kredensial(kelompok: KelompokSidia) {
  if (kelompok === 'Putra') {
    const usn = process.env.SIDIA_PUTRA_USERNAME?.trim()
    const pss = process.env.SIDIA_PUTRA_PASSWORD?.trim()
    if (!usn || !pss) throw new Error('SIDIA_PUTRA_USERNAME / SIDIA_PUTRA_PASSWORD belum diisi di server.')
    return { usn, pss }
  }
  const usn = process.env.SIDIA_PUTRI_USERNAME?.trim()
  const pss = process.env.SIDIA_PUTRI_PASSWORD?.trim()
  if (!usn || !pss) throw new Error('SIDIA_PUTRI_USERNAME / SIDIA_PUTRI_PASSWORD belum diisi di server.')
  return { usn, pss }
}

function stripHtml(nilai: string) {
  return nilai.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

function urlGambar(html: string) {
  const m = html.match(/src="([^"]+)"/i)
  return m?.[1]?.trim()
}

const PETA_BULAN: Record<string, number> = {
  jan: 1,
  feb: 2,
  mar: 3,
  apr: 4,
  may: 5,
  mei: 5,
  jun: 6,
  jul: 7,
  aug: 8,
  agu: 8,
  sep: 9,
  oct: 10,
  okt: 10,
  nov: 11,
  dec: 12,
  des: 12,
}

function parseTanggalSidia(html: string, jamFallback?: string) {
  const jamMatch = html.match(/JAM:\s*([\d:]+)/i)
  const jam = (jamMatch?.[1] || jamFallback || '').trim()
  const teks = stripHtml(html)
  const m = teks.match(/(\d{1,2})\s+([A-Za-z]+),?\s*(\d{4})/)
  if (!m) return { tanggal: '', jam }
  const bulan = PETA_BULAN[m[2].slice(0, 3).toLowerCase()]
  if (!bulan) return { tanggal: '', jam }
  const tanggal = `${m[3]}-${String(bulan).padStart(2, '0')}-${String(m[1]).padStart(2, '0')}`
  return { tanggal, jam }
}

function kelompokDariLembaga(lembaga: string): KelompokSidia {
  return /\(PUTRI\)/i.test(lembaga) ? 'Putri' : 'Putra'
}

function klasifikasiKetepatan(teks: string): KetepatanSidia {
  const t = teks.toLowerCase()
  if (!t) return 'Tepat Waktu'
  if (t.includes('telat') || t.includes('terlambat')) return 'Terlambat'
  if (t.includes('awal') || t.includes('cepat') || t.includes('early')) return 'Awal Waktu'
  if (t.includes('tepat')) return 'Tepat Waktu'
  return '—'
}

function normNama(nama: string) {
  return nama.trim().toLowerCase().replace(/\s+/g, ' ')
}

function cookieDariRespon(res: Response) {
  const headers =
    typeof (res.headers as Headers & { getSetCookie?: () => string[] }).getSetCookie === 'function'
      ? (res.headers as Headers & { getSetCookie: () => string[] }).getSetCookie()
      : []
  const gabung = [...headers, res.headers.get('set-cookie') || ''].filter(Boolean)
  for (const potong of gabung) {
    const m = potong.match(/ci_session=([^;]+)/)
    if (m) return `ci_session=${m[1]}`
  }
  return null
}

async function loginSidia(kelompok: KelompokSidia): Promise<SesiSidia> {
  const ada = sesi.get(kelompok)
  if (ada && Date.now() - ada.at < UMUR_SESI_MS) return ada
  const jalan = antrian.get(kelompok)
  if (jalan) return jalan

  const tugas = (async () => {
    const { usn, pss } = kredensial(kelompok)
    const url = `${dasarUrl()}/auth/chekingdata`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
      body: new URLSearchParams({ usn, pss }),
      signal: AbortSignal.timeout(BATAS_MS),
    })
    const json = (await res.json().catch(() => null)) as { result?: boolean; status?: string } | null
    if (!json?.result) throw new Error(`Login SIDIA (${kelompok}) ditolak.`)
    const cookie = cookieDariRespon(res)
    if (!cookie) throw new Error(`Sesi SIDIA (${kelompok}) tidak menerima cookie.`)
    const data = { cookie, at: Date.now() }
    sesi.set(kelompok, data)
    return data
  })()

  antrian.set(kelompok, tugas)
  try {
    return await tugas
  } finally {
    antrian.delete(kelompok)
  }
}

function sidikBaris(row: BarisMentahSidia) {
  return JSON.stringify(Array.isArray(row) ? row.slice(0, 6) : row)
}

async function ambilBarisRentang(kelompok: KelompokSidia, dari: string, sampai: string) {
  const { cookie } = await loginSidia(kelompok)
  const url = `${dasarUrl()}/laporan_api/absensi_guru/get_data`
  const panjang = 2500
  const semua: BarisMentahSidia[] = []
  const sudah = new Set<string>()

  for (let halaman = 0, start = 0; halaman < 12; halaman += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json',
        Cookie: cookie,
      },
      body: new URLSearchParams({
        ds: dari,
        de: sampai,
        draw: String(halaman + 1),
        start: String(start),
        length: String(panjang),
      }),
      signal: AbortSignal.timeout(BATAS_MS),
    })
    const json = (await res.json().catch(() => null)) as {
      data?: BarisMentahSidia[]
      recordsFiltered?: number
      recordsTotal?: number
    } | null
    if (!res.ok || !json?.data) throw new Error(`Data presensi SIDIA (${kelompok}) belum dapat dibaca.`)
    let baru = 0
    for (const row of json.data) {
      const kunci = sidikBaris(row)
      if (sudah.has(kunci)) continue
      sudah.add(kunci)
      semua.push(row)
      baru += 1
    }
    const total = Number(json.recordsFiltered ?? json.recordsTotal ?? 0)
    start += json.data.length
    if (baru === 0 || json.data.length < panjang || (total > 0 && start >= total)) break
  }

  return semua
}

async function ambilBarisMentah(kelompok: KelompokSidia, tanggal: string) {
  return ambilBarisRentang(kelompok, tanggal, tanggal)
}

type AgregatInternal = {
  tanggal: string
  kelompok: KelompokSidia
  lembaga: string
  namaGuru: string
  status: StatusKehadiranSidia
  ketepatan: KetepatanSidia
  jamMasuk?: string
  jamPulang?: string
  keterangan: Set<string>
  fotoMasukUrl?: string
  fotoPulangUrl?: string
  sumberAkun: KelompokSidia
  adaIn: boolean
}

function gabungBarisMentah(baris: BarisMentahSidia[], dari: string, sumber: KelompokSidia, sampai = dari) {
  const map = new Map<string, AgregatInternal>()
  for (const row of baris) {
    if (!Array.isArray(row) || row.length < 6) continue
    const lembaga = String(row[1] || '').trim()
    const namaGuru = String(row[2] || '').trim()
    const tanggalHtml = String(row[3] || '')
    const tipe = String(row[4] || '').trim().toUpperCase()
    const ketepatanHtml = String(row[5] || '')
    const fotoHtml = String(row[6] || '')
    const { tanggal: tgl, jam } = parseTanggalSidia(tanggalHtml)
    if (!tgl) {
      if (dari !== sampai) continue
    } else if (tgl < dari || tgl > sampai) continue
    const tanggalPakai = tgl || dari
    const kelompok = kelompokDariLembaga(lembaga)
    const kunci = `${tanggalPakai}|${kelompok}|${normNama(namaGuru)}`
    let item = map.get(kunci)
    if (!item) {
      item = {
        tanggal: tanggalPakai,
        kelompok,
        lembaga,
        namaGuru,
        status: 'Tidak Masuk',
        ketepatan: '—',
        keterangan: new Set<string>(),
        sumberAkun: sumber,
        adaIn: false,
      }
      map.set(kunci, item)
    }
    const ketTeks = stripHtml(ketepatanHtml)
    if (ketTeks) item.keterangan.add(ketTeks)
    const foto = urlGambar(fotoHtml)

    if (tipe === 'IZIN') {
      item.status = 'Izin'
      item.ketepatan = '—'
      continue
    }
    if (tipe === 'IN') {
      item.status = 'Masuk'
      item.adaIn = true
      if (!item.jamMasuk || (jam && jam.localeCompare(item.jamMasuk) < 0)) {
        item.jamMasuk = jam || item.jamMasuk
        item.ketepatan = klasifikasiKetepatan(ketTeks)
        if (foto) item.fotoMasukUrl = foto
      } else if (foto && !item.fotoMasukUrl) {
        item.fotoMasukUrl = foto
      }
      continue
    }
    if (tipe === 'OUT') {
      if (item.status === 'Tidak Masuk' && !item.adaIn) item.status = 'Masuk'
      if (!item.jamPulang || (jam && jam.localeCompare(item.jamPulang) > 0)) {
        item.jamPulang = jam || item.jamPulang
        if (foto) item.fotoPulangUrl = foto
      } else if (foto && !item.fotoPulangUrl) {
        item.fotoPulangUrl = foto
      }
    }
  }

  const hasil: BarisAbsensiSidia[] = []
  for (const item of map.values()) {
    if (item.status === 'Tidak Masuk' && item.adaIn) item.status = 'Masuk'
    hasil.push({
      tanggal: item.tanggal,
      kelompok: item.kelompok,
      lembaga: item.lembaga,
      namaGuru: item.namaGuru,
      status: item.status,
      ketepatan: item.status === 'Masuk' ? item.ketepatan : '—',
      jamMasuk: item.jamMasuk,
      jamPulang: item.jamPulang,
      keterangan: [...item.keterangan].join(' · ') || '—',
      fotoUrl: item.fotoMasukUrl,
      fotoPulangUrl: item.fotoPulangUrl,
      sumberAkun: item.sumberAkun,
    })
  }
  return hasil.sort(
    (a, b) =>
      a.kelompok.localeCompare(b.kelompok) ||
      a.namaGuru.localeCompare(b.namaGuru, 'id', { sensitivity: 'base' }),
  )
}

function hitungRingkas(baris: BarisAbsensiSidia[]) {
  return {
    total: baris.length,
    masuk: baris.filter((item) => item.status === 'Masuk').length,
    izin: baris.filter((item) => item.status === 'Izin').length,
    tidakMasuk: baris.filter((item) => item.status === 'Tidak Masuk').length,
    terlambat: baris.filter((item) => item.ketepatan === 'Terlambat').length,
    tepatWaktu: baris.filter((item) => item.ketepatan === 'Tepat Waktu').length,
    awalWaktu: baris.filter((item) => item.ketepatan === 'Awal Waktu').length,
  }
}

export async function muatRekapAbsensiSidia(tanggal: string): Promise<RekapAbsensiSidia> {
  const tanggalIso = tanggal.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggalIso)) throw new Error('Format tanggal SIDIA tidak valid (YYYY-MM-DD).')

  const catatan: string[] = []
  const baris: BarisAbsensiSidia[] = []

  for (const kelompok of ['Putra', 'Putri'] as const) {
    try {
      const mentah = await ambilBarisMentah(kelompok, tanggalIso)
      baris.push(...gabungBarisMentah(mentah, tanggalIso, kelompok, tanggalIso))
    } catch (error) {
      catatan.push(error instanceof Error ? error.message : `SIDIA ${kelompok} gagal dimuat.`)
    }
  }

  if (baris.length === 0 && catatan.length > 0) {
    throw new Error(catatan.join(' '))
  }

  return {
    tanggal: tanggalIso,
    diambilPada: new Date().toISOString(),
    catatan,
    ringkas: hitungRingkas(baris),
    baris,
  }
}

const NAMA_BULAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
]

function kunciKaryawan(kelompok: KelompokSidia, nama: string) {
  return `${kelompok}|${normNama(nama)}`
}

/** Rekap satu bulan. SIDIA dipanggil per rentang tanggal (bukan per hari) dan foto tidak ikut dikirim. */
export async function muatRekapBulananSidia(tahun: number, bulan: number): Promise<RekapBulananSidia> {
  if (!Number.isInteger(tahun) || tahun < 2000 || tahun > 2100 || !Number.isInteger(bulan) || bulan < 1 || bulan > 12) {
    throw new Error('Bulan atau tahun rekap presensi tidak valid.')
  }
  const jumlahHari = new Date(tahun, bulan, 0).getDate()
  const mm = String(bulan).padStart(2, '0')
  const dari = `${tahun}-${mm}-01`
  const sampai = `${tahun}-${mm}-${String(jumlahHari).padStart(2, '0')}`
  const hasilKelompok = await Promise.all(
    (['Putra', 'Putri'] as const).map(async (kelompok) => {
      try {
        const mentah = await ambilBarisRentang(kelompok, dari, sampai)
        return { baris: gabungBarisMentah(mentah, dari, kelompok, sampai), catatan: '' }
      } catch (error) {
        return {
          baris: [] as BarisAbsensiSidia[],
          catatan: error instanceof Error ? error.message : `SIDIA ${kelompok} gagal dimuat.`,
        }
      }
    }),
  )
  const catatan = hasilKelompok.map((item) => item.catatan).filter(Boolean)
  const harian = hasilKelompok.flatMap((item) => item.baris)

  if (harian.length === 0 && catatan.length > 0) {
    throw new Error(catatan.join(' '))
  }

  const map = new Map<string, BarisBulanSidia>()
  for (const item of harian) {
    const hari = item.tanggal.slice(8, 10)
    if (!hari) continue
    const kunci = kunciKaryawan(item.kelompok, item.namaGuru)
    let baris = map.get(kunci)
    if (!baris) {
      baris = {
        kelompok: item.kelompok,
        lembaga: item.lembaga || item.kelompok,
        namaGuru: item.namaGuru,
        hari: {},
      }
      map.set(kunci, baris)
    }
    baris.hari[hari] = {
      status: item.status,
      ketepatan: item.ketepatan,
      jamMasuk: item.jamMasuk,
      jamPulang: item.jamPulang,
    }
  }

  const baris = [...map.values()].sort(
    (a, b) =>
      a.kelompok.localeCompare(b.kelompok, 'id') ||
      a.lembaga.localeCompare(b.lembaga, 'id') ||
      a.namaGuru.localeCompare(b.namaGuru, 'id', { sensitivity: 'base' }),
  )
  const lembaga = [...new Set(baris.map((item) => item.lembaga).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'id'),
  )

  return {
    tahun,
    bulan,
    jumlahHari,
    labelBulan: `${NAMA_BULAN[bulan - 1]} ${tahun}`,
    diambilPada: new Date().toISOString(),
    catatan,
    lembaga,
    baris,
  }
}