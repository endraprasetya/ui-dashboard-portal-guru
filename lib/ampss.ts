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

const UA_PERAMBAN =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function headerCookie(peta: Sesi): string {
  return [...peta.entries()].map(([kunci, nilai]) => `${kunci}=${nilai}`).join('; ')
}

function daftarSetCookie(respon: Response): string[] {
  if (typeof respon.headers.getSetCookie === 'function') {
    const daftar = respon.headers.getSetCookie()
    if (daftar.length > 0) return daftar
  }
  const headers = respon.headers as Headers & { getAll?: (nama: string) => string[]; raw?: () => Record<string, string[]> }
  const getAll = headers.getAll?.('set-cookie')
  if (getAll?.length) return getAll
  const mentah = headers.raw?.()['set-cookie']
  if (mentah?.length) return mentah
  const satu = respon.headers.get('set-cookie')
  if (!satu) return []
  return satu.split(/,(?=\s*[A-Za-z0-9_-]+=)/)
}

function cookieKedaluwarsa(mentah: string) {
  const rendah = mentah.toLowerCase()
  if (/\bmax-age=\s*0\b/.test(rendah)) return true
  const kedaluwarsa = mentah.match(/expires=([^;]+)/i)?.[1]
  if (kedaluwarsa) {
    const waktu = Date.parse(kedaluwarsa)
    if (Number.isFinite(waktu) && waktu <= Date.now()) return true
  }
  return false
}

function simpanCookie(respon: Response, peta: Sesi) {
  for (const mentah of daftarSetCookie(respon)) {
    const pasangan = mentah.split(';')[0]
    const batas = pasangan.indexOf('=')
    if (batas <= 0) continue
    const kunci = pasangan.slice(0, batas).trim()
    const nilai = pasangan.slice(batas + 1).trim()
    if (!kunci) continue
    if (!nilai || cookieKedaluwarsa(mentah)) {
      peta.delete(kunci)
      continue
    }
    peta.set(kunci, nilai)
  }
}

function tokenXsrf(peta: Sesi) {
  const mentah = peta.get('XSRF-TOKEN')
  if (!mentah) return ''
  try {
    return decodeURIComponent(mentah)
  } catch {
    return mentah
  }
}

function urlPenuh(jalur: string) {
  if (/^https?:\/\//i.test(jalur)) return jalur
  return `${dasarUrl()}${jalur.startsWith('/') ? jalur : `/${jalur}`}`
}

function jalurDariUrl(url: string) {
  try {
    return new URL(url, dasarUrl()).pathname.toLowerCase()
  } catch {
    return url.toLowerCase()
  }
}

function adalahRedirectMasuk(tujuan: string) {
  const jalur = jalurDariUrl(tujuan)
  return jalur === '/login' || jalur.startsWith('/login/') || jalur === '/filter'
}

function halamanLogin(html: string) {
  return html.includes('name="username"') && (html.includes('Masukkan username') || html.includes('name="password"'))
}

function adalahAlihan(status: number) {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308
}

async function minta(url: string, init: RequestInit & { sesi?: Sesi; referer?: string } = {}): Promise<Response> {
  const { sesi: peta, referer, headers: headersAwal, signal, ...sisa } = init
  const headers = new Headers(headersAwal)
  headers.set('User-Agent', UA_PERAMBAN)
  headers.set('Accept', 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8')
  headers.set('Accept-Language', 'id-ID,id;q=0.9,en;q=0.8')
  headers.set('Origin', dasarUrl())
  if (referer) headers.set('Referer', referer)
  if (peta && peta.size > 0) headers.set('Cookie', headerCookie(peta))
  const xsrf = peta ? tokenXsrf(peta) : ''
  if (xsrf) headers.set('X-XSRF-TOKEN', xsrf)
  return fetch(url, {
    ...sisa,
    headers,
    redirect: sisa.redirect ?? 'manual',
    cache: 'no-store',
    signal: signal ?? AbortSignal.timeout(BATAS_MS),
  })
}

async function ikutiRedirect(respon: Response, peta: Sesi, referer: string, hop = 0): Promise<Response> {
  simpanCookie(respon, peta)
  if (!adalahAlihan(respon.status)) return respon
  const tujuan = respon.headers.get('location')
  if (!tujuan) return respon
  const jalur = jalurDariUrl(tujuan)
  if (jalur === '/login' || jalur.startsWith('/login/')) return respon
  if (hop >= 8) throw new Error('AMPSS mengalihkan permintaan terlalu banyak.')
  const url = urlPenuh(tujuan)
  const berikutnya = await minta(url, { redirect: 'manual', sesi: peta, referer })
  const tujuanBerikut = berikutnya.headers.get('location') || ''
  if (adalahAlihan(berikutnya.status) && jalurDariUrl(tujuanBerikut) === jalur) {
    simpanCookie(berikutnya, peta)
    return berikutnya
  }
  return ikutiRedirect(berikutnya, peta, url, hop + 1)
}

async function masukAdmin(): Promise<Sesi> {
  const dasar = dasarUrl()
  const peta: Sesi = new Map()
  const halaman = await ikutiRedirect(await minta(`${dasar}/login`, { redirect: 'manual', sesi: peta, referer: `${dasar}/login` }), peta, `${dasar}/login`)
  const html = await halaman.text()
  const token = html.match(/name="_token"\s+value="([^"]+)"/)?.[1]
  if (!token) throw new Error('Halaman masuk AMPSS tidak menyediakan token keamanan.')

  const badan = new URLSearchParams({
    _token: token,
    username: wajibEnv('AMPSS_USERNAME'),
    password: wajibEnv('AMPSS_PASSWORD'),
    remember: '1',
  })
  const masuk = await minta(`${dasar}/login`, {
    method: 'POST',
    redirect: 'manual',
    sesi: peta,
    referer: `${dasar}/login`,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: badan,
  })
  simpanCookie(masuk, peta)
  const tujuan = masuk.headers.get('location') || ''
  if (adalahAlihan(masuk.status)) {
    if (jalurDariUrl(tujuan) === '/login' || jalurDariUrl(tujuan).startsWith('/login/')) {
      throw new Error('Login admin AMPSS ditolak.')
    }
    const setelah = await ikutiRedirect(masuk, peta, `${dasar}/login`)
    const htmlSetelah = await setelah.text()
    if (halamanLogin(htmlSetelah) || adalahAlihan(setelah.status)) throw new Error('Login admin AMPSS ditolak.')
  } else if (masuk.status >= 200 && masuk.status < 300) {
    if (halamanLogin(await masuk.text())) throw new Error('Login admin AMPSS ditolak.')
  } else {
    throw new Error(`Login admin AMPSS ditolak (${masuk.status}).`)
  }
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
  const url = urlPenuh(jalur)
  const respon = await minta(url, { redirect: 'manual', sesi: peta, referer: `${dasarUrl()}/filter` })
  const tujuan = respon.headers.get('location') || ''
  if (adalahAlihan(respon.status) && adalahRedirectMasuk(tujuan) && percobaan < 1) {
    sesi = null
    return ambilHtml(jalur, percobaan + 1)
  }
  const akhir = await ikutiRedirect(respon, peta, url)
  const tujuanAkhir = akhir.headers.get('location') || ''
  if (!akhir.ok) {
    if (adalahRedirectMasuk(tujuanAkhir) && percobaan < 1) {
      sesi = null
      return ambilHtml(jalur, percobaan + 1)
    }
    throw new Error(`AMPSS menolak permintaan (${akhir.status}${tujuanAkhir ? ` → ${jalurDariUrl(tujuanAkhir)}` : ''}).`)
  }
  const html = await akhir.text()
  if (halamanLogin(html) && percobaan < 1) {
    sesi = null
    return ambilHtml(jalur, percobaan + 1)
  }
  if (halamanLogin(html)) throw new Error('Sesi admin AMPSS kedaluwarsa.')
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
    ambilHtml('/report_bank').catch(() => ''),
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
