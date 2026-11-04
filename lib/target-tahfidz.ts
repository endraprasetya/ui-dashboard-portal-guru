import { cariSurah, type Surah } from '@/lib/surah'

export type PosisiHafalan = {
  nomor: number
  ayat: number
  nama: string
}

export type HasilNilaiTarget = {
  poin: number
  posisi: PosisiHafalan | null
  targetKurikulum: string
  kelas: number
}

type AmbangTarget = {
  poin: number
  nomor: number
  ayat?: number
  kurang?: boolean
}

const TARGET_KURIKULUM: Record<number, string> = {
  1: "Al-'Ashr",
  2: 'Al-Infithar',
  3: 'Al-Haqqah',
  4: 'Al-Insan',
  5: 'Al-Hasyr',
  6: "Al-Jumu'ah",
}

/** Tabel ASTS 1 / target kelas (lembar Target*_bawah Excel rapor HQ). */
const TABEL_TARGET: Record<number, AmbangTarget[]> = {
  1: [
    { poin: 100, nomor: 103 },
    { poin: 90, nomor: 104 },
    { poin: 80, nomor: 105 },
    { poin: 70, nomor: 106 },
    { poin: 60, nomor: 107 },
    { poin: 50, nomor: 108 },
    { poin: 40, nomor: 108, kurang: true },
  ],
  2: [
    { poin: 100, nomor: 82 },
    { poin: 95, nomor: 83 },
    { poin: 90, nomor: 84 },
    { poin: 85, nomor: 85 },
    { poin: 80, nomor: 86 },
    { poin: 75, nomor: 87 },
    { poin: 70, nomor: 88 },
    { poin: 65, nomor: 89 },
    { poin: 60, nomor: 90 },
    { poin: 55, nomor: 91 },
    { poin: 50, nomor: 92 },
    { poin: 45, nomor: 93 },
    { poin: 40, nomor: 93, kurang: true },
  ],
  3: [
    { poin: 100, nomor: 69 },
    { poin: 95, nomor: 68 },
    { poin: 90, nomor: 68, ayat: 15 },
    { poin: 85, nomor: 67, ayat: 16 },
    { poin: 80, nomor: 78 },
    { poin: 75, nomor: 79 },
    { poin: 70, nomor: 80 },
    { poin: 65, nomor: 81 },
    { poin: 60, nomor: 82 },
    { poin: 55, nomor: 83 },
    { poin: 50, nomor: 84 },
    { poin: 45, nomor: 85 },
    { poin: 40, nomor: 85, kurang: true },
  ],
  4: [
    { poin: 100, nomor: 76 },
    { poin: 95, nomor: 75 },
    { poin: 90, nomor: 74 },
    { poin: 85, nomor: 73 },
    { poin: 80, nomor: 72 },
    { poin: 75, nomor: 71 },
    { poin: 70, nomor: 70 },
    { poin: 65, nomor: 69 },
    { poin: 60, nomor: 68 },
    { poin: 55, nomor: 68, ayat: 15 },
    { poin: 50, nomor: 67, ayat: 16 },
    { poin: 45, nomor: 78 },
    { poin: 40, nomor: 78, kurang: true },
  ],
  5: [
    { poin: 100, nomor: 59 },
    { poin: 95, nomor: 59, ayat: 3 },
    { poin: 90, nomor: 58, ayat: 15 },
    { poin: 85, nomor: 58, ayat: 6 },
    { poin: 80, nomor: 77 },
    { poin: 75, nomor: 76 },
    { poin: 70, nomor: 75 },
    { poin: 65, nomor: 74 },
    { poin: 60, nomor: 73 },
    { poin: 55, nomor: 72 },
    { poin: 50, nomor: 71 },
    { poin: 45, nomor: 70 },
    { poin: 40, nomor: 70, kurang: true },
  ],
  6: [
    { poin: 100, nomor: 62 },
    { poin: 95, nomor: 61 },
    { poin: 90, nomor: 60 },
    { poin: 85, nomor: 59 },
    { poin: 80, nomor: 58 },
    { poin: 75, nomor: 77 },
    { poin: 70, nomor: 76 },
    { poin: 65, nomor: 75 },
    { poin: 60, nomor: 74 },
    { poin: 55, nomor: 73 },
    { poin: 50, nomor: 72 },
    { poin: 45, nomor: 71 },
    { poin: 40, nomor: 71, kurang: true },
  ],
}

export function angkaKelas(kelas?: string | null) {
  const n = parseInt(String(kelas || '').replace(/\D/g, ''), 10)
  return n >= 1 && n <= 6 ? n : 0
}

export function ayatTerakhirDariRentang(rentang?: string | null) {
  const angka = String(rentang || '').match(/\d+/g)
  if (!angka?.length) return 0
  return Math.max(...angka.map((item) => Number(item)).filter((n) => Number.isFinite(n)))
}

function jumlahAyat(surahs: Surah[], nomor: number) {
  return surahs.find((item) => item.nomor_surat === nomor)?.jumlah_ayat || 1
}

function namaSuratNomor(surahs: Surah[], nomor: number) {
  return surahs.find((item) => item.nomor_surat === nomor)?.nama_surat?.trim() || `Surat ${nomor}`
}

/**
 * Urutan capaian kurikulum HQ: semakin besar semakin maju.
 * Kelas 1–2: Juz 30 mundur (114 → 1).
 * Kelas 3–4: Juz 30 sampai An-Naba, lalu Juz 29 dari Al-Mulk maju.
 * Kelas 5–6: Juz 29 (Al-Ma'arij → Al-Mursalat), lalu Juz 28 dari Al-Mujadilah maju.
 */
export function urutanCapaian(kelas: number, nomor: number, ayat: number) {
  const a = Math.max(0, ayat)
  if (kelas <= 2) return (200 - nomor) * 1000 + a
  if (kelas <= 4) {
    if (nomor >= 78) return -nomor * 1000 + a
    if (nomor >= 67) return 1_000_000 + (nomor - 67) * 1000 + a
    return 1_020_000 + (67 - nomor) * 1000 + a
  }
  if (nomor >= 78) return -nomor * 1000 + a
  if (nomor >= 70 && nomor <= 77) return (nomor - 70) * 1000 + a
  if (nomor >= 58 && nomor <= 66) return 100_000 + (nomor - 58) * 1000 + a
  if (nomor < 58) return 200_000 + (58 - nomor) * 1000 + a
  return -nomor * 1000 + a
}

export function posisiDariNama(
  surahs: Surah[],
  nama: string,
  rentangAyat?: string | null,
): PosisiHafalan | null {
  const surah = cariSurah(surahs, nama)
  if (!surah) return null
  const ayat = ayatTerakhirDariRentang(rentangAyat)
  return {
    nomor: surah.nomor_surat,
    ayat: ayat || surah.jumlah_ayat,
    nama: surah.nama_surat.trim(),
  }
}

export function posisiTerbaik(kelas: number, daftar: PosisiHafalan[]) {
  if (daftar.length === 0) return null
  return daftar.reduce((terbaik, item) =>
    urutanCapaian(kelas, item.nomor, item.ayat) > urutanCapaian(kelas, terbaik.nomor, terbaik.ayat) ? item : terbaik,
  )
}

function ambangUrutan(kelas: number, surahs: Surah[], ambang: AmbangTarget) {
  const ayat = ambang.ayat || jumlahAyat(surahs, ambang.nomor)
  return urutanCapaian(kelas, ambang.nomor, ayat)
}

export function hitungNilaiTarget(
  kelasMentah: string | null | undefined,
  posisi: PosisiHafalan | null,
  surahs: Surah[],
): HasilNilaiTarget {
  const kelas = angkaKelas(kelasMentah) || 1
  const tabel = TABEL_TARGET[kelas] || TABEL_TARGET[1]
  const targetKurikulum = TARGET_KURIKULUM[kelas] || TARGET_KURIKULUM[1]
  if (!posisi) {
    const terakhir = tabel[tabel.length - 1]
    return { poin: terakhir?.poin || 40, posisi: null, targetKurikulum, kelas }
  }

  const kunci = urutanCapaian(kelas, posisi.nomor, posisi.ayat)
  for (const ambang of tabel) {
    if (ambang.kurang) return { poin: ambang.poin, posisi, targetKurikulum, kelas }
    if (kunci >= ambangUrutan(kelas, surahs, ambang)) {
      return { poin: ambang.poin, posisi, targetKurikulum, kelas }
    }
  }
  return { poin: 40, posisi, targetKurikulum, kelas }
}

function labelAsesmenPendek(asesmen: string) {
  const k = String(asesmen || '').toUpperCase()
  if (k.includes('ASTS II') || k.includes('ASTS 2')) return 'ASTS 2'
  if (k.includes('ASTS')) return 'ASTS 1'
  if (k === 'ASAT' || k.includes('AKHIR TAHUN')) return 'ASAT'
  if (k === 'ASAS' || k.includes('AKHIR SEMESTER')) return 'ASAS'
  return asesmen || 'ASTS 1'
}

function labelCapaian(posisi: PosisiHafalan | null, surahs: Surah[]) {
  if (!posisi) return 'hafalan awal Juz 30'
  const nama = posisi.nama || namaSuratNomor(surahs, posisi.nomor)
  const lengkap = jumlahAyat(surahs, posisi.nomor)
  if (!posisi.ayat || posisi.ayat >= lengkap) return `surat ${nama}`
  return `surat ${nama} ayat ${posisi.ayat}`
}

export function buatNarasiCapaianTarget(hasil: HasilNilaiTarget, asesmen: string, surahs: Surah[]) {
  const capaian = labelCapaian(hasil.posisi, surahs)
  const labelAsesmen = labelAsesmenPendek(asesmen)
  const maju = hasil.poin >= 80
  const sedang = hasil.poin >= 50
  const pengantar = maju
    ? `Alhamdulillah ananda di kelas ${hasil.kelas} mampu menambah hafalan baru dengan baik`
    : sedang
      ? `Alhamdulillah ananda di kelas ${hasil.kelas} mampu menambah hafalan baru`
      : `Ananda di kelas ${hasil.kelas} masih tahap muroja'ah dari hafalan sebelumnya`
  return `${pengantar}. Target hafalan Al-Qur'an (${labelAsesmen}) kelas ${hasil.kelas} sampai surat ${hasil.targetKurikulum}. Karena ananda baru mencapai ${capaian}, maka nilai target yang didapat ${hasil.poin} poin.`
}

export function buatNarasiMotivasi(hasil: HasilNilaiTarget) {
  if (hasil.poin >= 90) {
    return "Tingkatkan semangatmu dalam menghafal Al-Qur'an dan jaga istiqamah muroja'ahnya. Semakin banyak surat yang dihafal, semakin banyak pula yang harus dijaga. Semoga Allah memberikan kemudahan untuk menghafal, menjaga, dan mengamalkannya. Baarakallahu fiyk."
  }
  if (hasil.poin >= 70) {
    return "Tingkatkan semangatmu dalam menghafal Al-Qur'an dan jangan lupa meningkatkan muroja'ahnya. Semoga Allah memberikan kemudahan untuk menghafal Al-Qur'an, menjaga, dan mengamalkannya. Baarakallahu fiyk."
  }
  if (hasil.poin >= 50) {
    return "Tingkatkan semangatmu dalam menghafal Al-Qur'an dan perbanyak muroja'ah agar hafalan semakin kokoh. Semoga Allah memberikan kemudahan dalam menghafal Al-Qur'an dan menjaga kalam-Nya. Baarakallahu fiyk."
  }
  return "Tingkatkan semangatmu dalam menghafal Al-Qur'an dan banyak berlatih membaca dengan pelan dan tartil agar bacaan menjadi lebih baik. Semoga Allah memberikan kemudahan dalam menghafal Al-Qur'an dan menjaga kalam-Nya. Baarakallahu fiyk."
}

export function buatNarasiKompetensi(namaSuratUjian: string[]) {
  const daftar = namaSuratUjian.map((item) => item.trim()).filter(Boolean)
  if (daftar.length === 0) return ''
  if (daftar.length === 1) {
    return `Ananda mampu menyetorkan hafalan surat ${daftar[0]} dengan baik. Terus jaga kelancaran dan tartil bacaannya.`
  }
  const awal = daftar.slice(0, -1).join(', ')
  const akhir = daftar[daftar.length - 1]
  return `Ananda mampu menyetorkan hafalan surat ${awal}, dan ${akhir} dengan baik. Perhatikan kelancaran, bacaan mad, serta tajwid agar setoran semakin kokoh.`
}
