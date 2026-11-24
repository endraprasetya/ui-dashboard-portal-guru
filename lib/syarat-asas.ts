import { periodeBulanTagihan } from '@/lib/ampss-urai'
import type { RincianTagihan, SiswaTunggakan } from '@/lib/keuangan-tipe'

/** Batas bulan SPP/Syahriah dan catering untuk kelayakan ujian ASAS. */
export const BATAS_BULAN_SYARAT_ASAS = '2026-11'
export const LABEL_BATAS_SYARAT_ASAS = 'November 2026'
/** Teks syarat di UI tetap “minimal 60%”. Kelolosan kelas 1 dihitung dari sisa tunggakan. */
export const BATAS_TUNGGAKAN_PSB_KELAS_1_PUTRI = 2_400_000
export const BATAS_TUNGGAKAN_PSB_KELAS_1_PUTRA = 2_312_000
export const TEKS_SYARAT_PSB_KELAS_1 = 'PSB/daftar ulang belum 60%'

export type StatusSyaratAsas = 'Lunas Syarat ASAS' | 'Belum Lunas Syarat ASAS'

export type BarisSyaratAsas = {
  nis: string
  nama: string
  kelas: string
  aktif: boolean
  yatim?: boolean
  lunas: boolean
  status: StatusSyaratAsas
  keterangan: string
  itemBelum: string[]
}

export type RekapSyaratAsas = {
  sekolah: string
  tapel: string
  diambilPada: string
  batasBulan: string
  labelBatas: string
  siswa: BarisSyaratAsas[]
}

function teks(nilai: string | undefined) {
  return String(nilai || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function adaFrasa(nama: string, pola: RegExp) {
  return pola.test(nama)
}

/** Buku dan TKA dikecualikan dari evaluasi syarat ASAS, bukan dari rincian tagihan umum. */
export function dikecualikanSyaratAsas(kode: string, item: string): boolean {
  const k = String(kode || '').trim().toUpperCase()
  const n = teks(item)
  if (k.startsWith('BPL')) return true
  if (k === 'L25003' || k === 'L26003') return true
  if (/\bbuku\b/.test(n)) return true
  if (/\btka\b/.test(n)) return true
  if (n.includes('test kemampuan akademik') || n.includes('tes kemampuan akademik')) return true
  if (n.includes('modul tka')) return true
  return false
}

/** Kelas putri SD memakai akhiran C/D; kelas putra memakai A/B. */
export function jenisRombelAsas(kelas: string): 'Putra' | 'Putri' {
  const rapat = String(kelas || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
  if (rapat.includes('putri') || /[cd]$/.test(rapat)) return 'Putri'
  return 'Putra'
}

export function nomorJenjangKelas(kelas: string): number | null {
  const mentah = String(kelas || '').trim()
  const awal = mentah.match(/^(\d{1,2})(?!\d)/)
  if (awal) {
    const angka = Number(awal[1])
    return angka >= 1 && angka <= 12 ? angka : null
  }
  const label = mentah.match(/(?:kelas|kls)\s*(\d{1,2})\b/i)
  if (label) {
    const angka = Number(label[1])
    return angka >= 1 && angka <= 12 ? angka : null
  }
  return null
}

function adalahSyahriah(kode: string, item: string) {
  const k = kode.toUpperCase()
  const n = teks(item)
  if (k.startsWith('SYA')) return true
  return adaFrasa(n, /\b(syahriah|syahriyah|spp)\b/)
}

function adalahCatering(kode: string, item: string) {
  const k = kode.toUpperCase()
  const n = teks(item)
  if (k.startsWith('KTR')) return true
  return adaFrasa(n, /\b(katering|catering)\b/)
}

function adalahAsasI(kode: string, item: string) {
  const k = kode.toUpperCase()
  const n = teks(item)
  if (k === 'EVT002') return true
  if (/\basts\b/.test(n) || n.includes('tengah semester')) return false
  if (/\basat\b/.test(n) || n.includes('akhir tahun')) return false
  if (/\basas ii\b|\basas 2\b/.test(n)) return false
  if (/\basas\b/.test(n)) return true
  if (n.includes('penilaian akhir semester 1') || n.includes('penilaian akhir semester gasal')) return true
  if (n.includes('akhir semester 1') || n.includes('akhir semester gasal')) return true
  return false
}

function adalahEkskul(kode: string, item: string) {
  const k = kode.toUpperCase()
  const n = teks(item)
  if (k.startsWith('EVT')) return false
  if (/^E\d/.test(k)) return true
  return adaFrasa(n, /\b(ekskul|ekstrakurikuler|ekstra kurikuler)\b/)
}

function adalahPsb(kode: string, item: string) {
  const k = kode.toUpperCase()
  const n = teks(item)
  if (k.startsWith('PSB')) return true
  return adaFrasa(n, /\b(psb|daftar ulang|pendaftaran siswa baru)\b/)
}

function dalamBatasNovember2026(item: Pick<RincianTagihan, 'tapel' | 'kode' | 'item'>) {
  const periode = periodeBulanTagihan(item.tapel, item.kode, item.item)
  if (!periode) return true
  return periode.kunci <= BATAS_BULAN_SYARAT_ASAS
}

function labelBulanUrut(daftar: Pick<RincianTagihan, 'tapel' | 'kode' | 'item'>[]) {
  const peta = new Map<string, string>()
  for (const item of daftar) {
    const periode = periodeBulanTagihan(item.tapel, item.kode, item.item)
    const kunci = periode?.kunci || item.item
    const label = periode?.label || item.item
    if (!peta.has(kunci)) peta.set(kunci, label)
  }
  return [...peta.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([, label]) => label)
}

function gabungKeterangan(itemBelum: string[]) {
  return itemBelum.join('; ')
}

/**
 * Evaluasi kelayakan administrasi ujian ASAS dari salinan rincian siswa.
 * Tidak mengubah array rincian asli (Buku/TKA tetap ada di modal tagihan umum).
 */
export function evaluasiSyaratAsas(
  siswa: Pick<SiswaTunggakan, 'nis' | 'nama' | 'kelas' | 'aktif' | 'yatim'>,
  rincian: RincianTagihan[],
): BarisSyaratAsas {
  const relevan = rincian.filter((item) => item.jumlah > 0 && !dikecualikanSyaratAsas(item.kode, item.item))
  const itemBelum: string[] = []

  const syahriah = relevan.filter((item) => adalahSyahriah(item.kode, item.item) && dalamBatasNovember2026(item))
  if (syahriah.length > 0) {
    itemBelum.push(`SPP/Syahriah s.d. ${LABEL_BATAS_SYARAT_ASAS} (${labelBulanUrut(syahriah).join(', ')})`)
  }

  const asasI = relevan.filter((item) => adalahAsasI(item.kode, item.item))
  if (asasI.length > 0) {
    itemBelum.push('Biaya ASAS I')
  }

  const catering = relevan.filter((item) => adalahCatering(item.kode, item.item) && dalamBatasNovember2026(item))
  if (catering.length > 0) {
    itemBelum.push(`Catering s.d. ${LABEL_BATAS_SYARAT_ASAS} (${labelBulanUrut(catering).join(', ')})`)
  }

  const ekskul = relevan.filter((item) => adalahEkskul(item.kode, item.item))
  if (ekskul.length > 0) {
    itemBelum.push('Ekstrakurikuler')
  }

  const psb = relevan.filter((item) => adalahPsb(item.kode, item.item))
  const jenjang = nomorJenjangKelas(siswa.kelas)
  const kelas1 = jenjang === 1
  if (psb.length > 0) {
    const sisa = psb.reduce((jumlah, item) => jumlah + Math.max(item.jumlah, 0), 0)
    if (kelas1) {
      const jenis = jenisRombelAsas(siswa.kelas)
      const batas = jenis === 'Putri' ? BATAS_TUNGGAKAN_PSB_KELAS_1_PUTRI : BATAS_TUNGGAKAN_PSB_KELAS_1_PUTRA
      if (sisa >= batas) itemBelum.push(TEKS_SYARAT_PSB_KELAS_1)
    } else if (sisa > 0) {
      itemBelum.push('PSB belum lunas')
    }
  }

  const lunas = itemBelum.length === 0
  return {
    nis: siswa.nis,
    nama: siswa.nama,
    kelas: siswa.kelas,
    aktif: siswa.aktif,
    yatim: siswa.yatim,
    lunas,
    status: lunas ? 'Lunas Syarat ASAS' : 'Belum Lunas Syarat ASAS',
    itemBelum,
    keterangan: lunas ? '—' : gabungKeterangan(itemBelum),
  }
}

export function saringSiswaSyaratAsas(
  daftar: BarisSyaratAsas[],
  opsi: { lunas: boolean; kelas?: string },
) {
  return daftar
    .filter((baris) => baris.lunas === opsi.lunas)
    .filter((baris) => !opsi.kelas || opsi.kelas === 'semua' || baris.kelas === opsi.kelas)
    .sort(
      (a, b) =>
        a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.nama.localeCompare(b.nama, 'id'),
    )
}
