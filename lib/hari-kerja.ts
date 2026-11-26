const HARI_KERJA = new Set([1, 2, 3, 4, 6])

/** Hari kerja unit sekolah: Senin–Kamis dan Sabtu (`getDay()` 1, 2, 3, 4, 6). Jumat (5) dan Minggu (0) libur. */
export function adalahHariKerja(tanggal: Date) {
  return HARI_KERJA.has(tanggal.getDay())
}

function tanggalLokal(dari: Date) {
  return new Date(dari.getFullYear(), dari.getMonth(), dari.getDate())
}

/**
 * 1 hari kerja sejak tanggal surat: mulai dari `baseDate`, majukan 1 hari demi 1 hari
 * sampai menemukan hari kerja pertama (Senin–Kamis atau Sabtu), melewati Jumat dan Minggu.
 * Contoh: Senin -> Selasa, Kamis -> Sabtu, Sabtu -> Senin.
 */
export function tanggalPertemuanTunggakan(baseDate: Date) {
  const hasil = tanggalLokal(baseDate)
  do {
    hasil.setDate(hasil.getDate() + 1)
  } while (!adalahHariKerja(hasil))
  return hasil
}

/** Menggeser tanggal ke depan sebanyak `jumlah` hari kerja (tidak termasuk hari ini). */
export function tambahHariKerja(dari: Date, jumlah: number) {
  const hasil = tanggalLokal(dari)
  let sisa = Math.max(0, jumlah)
  while (sisa > 0) {
    hasil.setDate(hasil.getDate() + 1)
    if (adalahHariKerja(hasil)) sisa -= 1
  }
  return hasil
}

const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

export function bulanRomawi(tanggal: Date) {
  return ROMAWI[tanggal.getMonth()] || ''
}

const NAMA_HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'] as const
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
] as const

function kapitalAwal(teks: string) {
  return teks.replace(/^\S/, (huruf) => huruf.toUpperCase())
}

export function formatTanggalPanjang(tanggal: Date) {
  return kapitalAwal(
    tanggal.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }),
  )
}

/** Contoh: `Kamis, 26 November 2026`. */
export function formatHariTanggal(tanggal: Date) {
  const hari = NAMA_HARI[tanggal.getDay()] || ''
  const bulan = NAMA_BULAN[tanggal.getMonth()] || ''
  return `${hari}, ${tanggal.getDate()} ${bulan} ${tanggal.getFullYear()}`
}

export function angkaNomorSurat(nilai: string) {
  return String(nilai || '').replace(/\D/g, '')
}

/** Format baku: 421.2/{nomor}/SPb/SDIP-AM/{bulan romawi}/{tahun} */
export function nomorSuratTunggakan(nomorUrut: string, tanggal: Date) {
  const angka = angkaNomorSurat(nomorUrut)
  return `421.2/${angka}/SPb/SDIP-AM/${bulanRomawi(tanggal)}/${tanggal.getFullYear()}`
}
