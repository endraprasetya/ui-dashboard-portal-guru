export type KelompokMapelKurmer = 'umum' | 'diniyyah'

export type MapelKurmer = {
  kode: string
  /** Label di layar. */
  nama: string
  /** String `mata_pelajaran` yang dipakai saat menulis baris baru. */
  namaSimpan: string
  /** Semua ejaan yang sudah atau mungkin tersimpan di Supabase. */
  alias: string[]
  kelompok: KelompokMapelKurmer
  /** PAI tidak diinput manual. */
  otomatis?: boolean
}

export const MAPEL_UMUM_KURMER: MapelKurmer[] = [
  { kode: 'pai', nama: 'PAI', namaSimpan: 'PAI', alias: ['PAI', 'Pendidikan Agama Islam'], kelompok: 'umum', otomatis: true },
  { kode: 'pkn', nama: 'PKN', namaSimpan: 'PKN', alias: ['PKN', 'PKn', 'Pendidikan Kewarganegaraan'], kelompok: 'umum' },
  { kode: 'bind', nama: 'Bahasa Indonesia', namaSimpan: 'Bahasa Indonesia', alias: ['Bahasa Indonesia'], kelompok: 'umum' },
  { kode: 'mtk', nama: 'Matematika', namaSimpan: 'Matematika', alias: ['Matematika'], kelompok: 'umum' },
  { kode: 'ipas', nama: 'IPAS', namaSimpan: 'IPAS', alias: ['IPAS'], kelompok: 'umum' },
  { kode: 'pjok', nama: 'PJOK', namaSimpan: 'PJOK', alias: ['PJOK'], kelompok: 'umum' },
  {
    kode: 'seni',
    nama: 'Seni Budaya dan Prakarya',
    namaSimpan: 'Seni Budaya',
    alias: ['Seni Budaya', 'Seni Budaya dan Prakarya', 'SBdP'],
    kelompok: 'umum',
  },
  { kode: 'bing', nama: 'Bahasa Inggris', namaSimpan: 'Bahasa Inggris', alias: ['Bahasa Inggris'], kelompok: 'umum' },
  { kode: 'bjaw', nama: 'Bahasa Jawa', namaSimpan: 'Bahasa Jawa', alias: ['Bahasa Jawa'], kelompok: 'umum' },
]

export const MAPEL_DINIYYAH_KURMER: MapelKurmer[] = [
  { kode: 'aqidah', nama: 'Aqidah', namaSimpan: 'Aqidah', alias: ['Aqidah'], kelompok: 'diniyyah' },
  { kode: 'fiqih', nama: 'Fiqih Akhlak', namaSimpan: 'Fiqih Akhlak', alias: ['Fiqih Akhlak', 'Fikih Akhlak', 'Fiqh Akhlak'], kelompok: 'diniyyah' },
  { kode: 'hadits-siroh', nama: 'Hadits Siroh', namaSimpan: 'Hadits Siroh', alias: ['Hadits Siroh', 'Hadis Siroh'], kelompok: 'diniyyah' },
  {
    kode: 'qiroah',
    nama: "Qiroatul Qur'an",
    namaSimpan: "Qiroatul Qur'an",
    alias: ["Qiroatul Qur'an", "Qiro'atul Qur'an", "Qiro'atul Quran", "Qiroatul Quran"],
    kelompok: 'diniyyah',
  },
  { kode: 'tajwid', nama: 'Tajwid', namaSimpan: 'Tajwid', alias: ['Tajwid'], kelompok: 'diniyyah' },
  { kode: 'arab', nama: 'Bahasa Arab', namaSimpan: 'Bahasa Arab', alias: ['Bahasa Arab'], kelompok: 'diniyyah' },
  {
    kode: 'hq',
    nama: "Hafalan Al Qur'an",
    namaSimpan: "Hafalan Al-Qur'an",
    alias: ["Hafalan Al-Qur'an", "Hafalan Al Qur'an", "Hafalan Al-Quran", "Hafalan Al Quran"],
    kelompok: 'diniyyah',
  },
  { kode: 'hadits', nama: 'Hafalan Hadits', namaSimpan: 'Hafalan Hadits', alias: ['Hafalan Hadits', 'Hafalan Hadis'], kelompok: 'diniyyah' },
]

export const DAFTAR_MAPEL_KURMER: MapelKurmer[] = [...MAPEL_UMUM_KURMER, ...MAPEL_DINIYYAH_KURMER]

/** KKM per tingkat 1–6. `null` berarti mapel tidak aktif di kelas itu. */
export const KKM_CONFIG: Record<string, (number | null)[]> = {
  pai: [70, 70, 70, 70, 70, 70],
  pkn: [70, 70, 70, 70, 70, 70],
  bind: [70, 70, 70, 70, 70, 70],
  mtk: [65, 65, 65, 65, 65, 65],
  ipas: [null, null, 70, 70, 70, 70],
  pjok: [70, 70, 70, 70, 70, 70],
  seni: [70, 70, 70, 70, 70, 70],
  bing: [65, 65, 65, 65, 65, 65],
  bjaw: [65, 65, 65, 65, 65, 65],
  aqidah: [75, 75, 70, 70, 70, 70],
  fiqih: [75, 75, 70, 70, 70, 70],
  'hadits-siroh': [null, null, null, 70, 70, 70],
  qiroah: [75, 75, 70, null, null, null],
  tajwid: [null, null, null, 70, 70, 70],
  arab: [75, 75, 70, 65, 65, 65],
  hq: [75, 75, 70, 70, 70, 70],
  hadits: [75, 75, 70, 70, 70, 70],
}

function normMapel(nilai: string) {
  return nilai
    .toLowerCase()
    .replace(/['’`-]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tingkatKelasKurmer(kelas: string) {
  const angka = parseInt(String(kelas || '').replace(/\D/g, ''), 10)
  if (angka >= 1 && angka <= 6) return angka
  return 0
}

export function kkmMapelKurmer(kode: string, kelas: string): number | null {
  const tingkat = tingkatKelasKurmer(kelas)
  if (!tingkat) return null
  const baris = KKM_CONFIG[kode]
  if (!baris) return null
  return baris[tingkat - 1] ?? null
}

export function mapelKurmer(kode: string) {
  return DAFTAR_MAPEL_KURMER.find((item) => item.kode === kode) || null
}

export function mapelAktifKelas(kelas: string, kelompok?: KelompokMapelKurmer) {
  return DAFTAR_MAPEL_KURMER.filter((item) => {
    if (kelompok && item.kelompok !== kelompok) return false
    return kkmMapelKurmer(item.kode, kelas) != null
  })
}

export function kodeMapelDariNama(nama: string) {
  const kunci = normMapel(nama)
  if (!kunci) return ''
  const ketemu = DAFTAR_MAPEL_KURMER.find(
    (item) =>
      item.kode === kunci ||
      normMapel(item.nama) === kunci ||
      normMapel(item.namaSimpan) === kunci ||
      item.alias.some((alias) => normMapel(alias) === kunci),
  )
  return ketemu?.kode ?? kunci
}

export function namaTampilMapel(kode: string) {
  return mapelKurmer(kode)?.nama ?? kode
}

export function namaSimpanMapel(kode: string) {
  return mapelKurmer(kode)?.namaSimpan ?? kode
}

export function aliasMapelKurmer(kode: string) {
  const mapel = mapelKurmer(kode)
  if (!mapel) return [kode]
  return Array.from(new Set([mapel.namaSimpan, mapel.nama, ...mapel.alias]))
}

/** Di bawah KKM = PB. Di atas KKM: C sampai 79, B sampai 89, SB mulai 90. */
export function predikatDariKkm(nilai: number | null | undefined, kkm: number | null | undefined) {
  if (nilai == null || !Number.isFinite(nilai) || kkm == null) return '—'
  if (nilai < kkm) return 'PB'
  if (nilai >= 90) return 'SB'
  if (nilai >= 80) return 'B'
  return 'C'
}

export function diBawahKkm(nilai: number | null | undefined, kkm: number | null | undefined) {
  return nilai != null && Number.isFinite(nilai) && kkm != null && nilai < kkm
}
