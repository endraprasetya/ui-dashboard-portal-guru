import {
  jumlahkanPos,
  labelPeriodeBerjalan,
  labelTapel,
  jenisItem,
  namaItem,
  rincianDariTagihan,
  SEKOLAH_AMPSS,
  gabungTagihanPsb,
  saringPsbSekolah,
  saringTagihanAktif,
  susunRekapanTagihan,
  uraiBelumTerbayar,
  uraiDirektoriSiswa,
  uraiPenerimaan,
  uraiPsb,
  uraiRombel,
  type BarisTagihan,
} from './ampss-urai'
import type { DetailTunggakan, RekapKeuangan, RekapKelas, RincianTagihan, SiswaTunggakan } from './keuangan-tipe'

const UMUR_CACHE_MS = 5 * 60 * 1000
const BATAS_MS = 45_000

type Sesi = Map<string, string>

let sesi: Sesi | null = null
let antrianMasuk: Promise<Sesi> | null = null
let cache: { at: number; data: RekapKeuangan } | null = null
let rincian = new Map<string, RincianTagihan[]>()
let tugas: Promise<RekapKeuangan> | null = null

function wajibEnv(nama: string): string {
  const nilai = process.env[nama]?.trim()
  if (!nilai) throw new Error(`Pengaturan server ${nama} belum diisi.`)
  return nilai
}

function dasarUrl(): string {
  return (process.env.AMPSS_BASE_URL || 'https://ampss.net').replace(/\/$/, '')
}

function sekolahAktif(): { id: string; nama: string } {
  const id = (process.env.AMPSS_SCHOOL_ID || '23').trim()
  const nama = SEKOLAH_AMPSS[id]
  if (!nama) throw new Error('Kode sekolah AMPSS tidak dikenali.')
  return { id, nama }
}

function headerCookie(peta: Sesi): string {
  return [...peta.entries()].map(([kunci, nilai]) => `${kunci}=${nilai}`).join('; ')
}

function simpanCookie(respon: Response, peta: Sesi) {
  const daftar = typeof respon.headers.getSetCookie === 'function' ? respon.headers.getSetCookie() : []
  for (const mentah of daftar) {
    const pasangan = mentah.split(';')[0]
    const batas = pasangan.indexOf('=')
    if (batas <= 0) continue
    peta.set(pasangan.slice(0, batas).trim(), pasangan.slice(batas + 1).trim())
  }
}

async function minta(url: string, init: RequestInit & { sesi?: Sesi } = {}): Promise<Response> {
  const headers = new Headers(init.headers)
  headers.set('User-Agent', 'PortalGuru-KepalaSekolah/1.0')
  if (init.sesi && init.sesi.size > 0) headers.set('Cookie', headerCookie(init.sesi))
  return fetch(url, { ...init, headers, signal: AbortSignal.timeout(BATAS_MS) })
}

async function masukAdmin(): Promise<Sesi> {
  const dasar = dasarUrl()
  const peta: Sesi = new Map()
  const halaman = await minta(`${dasar}/login`, { redirect: 'manual', sesi: peta })
  simpanCookie(halaman, peta)
  const html = await halaman.text()
  const token = html.match(/name="_token" value="([^"]+)"/)?.[1]
  if (!token) throw new Error('Halaman masuk AMPSS tidak menyediakan token keamanan.')

  const badan = new URLSearchParams({
    _token: token,
    username: wajibEnv('AMPSS_USERNAME'),
    password: wajibEnv('AMPSS_PASSWORD'),
  })
  const masuk = await minta(`${dasar}/login`, {
    method: 'POST',
    redirect: 'manual',
    sesi: peta,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Referer: `${dasar}/login`,
    },
    body: badan,
  })
  simpanCookie(masuk, peta)
  const tujuan = masuk.headers.get('location') || ''
  if (masuk.status !== 302 && masuk.status !== 303) throw new Error('Login admin AMPSS ditolak.')
  if (tujuan.includes('/login')) throw new Error('Login admin AMPSS ditolak.')
  if (!peta.has('laravel_session')) throw new Error('Sesi admin AMPSS tidak terbentuk.')
  return peta
}

async function pastikanSesi(): Promise<Sesi> {
  if (sesi) return sesi
  if (!antrianMasuk) {
    antrianMasuk = masukAdmin()
      .then((peta) => {
        sesi = peta
        return peta
      })
      .finally(() => {
        antrianMasuk = null
      })
  }
  return antrianMasuk
}

async function ambilHtml(jalur: string, percobaan = 0): Promise<string> {
  const peta = await pastikanSesi()
  const respon = await minta(`${dasarUrl()}${jalur}`, { redirect: 'manual', sesi: peta })
  const tujuan = respon.headers.get('location') || ''
  if ((respon.status === 302 || respon.status === 303) && tujuan.includes('/login') && percobaan < 1) {
    sesi = null
    return ambilHtml(jalur, percobaan + 1)
  }
  if (!respon.ok) throw new Error(`AMPSS menolak permintaan (${respon.status}).`)
  const html = await respon.text()
  if (html.includes('name="username"') && html.includes('Masukkan username') && percobaan < 1) {
    sesi = null
    return ambilHtml(jalur, percobaan + 1)
  }
  return html
}

function susunSiswa(
  rombel: { nis: string; nama: string; kelas: string }[],
  direktori: Map<string, { nama: string; kelas: string }>,
  tagihan: BarisTagihan[],
): { siswa: SiswaTunggakan[]; rincian: Map<string, RincianTagihan[]> } {
  const aktif = new Map(rombel.map((baris) => [baris.nis, baris]))
  const perNis = new Map<string, RincianTagihan[]>()
  for (const baris of tagihan) {
    const daftar = perNis.get(baris.nis) || []
    daftar.push(rincianDariTagihan(baris))
    perNis.set(baris.nis, daftar)
  }

  const siswa: SiswaTunggakan[] = []
  for (const nis of new Set([...aktif.keys(), ...perNis.keys()])) {
    const rombelSiswa = aktif.get(nis)
    const arsip = direktori.get(nis)
    const detail = (perNis.get(nis) || []).sort((a, b) => b.tapel.localeCompare(a.tapel) || a.item.localeCompare(b.item, 'id'))
    const tunggakan = detail.reduce((jumlah, item) => jumlah + item.jumlah, 0)
    perNis.set(nis, detail)
    siswa.push({
      nis,
      nama: rombelSiswa?.nama || arsip?.nama || `NIS ${nis}`,
      kelas: rombelSiswa?.kelas || arsip?.kelas || '—',
      tunggakan,
      status: tunggakan > 0 ? 'Menunggak' : 'Lunas',
      aktif: Boolean(rombelSiswa),
      jumlahTagihan: detail.length,
    })
  }

  siswa.sort((a, b) => b.tunggakan - a.tunggakan || a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'))
  return { siswa, rincian: perNis }
}

function rekapKelas(siswa: SiswaTunggakan[]): RekapKelas[] {
  const peta = new Map<string, RekapKelas>()
  for (const baris of siswa) {
    if (!baris.aktif) continue
    const kini = peta.get(baris.kelas) || { kelas: baris.kelas, siswa: 0, menunggak: 0, lunas: 0, piutang: 0 }
    kini.siswa += 1
    kini.piutang += baris.tunggakan
    if (baris.status === 'Menunggak') kini.menunggak += 1
    else kini.lunas += 1
    peta.set(baris.kelas, kini)
  }
  return [...peta.values()].sort((a, b) => b.piutang - a.piutang || a.kelas.localeCompare(b.kelas, 'id', { numeric: true }))
}

async function bangun(): Promise<RekapKeuangan> {
  const sekolah = sekolahAktif()
  const tapelDiminta = (process.env.AMPSS_TAPEL || '2627').trim()
  const [rombelHtml, belumHtml, siswaHtml, laporanHtml, psbHtml] = await Promise.all([
    ambilHtml(`/rombongan_belajar?r_tapel=${encodeURIComponent(tapelDiminta)}&r_school=${encodeURIComponent(sekolah.id)}&r_kelas=`),
    ambilHtml(`/belum_terbayar?school_2=${encodeURIComponent(sekolah.id)}`),
    ambilHtml('/siswa').catch(() => ''),
    ambilHtml('/report_index').catch(() => ''),
    ambilHtml('/psb'),
  ])

  if (!rombelHtml.includes(sekolah.nama)) throw new Error(`Rombel ${sekolah.nama} tidak ditemukan di AMPSS.`)
  if (!belumHtml.includes(sekolah.nama)) throw new Error(`Daftar tagihan ${sekolah.nama} tidak ditemukan di AMPSS.`)
  if (!psbHtml.includes('Daftar Tagihan PSB')) throw new Error('Daftar tagihan PSB tidak ditemukan di AMPSS.')

  const rombel = uraiRombel(rombelHtml)
  const sekarang = new Date()
  const psb = saringPsbSekolah(uraiPsb(psbHtml), sekolah.id, rombel.siswa.map((baris) => baris.nis))
  const tagihan = saringTagihanAktif(gabungTagihanPsb(uraiBelumTerbayar(belumHtml), psb), sekarang)
  const tapel = rombel.tapel || tapelDiminta
  const direktori = siswaHtml ? uraiDirektoriSiswa(siswaHtml) : new Map<string, { nama: string; kelas: string }>()
  for (const baris of psb) {
    if (!direktori.has(baris.nis) && baris.nama) direktori.set(baris.nis, { nama: baris.nama, kelas: '—' })
  }
  const penerimaan = laporanHtml ? uraiPenerimaan(laporanHtml, sekolah.nama) : { total: 0, perItem: [] }
  const susunan = susunSiswa(rombel.siswa, direktori, tagihan)
  rincian = susunan.rincian

  const siswaAktif = susunan.siswa.filter((baris) => baris.aktif)
  const menunggak = susunan.siswa.filter((baris) => baris.status === 'Menunggak')

  return {
    sekolah: sekolah.nama,
    sekolahId: sekolah.id,
    tapel,
    diambilPada: new Date().toISOString(),
    piutang: menunggak.reduce((jumlah, baris) => jumlah + baris.tunggakan, 0),
    penerimaanHariIni: penerimaan.total,
    siswaAktif: siswaAktif.length,
    siswaLunas: siswaAktif.filter((baris) => baris.status === 'Lunas').length,
    siswaMenunggak: menunggak.length,
    diLuarRombel: menunggak.filter((baris) => !baris.aktif).length,
    penerimaanPerItem: penerimaan.perItem,
    piutangPerJenis: jumlahkanPos(
      tagihan.map((baris) => [jenisItem(baris.kode, namaItem(baris.kode)), baris.jumlah] as [string, number]),
    ),
    piutangPerTapel: jumlahkanPos(tagihan.map((baris) => [labelTapel(baris.tapel), baris.jumlah] as [string, number])).sort((a, b) =>
      b.nama.localeCompare(a.nama, 'id'),
    ),
    perKelas: rekapKelas(susunan.siswa),
    siswa: susunan.siswa,
    periodeTagihan: labelPeriodeBerjalan(tapel, sekarang),
    rekapan: susunRekapanTagihan(rombel.siswa, direktori, tagihan, tapel, sekarang),
  }
}

export async function muatRekapKeuangan(segar = false): Promise<RekapKeuangan> {
  if (!segar && cache && Date.now() - cache.at < UMUR_CACHE_MS) return cache.data
  if (tugas) return tugas
  tugas = bangun()
    .then((data) => {
      cache = { at: Date.now(), data }
      return data
    })
    .finally(() => {
      tugas = null
    })
  return tugas
}

export async function muatDetailTunggakan(nis: string): Promise<DetailTunggakan | null> {
  if (!/^\d{3,12}$/.test(nis)) return null
  const rekap = await muatRekapKeuangan(false)
  const siswa = rekap.siswa.find((baris) => baris.nis === nis)
  if (!siswa) return null
  return {
    nis: siswa.nis,
    nama: siswa.nama,
    kelas: siswa.kelas,
    tunggakan: siswa.tunggakan,
    status: siswa.status,
    rincian: rincian.get(nis) || [],
  }
}
