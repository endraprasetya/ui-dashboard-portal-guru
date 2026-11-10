import type { PosUang, RincianTagihan } from './keuangan-tipe'

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

export type BarisRombel = { nis: string; nama: string; kelas: string }
export type BarisTagihan = { nis: string; tapel: string; kode: string; jumlah: number }
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
