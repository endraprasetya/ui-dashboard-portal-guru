export type BarisKriteriaTarget = {
  id: string
  capaian: string
  poin: number
  nomor: number
  ayat?: number
  kurang?: boolean
}

export type KriteriaTargetKelas = {
  kelas: number
  judul: string
  baris: BarisKriteriaTarget[]
}

function baris(id: string, capaian: string, poin: number, nomor: number, ayat?: number, kurang?: boolean): BarisKriteriaTarget {
  return { id, capaian, poin, nomor, ayat, kurang }
}

function tangga(awal: BarisKriteriaTarget, lanjutan: { id: string; capaian: string; nomor: number; ayat?: number }[], lantai: BarisKriteriaTarget) {
  const barisLanjutan = lanjutan.map((item, indeks) =>
    baris(item.id, item.capaian, awal.poin - (indeks + 1) * 5, item.nomor, item.ayat),
  )
  return [awal, ...barisLanjutan, lantai]
}

const kelas1 = tangga(
  baris('1-syams', 'Selesai As-Syams', 100, 91),
  [
    { id: '1-lail', capaian: 'Al-Lail', nomor: 92 },
    { id: '1-duha', capaian: 'Ad-Duha', nomor: 93 },
    { id: '1-insyirah', capaian: 'Al-Insyirah', nomor: 94 },
    { id: '1-tin', capaian: 'At-Tin', nomor: 95 },
    { id: '1-alaq', capaian: "Al-'Alaq", nomor: 96 },
    { id: '1-qadr', capaian: 'Al-Qadr', nomor: 97 },
    { id: '1-bayyinah', capaian: 'Al-Bayyinah', nomor: 98 },
    { id: '1-zalzalah', capaian: 'Az-Zalzalah', nomor: 99 },
    { id: '1-adiyat', capaian: "Al-'Adiyat", nomor: 100 },
    { id: '1-qariah', capaian: "Al-Qari'ah", nomor: 101 },
    { id: '1-takasur', capaian: 'At-Takasur', nomor: 102 },
  ],
  baris('1-fiil', 'Kurang dari Al-Fiil', 40, 105, undefined, true),
)

const kelas2 = tangga(
  baris('2-naba', "Selesai An-Naba'", 100, 78),
  [
    { id: '2-naziat', capaian: "An-Nazi'at", nomor: 79 },
    { id: '2-abasa', capaian: 'Abasa', nomor: 80 },
    { id: '2-takwir', capaian: 'At-Takwir', nomor: 81 },
    { id: '2-infitar', capaian: 'Al-Infitar', nomor: 82 },
    { id: '2-mutaffifin', capaian: 'Al-Mutaffifin', nomor: 83 },
    { id: '2-insyiqaq', capaian: 'Al-Insyiqaq', nomor: 84 },
    { id: '2-buruj', capaian: 'Al-Buruj', nomor: 85 },
    { id: '2-tariq', capaian: 'At-Tariq', nomor: 86 },
    { id: '2-ala', capaian: "Al-A'la", nomor: 87 },
    { id: '2-gasyiyah', capaian: 'Al-Gasyiyah', nomor: 88 },
    { id: '2-fajr', capaian: 'Al-Fajr', nomor: 89 },
  ],
  baris('2-floor', 'Kurang dari Al-Fajr', 40, 89, undefined, true),
)

const kelas3 = tangga(
  baris('3-maarij', "Selesai Al-Ma'arij", 100, 70),
  [
    { id: '3-haqqoh', capaian: 'Al-Haqqoh', nomor: 69 },
    { id: '3-qalam', capaian: 'Al-Qalam', nomor: 68 },
    { id: '3-mulk', capaian: 'Al-Mulk', nomor: 67 },
    { id: '3-naba', capaian: "An-Naba'", nomor: 78 },
    { id: '3-naziat', capaian: "An-Nazi'at", nomor: 79 },
    { id: '3-abasa', capaian: 'Abasa', nomor: 80 },
    { id: '3-takwir', capaian: 'At-Takwir', nomor: 81 },
    { id: '3-infitar', capaian: 'Al-Infitar', nomor: 82 },
    { id: '3-mutaffifin', capaian: 'Al-Mutaffifin', nomor: 83 },
    { id: '3-insyiqaq', capaian: 'Al-Insyiqaq', nomor: 84 },
    { id: '3-buruuj', capaian: 'Al-Buruuj', nomor: 85 },
  ],
  baris('3-floor', 'Kurang dari Al-Buruuj', 40, 85, undefined, true),
)

const kelas4 = tangga(
  baris('4-mujadilah', 'Selesai Al-Mujadilah ayat 6', 100, 58, 6),
  [
    { id: '4-mursalaat', capaian: 'Al-Mursalaat', nomor: 77 },
    { id: '4-insan', capaian: 'Al-Insan', nomor: 76 },
    { id: '4-qiyamah', capaian: 'Al-Qiyamah', nomor: 75 },
    { id: '4-muddassir', capaian: 'Al-Muddassir', nomor: 74 },
    { id: '4-muzzammil', capaian: 'Al-Muzzammil', nomor: 73 },
    { id: '4-jinn', capaian: 'Al-Jinn', nomor: 72 },
    { id: '4-nuh', capaian: 'Nuh', nomor: 71 },
    { id: '4-maarij', capaian: "Al-Ma'arij", nomor: 70 },
    { id: '4-haqqoh', capaian: 'Al-Haqqoh', nomor: 69 },
    { id: '4-qalam', capaian: 'Al-Qalam', nomor: 68 },
    { id: '4-mulk', capaian: 'Al-Mulk', nomor: 67 },
    { id: '4-naba', capaian: 'An-Naba', nomor: 78 },
  ],
  baris('4-floor', 'Kurang dari An-Naba', 35, 78, undefined, true),
)

const kelas5dan6 = (kelas: 5 | 6, selesai: string) =>
  tangga(
    baris(`${kelas}-jumuah`, selesai, 100, 62),
    [
      { id: `${kelas}-shof`, capaian: 'Ash-Shof', nomor: 61 },
      { id: `${kelas}-mumtahanah`, capaian: 'Al-Mumtahanah', nomor: 60 },
      { id: `${kelas}-hasyr`, capaian: 'Al-Hasyr', nomor: 59 },
      { id: `${kelas}-mujadilah`, capaian: 'Al-Mujadilah', nomor: 58 },
      { id: `${kelas}-mursalat`, capaian: 'Al-Mursalat', nomor: 77 },
      { id: `${kelas}-insan`, capaian: 'Al-Insan', nomor: 76 },
      { id: `${kelas}-qiyamah`, capaian: 'Al-Qiyamah', nomor: 75 },
      { id: `${kelas}-muddassir`, capaian: 'Al-Muddassir', nomor: 74 },
      { id: `${kelas}-muzzammil`, capaian: 'Al-Muzzammil', nomor: 73 },
      { id: `${kelas}-jinn`, capaian: 'Al-Jinn', nomor: 72 },
      { id: `${kelas}-nuh`, capaian: 'Nuh', nomor: 71 },
      { id: `${kelas}-maarij`, capaian: "Al-Ma'arij", nomor: 70 },
    ],
    baris(`${kelas}-floor`, "Kurang dari Al-Ma'arij", 35, 70, undefined, true),
  )

export const KRITERIA_TARGET_HQ: KriteriaTargetKelas[] = [
  { kelas: 1, judul: 'Target kelas As-Syams', baris: kelas1 },
  { kelas: 2, judul: "Target kelas An-Naba'", baris: kelas2 },
  { kelas: 3, judul: "Target kelas Al-Ma'arij", baris: kelas3 },
  { kelas: 4, judul: 'Target kelas Al-Mujadilah ayat 6', baris: kelas4 },
  { kelas: 5, judul: "Target kelas Al-Jumu'ah, 2 lembar", baris: kelas5dan6(5, "Selesai Al-Jumu'ah, 2 lembar") },
  { kelas: 6, judul: "Target kelas Al-Jumu'ah", baris: kelas5dan6(6, "Selesai Al-Jumu'ah") },
]

export function kriteriaTargetKelas(kelas: number) {
  return KRITERIA_TARGET_HQ.find((item) => item.kelas === kelas) || KRITERIA_TARGET_HQ[0]
}
