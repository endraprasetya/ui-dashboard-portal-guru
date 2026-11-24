import { JADWAL_ASAS_I } from '@/lib/jadwal-asas'

export const AWAL_ASAS_I = '2026-11-23'
export const AKHIR_ASAS_I = '2026-12-17'
export const AWAL_LIBUR_SEMESTER_1 = '2026-12-21'
export const AKHIR_LIBUR_SEMESTER_1 = '2027-01-03'

export const LABEL_UJIAN_ASAS = 'UJIAN ASAS'

export type ModePeriodeSekolah = 'asas' | 'libur' | 'efektif'

const ROMAWI: Record<string, number> = { I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6 }

export function tanggalLokal(sekarang = new Date()) {
  const tahun = sekarang.getFullYear()
  const bulan = String(sekarang.getMonth() + 1).padStart(2, '0')
  const hari = String(sekarang.getDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${hari}`
}

export function modePeriodeSekolah(iso?: string | null): ModePeriodeSekolah {
  const tanggal = String(iso || '').slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(tanggal)) return 'efektif'
  if (tanggal >= AWAL_ASAS_I && tanggal <= AKHIR_ASAS_I) return 'asas'
  if (tanggal >= AWAL_LIBUR_SEMESTER_1 && tanggal <= AKHIR_LIBUR_SEMESTER_1) return 'libur'
  return 'efektif'
}

function tingkatDariKelas(kelas: string) {
  const tampil = kelas.replace(/^.*::/, '').trim()
  const angka = tampil.match(/(\d+)/)
  if (angka) return Number(angka[1])
  const romawi = tampil.toUpperCase().match(/\b(VI|IV|V|III|II|I)\b/)
  return romawi ? ROMAWI[romawi[1]] : 0
}

function tingkatDariLabel(label: string): number[] | 'semua' {
  const teks = label.toUpperCase().replace(/[–—]/g, '-')
  if (teks.includes('SEMUA')) return 'semua'
  const ketemu = [...teks.matchAll(/\b(VI|IV|V|III|II|I)\b/g)].map((item) => ROMAWI[item[1]])
  if (ketemu.length === 0) return 'semua'
  if (teks.includes('-') && ketemu.length >= 2) {
    const awal = Math.min(...ketemu)
    const akhir = Math.max(...ketemu)
    const rentang: number[] = []
    for (let tingkat = awal; tingkat <= akhir; tingkat += 1) rentang.push(tingkat)
    return rentang
  }
  return ketemu
}

export function mapelAsasHari(tanggal: string, kelas: string) {
  const hari = JADWAL_ASAS_I.find((item) => item.iso === tanggal.slice(0, 10))
  if (!hari) return [] as string[]
  const tingkat = tingkatDariKelas(kelas)
  const mapel: string[] = []
  for (const sesi of hari.sesi) {
    for (const item of sesi.item) {
      const cakupan = tingkatDariLabel(item.kelas)
      if (cakupan !== 'semua' && tingkat > 0 && !cakupan.includes(tingkat)) continue
      const nama = String(item.mapel || '').trim()
      if (nama && !mapel.includes(nama)) mapel.push(nama)
    }
  }
  return mapel
}

export function mapelAsasUntukKelas(tanggal: string, kelas: string) {
  const daftar = mapelAsasHari(tanggal, kelas)
  if (daftar.length === 1) return daftar[0]
  return LABEL_UJIAN_ASAS
}
