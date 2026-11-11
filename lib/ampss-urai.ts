import type { BarisRekapan, PosUang, RincianTagihan } from './keuangan-tipe'

const BULAN = ['Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni']

const ITEM_TETAP: Record<string, string> = {
  BPL010: 'Buku Paket Semester 1',
  BPL020: 'Buku Paket Semester 2',
  BPL030: 'Buku Modul TKA',
  L25002: 'Kalender',
  L26003: 'Buku Tahfizh Putra',
  LLL002: 'Kalender',
  E24001: 'Ekskul',
  E24002: 'Ekskul Sem 2',
  EVT001: 'Penilaian Tengah Semester 1',
  EVT002: 'Penilaian Akhir Semester 1',
  EVT003: 'Penilaian Tengah Semester 2',
  EVT004: 'Penilaian Akhir Tahun',
  EVT005: 'Ujian Sekolah',
  EVT006: 'Test Psikologi',
  L24001: 'Camping & Outing Class SMP',
  L25001: 'Outingclass / Rihlah',
  L25003: 'Test Kemampuan Akademik (TKA)',
  L25004: 'Kartu Tanda Santri (KTS)',
  L26002: 'Sampul Raport TQ',
  L26004: 'PKBM Sem 1',
  L26005: 'PKBM Sem 2',
  L26006: 'Ekskul Tahfizh Sem 1',
  L26007: 'Ekskul Tahfizh Sem 2',
  LLL001: 'Seragam',
  INF000: 'Infaq',
  INF001: 'Infak Aplikasi',
  L26001: 'Akhirussannah',
  LLL000: 'Pembayaran SQL',
  PSB000: 'Pendaftaran Siswa Baru',
}

export const SEKOLAH_AMPSS: Record<string, string> = {
  '11': 'KBIP Al Madinah Kartasura',
  '12': 'TKIP Al Madinah Kartasura',
  '13': 'SDIP Al Madinah Kartasura',
  '14': 'SMPIP Al Madinah Kartasura',
  '21': 'KBIP Al Madinah Nogosari',
  '22': 'TKIP Al Madinah Nogosari',
  '23': 'SDIP Al Madinah Nogosari',
  '24': 'SMPIP Al Madinah Nogosari',
  '25': 'MA Al Madinah Nogosari',
  '26': 'Tahfizh Al Madinah Nogosari',
}

export function angkaAmpss(mentah: string): number {
  const teks = mentah.replace(/\s/g, '').replace(/[^\d,.-]/g, '')
  if (!teks || teks === '-' || teks === '.') return 0
  if (teks.includes(',')) {
    const nilai = Number(teks.replace(/,/g, ''))
    return Number.isFinite(nilai) ? nilai : 0
  }
  if (/^\d{1,3}(\.\d{3})+$/.test(teks)) return Number(teks.replace(/\./g, ''))
  const nilai = Number(teks)
  return Number.isFinite(nilai) ? nilai : 0
}

export function teksHtml(mentah: string): string {
  return mentah
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, angka: string) => String.fromCharCode(Number(angka)))
    .replace(/\s+/g, ' ')
    .trim()
}

export function labelTapel(kode: string): string {
  if (!/^\d{4}$/.test(kode)) return kode
  return `20${kode.slice(0, 2)}/20${kode.slice(2)}`
}

export function namaItem(kode: string): string {
  const bersih = kode.trim().toUpperCase()
  if (ITEM_TETAP[bersih]) return ITEM_TETAP[bersih]
  const syahriah = bersih.match(/^SYA(\d{3})$/)
  if (syahriah) return `Syahriah ${bulanKe(syahriah[1])}`
  const katering = bersih.match(/^KTR(\d{3})$/)
  if (katering) return `Katering ${bulanKe(katering[1])}`
  return kode.trim() || 'Tagihan'
}

export function jenisItem(kode: string, nama: string): string {
  const kodeBesar = kode.toUpperCase()
  const namaKecil = nama.toLowerCase()
  if (kodeBesar.startsWith('SYA') || namaKecil.startsWith('syahriah')) return 'Syahriah'
  if (kodeBesar.startsWith('KTR') || namaKecil.startsWith('katering')) return 'Katering'
  if (kodeBesar.startsWith('BPL') || namaKecil.includes('buku')) return 'Buku'
  if (kodeBesar.startsWith('EVT') || namaKecil.includes('penilaian') || namaKecil.includes('ujian')) return 'Penilaian & ujian'
  if (kodeBesar.startsWith('PSB')) return 'PSB'
  if (kodeBesar.startsWith('INF')) return 'Infaq'
  if (kodeBesar.startsWith('E')) return 'Ekskul'
  if (namaKecil.includes('seragam')) return 'Seragam'
  return 'Lainnya'
}

export function kelompokRekapan(kode: string, nama: string): string {
  const kodeBesar = kode.toUpperCase()
  if (kodeBesar === 'EVT002') return 'ASAS'
  if (kodeBesar === 'EVT001' || kodeBesar === 'EVT003') return 'ASTS'
  if (kodeBesar === 'EVT004') return 'ASAT'
  if (kodeBesar === 'EVT005' || kodeBesar === 'EVT006') return 'Ujian'
  return jenisItem(kode, nama)
}

export function tanggalJakarta(sekarang = new Date()): Date {
  const bagian = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(sekarang)
  const angka = (tipe: Intl.DateTimeFormatPartTypes) => Number(bagian.find((item) => item.type === tipe)?.value)
  return new Date(angka('year'), angka('month') - 1, angka('day'))
}

export function indeksBulanKode(kode: string): number | null {
  const cocok = kode.trim().toUpperCase().match(/^(?:SYA|KTR)(\d{3})$/)
  if (!cocok) return null
  const nomor = Number(cocok[1])
  if (nomor < 1 || nomor > 12) return null
  return nomor - 1
}

export function tagihanJatuhTempo(baris: { tapel: string; kode: string }, sekarang = new Date()): boolean {
  const indeks = indeksBulanKode(baris.kode)
  if (indeks == null) return true
  if (!/^\d{4}$/.test(baris.tapel)) return true
  const tahunMulai = 2000 + Number(baris.tapel.slice(0, 2))
  const tahun = indeks <= 5 ? tahunMulai : tahunMulai + 1
  const bulan = indeks <= 5 ? 6 + indeks : indeks - 6
  const batas = tanggalJakarta(sekarang)
  return tahun < batas.getFullYear() || (tahun === batas.getFullYear() && bulan <= batas.getMonth())
}

export function periodeBulanTagihan(tapel: string, kode: string): { kunci: string; label: string } | null {
  const indeks = indeksBulanKode(kode)
  if (indeks == null || !/^\d{4}$/.test(tapel)) return null
  const tahunMulai = 2000 + Number(tapel.slice(0, 2))
  const tahun = indeks <= 5 ? tahunMulai : tahunMulai + 1
  const bulan = indeks <= 5 ? 6 + indeks : indeks - 6
  return {
    kunci: `${tahun}-${String(bulan + 1).padStart(2, '0')}`,
    label: `${BULAN[indeks]} ${tahun}`,
  }
}

export function labelPeriodeBerjalan(tapel: string, sekarang = new Date()): string {
  const batas = tanggalJakarta(sekarang)
  const indeks = batas.getMonth() >= 6 ? batas.getMonth() - 6 : batas.getMonth() + 6
  const nama = BULAN[indeks]
  if (!/^\d{4}$/.test(tapel)) return `sampai ${nama} ${batas.getFullYear()}`
  const tahunMulai = 2000 + Number(tapel.slice(0, 2))
  const awal = new Date(tahunMulai, 6, 1)
  const akhir = new Date(tahunMulai + 1, 6, 1)
  if (batas >= awal && batas < akhir) return `Juli ${tahunMulai} – ${nama} ${batas.getFullYear()}`
  return `sampai ${nama} ${batas.getFullYear()}`
}

export function saringTagihanAktif(tagihan: BarisTagihan[], sekarang = new Date()): BarisTagihan[] {
  return tagihan.filter((baris) => baris.jumlah > 0 && tagihanJatuhTempo(baris, sekarang))
}

export type BarisRombel = { nis: string; nama: string; kelas: string }
export type BarisTagihan = {
  nis: string
  tapel: string
  kode: string
  jumlah: number
  tagihanAwal?: number
  terbayar?: number
}
export type BarisPsb = {
  nis: string
  nama: string
  tapel: string
  tagihan: number
  bayar: number
  kurang: number
}
export type DirektoriSiswa = { nama: string; kelas: string }

export function uraiRombel(html: string): { tapel: string; siswa: BarisRombel[] } {
  const ringkas = teksHtml(html)
  const tapel = ringkas.match(/Tahun Pelajaran\s*:\s*(\d{4})/)?.[1] || ''
  const siswa: BarisRombel[] = []
  for (const kolom of barisTabel(html, 'datatables-buttons')) {
    if (kolom.length < 3 || !/^\d+$/.test(kolom[0])) continue
    siswa.push({ nis: kolom[0], nama: kolom[1], kelas: kolom[2] || '—' })
  }
  return { tapel, siswa }
}

export function uraiBelumTerbayar(html: string): BarisTagihan[] {
  const hasil: BarisTagihan[] = []
  for (const kolom of barisTabel(html, 'datatables-buttons')) {
    if (kolom.length < 5 || !/^\d+$/.test(kolom[1])) continue
    hasil.push({
      nis: kolom[1],
      tapel: kolom[2],
      kode: kolom[3],
      jumlah: angkaAmpss(kolom[4]),
    })
  }
  return hasil
}

export function uraiPsb(html: string): BarisPsb[] {
  const mulai = html.indexOf('id="psb_table"')
  const wilayah = mulai >= 0 ? html.slice(mulai) : html
  const hasil: BarisPsb[] = []
  for (const kolom of barisTabel(wilayah, 'datatables')) {
    if (kolom.length < 6) continue
    const tapel = kolom[0]
    const nis = kolom[1]
    if (!/^\d{4}$/.test(tapel) || !/^\d{3,12}$/.test(nis)) continue
    hasil.push({
      nis,
      nama: kolom[2] || `NIS ${nis}`,
      tapel,
      tagihan: angkaAmpss(kolom[3]),
      bayar: angkaAmpss(kolom[4]),
      kurang: angkaAmpss(kolom[5]),
    })
  }
  return hasil
}

export function saringPsbSekolah(baris: BarisPsb[], sekolahId: string, nisRombel: Iterable<string> = []): BarisPsb[] {
  const aktif = new Set(nisRombel)
  return baris.filter((item) => item.nis.startsWith(sekolahId) || aktif.has(item.nis))
}

export function susunRekapanTagihan(
  rombel: BarisRombel[],
  direktori: Map<string, DirektoriSiswa>,
  tagihan: BarisTagihan[],
  tapelAktif: string,
  sekarang = new Date(),
): BarisRekapan[] {
  const aktif = new Map(rombel.map((baris) => [baris.nis, baris]))
  const identitas = (nis: string) => {
    const siswa = aktif.get(nis)
    const arsip = direktori.get(nis)
    return {
      nis,
      nama: siswa?.nama || arsip?.nama || `NIS ${nis}`,
      kelas: siswa?.kelas || arsip?.kelas || '—',
    }
  }

  const hasil: BarisRekapan[] = []
  const syahriahTerbuka = new Set<string>()
  for (const baris of tagihan) {
    if (baris.jumlah <= 0 || !tagihanJatuhTempo(baris, sekarang)) continue
    const periode = periodeBulanTagihan(baris.tapel, baris.kode)
    const kode = baris.kode.toUpperCase()
    if (kode.startsWith('SYA') && periode) syahriahTerbuka.add(`${baris.nis}|${baris.tapel}|${kode}`)
    const item = namaItem(baris.kode)
    hasil.push({
      ...identitas(baris.nis),
      tapel: baris.tapel,
      kunciBulan: periode?.kunci || '9999-99',
      bulan: periode?.label || '',
      jenis: kelompokRekapan(baris.kode, item),
      item,
      kode: baris.kode,
      status: 'Belum',
      nominal: baris.jumlah,
    })
  }

  if (/^\d{4}$/.test(tapelAktif)) {
    for (const siswa of rombel) {
      for (let nomor = 1; nomor <= 12; nomor += 1) {
        const kode = `SYA${String(nomor).padStart(3, '0')}`
        if (!tagihanJatuhTempo({ tapel: tapelAktif, kode }, sekarang)) continue
        if (syahriahTerbuka.has(`${siswa.nis}|${tapelAktif}|${kode}`)) continue
        const periode = periodeBulanTagihan(tapelAktif, kode)
        if (!periode) continue
        hasil.push({
          nis: siswa.nis,
          nama: siswa.nama,
          kelas: siswa.kelas,
          tapel: tapelAktif,
          kunciBulan: periode.kunci,
          bulan: periode.label,
          jenis: 'Syahriah',
          item: namaItem(kode),
          kode,
          status: 'Lunas',
          nominal: 0,
        })
      }
    }
  }

  hasil.sort((a, b) => {
    if (a.status !== b.status) return a.status === 'Belum' ? -1 : 1
    return (
      a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) ||
      a.nama.localeCompare(b.nama, 'id') ||
      a.kunciBulan.localeCompare(b.kunciBulan) ||
      a.jenis.localeCompare(b.jenis, 'id') ||
      a.item.localeCompare(b.item, 'id')
    )
  })
  return hasil
}

export function gabungTagihanPsb(tagihan: BarisTagihan[], psb: BarisPsb[]): BarisTagihan[] {
  const tambahan: BarisTagihan[] = psb
    .filter((baris) => baris.kurang > 0)
    .map((baris) => ({
      nis: baris.nis,
      tapel: baris.tapel,
      kode: 'PSB000',
      jumlah: baris.kurang,
      tagihanAwal: baris.tagihan,
      terbayar: baris.bayar,
    }))
  const nisPsb = new Set(tambahan.map((baris) => baris.nis))
  const tanpaDobel = tagihan.filter((baris) => !(nisPsb.has(baris.nis) && baris.kode.toUpperCase().startsWith('PSB')))
  return [...tanpaDobel, ...tambahan]
}

export function uraiDirektoriSiswa(html: string): Map<string, DirektoriSiswa> {
  const peta = new Map<string, DirektoriSiswa>()
  for (const kolom of barisTabel(html, 'datatables-column-search-text-inputs')) {
    if (kolom.length < 4 || !/^\d+$/.test(kolom[1]) || !kolom[2]) continue
    if (!peta.has(kolom[1])) peta.set(kolom[1], { nama: kolom[2], kelas: kolom[3] || '—' })
  }
  return peta
}

export function uraiPenerimaan(html: string, sekolah: string): { total: number; perItem: PosUang[] } {
  const aman = sekolah.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const totalMentah = html.match(new RegExp(`<td colspan="3">\\s*${aman}\\s*</td>\\s*<td>\\s*([^<]+?)\\s*</td>`, 'i'))
  const perItem: PosUang[] = []
  const pecahan = html.split(/<th class="text-primary" colspan="3">/i)
  const blok = pecahan.find((bagian) => teksHtml(bagian.slice(0, 180)).startsWith(sekolah))
  if (blok) {
    const batas = blok.search(/<th class="(?:text-primary|py-3)/i)
    const wilayah = batas > 0 ? blok.slice(0, batas) : blok
    for (const tr of wilayah.matchAll(/<tr[\s\S]*?<\/tr>/gi)) {
      const kolom = selTd(tr[0])
      if (kolom.length < 2) continue
      const jumlah = angkaAmpss(kolom[kolom.length - 1])
      const nama = kolom.slice(0, -1).find((isi) => isi && isi !== sekolah)
      if (!nama || jumlah <= 0) continue
      perItem.push({ nama, jumlah })
    }
  }
  const totalItem = perItem.reduce((jumlah, item) => jumlah + item.jumlah, 0)
  const totalJudul = angkaAmpss(totalMentah?.[1] || '0')
  return { total: totalJudul || totalItem, perItem }
}

export function rincianDariTagihan(baris: BarisTagihan): RincianTagihan {
  return {
    tapel: baris.tapel,
    kode: baris.kode,
    item: namaItem(baris.kode),
    jumlah: baris.jumlah,
    ...(baris.tagihanAwal != null ? { tagihanAwal: baris.tagihanAwal } : {}),
    ...(baris.terbayar != null ? { terbayar: baris.terbayar } : {}),
  }
}

export function jumlahkanPos(pasangan: Iterable<[string, number]>): PosUang[] {
  const peta = new Map<string, number>()
  for (const [nama, jumlah] of pasangan) peta.set(nama, (peta.get(nama) || 0) + jumlah)
  return [...peta.entries()]
    .map(([nama, jumlah]) => ({ nama, jumlah }))
    .filter((item) => item.jumlah > 0)
    .sort((a, b) => b.jumlah - a.jumlah || a.nama.localeCompare(b.nama, 'id'))
}

function bulanKe(kode: string): string {
  const indeks = Number(kode) - 1
  return BULAN[indeks] || kode
}

function irisTabel(html: string, id: string): string {
  const mulai = html.indexOf(`id="${id}"`)
  if (mulai < 0) return ''
  const buka = html.indexOf('<tbody', mulai)
  const tutup = html.indexOf('</tbody>', buka)
  if (buka < 0 || tutup < 0) return ''
  return html.slice(buka, tutup + '</tbody>'.length)
}

function selTd(baris: string): string[] {
  return [...baris.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)].map((cocok) => teksHtml(cocok[1]))
}

function barisTabel(html: string, id: string): string[][] {
  const badan = irisTabel(html, id)
  return [...badan.matchAll(/<tr[\s\S]*?<\/tr>/gi)].map((cocok) => selTd(cocok[0])).filter((kolom) => kolom.length > 0)
}
