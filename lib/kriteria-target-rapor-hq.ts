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

/** Urutan baris wajib dari capaian tertinggi ke terendah. Baris terakhir adalah batas bawah. */
const kelas1: BarisKriteriaTarget[] = [
  baris('1-bayyinah', 'Al Bayyinah', 100, 98),
  baris('1-zalzalah', 'Al Zalzalah', 90, 99),
  baris('1-adiyat', 'Al Adiyat', 80, 100),
  baris('1-qariah', "Al Qari'ah", 70, 101),
  baris('1-takatsur', 'At Takatsur', 60, 102),
  baris('1-fiil', 'Al Fiil', 50, 105),
  baris('1-floor', 'Kurang dari Al Fiil', 40, 105, undefined, true),
]

const kelas2: BarisKriteriaTarget[] = [
  baris('2-naziat', 'An Naziat', 100, 79),
  baris('2-abasa', 'Abasa', 95, 80),
  baris('2-takwir', 'At Takwir', 90, 81),
  baris('2-infithor', 'Al Infithor', 85, 82),
  baris('2-muthaffifin', 'Al Muthaffifin', 80, 83),
  baris('2-insyiqaq', 'Al Insyiqaq', 75, 84),
  baris('2-buruj', 'Al Buruj', 70, 85),
  baris('2-thoriq', 'Al Thoriq', 65, 86),
  baris('2-ala', "Al A'la", 60, 87),
  baris('2-ghosiyah', 'Al Ghosiyah', 55, 88),
  baris('2-fajr', 'Al Fajr', 50, 89),
  baris('2-balad', 'Al Balad', 45, 90),
  baris('2-floor', 'Kurang dari Al Balad', 40, 90, undefined, true),
]

const kelas3: BarisKriteriaTarget[] = [
  baris('3-nuh', 'An Nuh', 100, 71),
  baris('3-maarij', "Al Ma'arij", 95, 70),
  baris('3-haqqah', 'Al Haqqah', 90, 69),
  baris('3-qolam', 'Al Qolam', 85, 68),
  baris('3-qolam-15', 'Al Qolam ayat 15', 80, 68, 15),
  baris('3-mulk', 'Al Mulk', 75, 67),
  baris('3-mulk-20', 'Al Mulk ayat 20', 70, 67, 20),
  baris('3-naba', 'An Naba', 65, 78),
  baris('3-naziat', 'An Naziat', 60, 79),
  baris('3-abasa', 'Abasa', 55, 80),
  baris('3-takwir', 'At Takwir', 50, 81),
  baris('3-infithor', 'Al Infithor', 45, 82),
  baris('3-floor', 'Kurang dari Al Infithor', 40, 82, undefined, true),
]

const kelas4: BarisKriteriaTarget[] = [
  baris('4-mujadilah-11', 'Al Mujadilah ayat 11', 100, 58, 11),
  baris('4-mursalat', 'Al Mursalat', 95, 77),
  baris('4-insan', 'Al Insan', 90, 76),
  baris('4-qiyamah', 'Al Qiyamah', 85, 75),
  baris('4-muddatstsir', 'Al Muddatstsir', 80, 74),
  baris('4-muzzammil', 'Al Muzzammil', 75, 73),
  baris('4-jin', 'Al Jin', 70, 72),
  baris('4-nuh', 'Nuh', 65, 71),
  baris('4-maarij', "Al-Ma'arij", 60, 70),
  baris('4-haqqah', 'Al Haqqah', 55, 69),
  baris('4-qolam', 'Al Qolam', 50, 68),
  baris('4-qolam-15', 'Al Qolam ayat 15', 45, 68, 15),
  baris('4-floor', 'Kurang dari Al Qolam ayat 15', 40, 68, 15, true),
]

const kelas5: BarisKriteriaTarget[] = [
  baris('5-shof', 'Ash Shof', 100, 61),
  baris('5-mumtahanah', 'Al Mumtahanah', 95, 60),
  baris('5-hasyr', 'Al Hasyr', 90, 59),
  baris('5-mujadilah', 'Al Mujadilah', 80, 58),
  baris('5-mursalat', 'Al Mursalat', 75, 77),
  baris('5-insan', 'Al Insan', 70, 76),
  baris('5-qiyamah', 'Al Qiyamah', 65, 75),
  baris('5-muddatstsir', 'Al Muddatstsir', 60, 74),
  baris('5-muzzammil', 'Al Muzzammil', 55, 73),
  baris('5-jin', 'Al Jin', 50, 72),
  baris('5-nuh', 'Nuh', 45, 71),
  baris('5-floor', 'Kurang dari Nuh', 40, 71, undefined, true),
]

const kelas6: BarisKriteriaTarget[] = [
  baris('6-taghobun', 'At Taghobun', 100, 64),
  baris('6-munafiqun', 'Al Munafiqun', 95, 63),
  baris('6-jumuah', "Al Jumu'ah", 90, 62),
  baris('6-shaff', 'Ash-Shaff', 85, 61),
  baris('6-mumtahanah', 'Al Mumtahanah', 80, 60),
  baris('6-hasyr', 'Al Hasyr', 75, 59),
  baris('6-mujadilah', 'Al Mujadilah', 70, 58),
  baris('6-mursalat', 'Al Mursalat', 65, 77),
  baris('6-insan', 'Al Insan', 60, 76),
  baris('6-qiyamah', 'Al Qiyamah', 55, 75),
  baris('6-muddatstsir', 'Al Muddatstsir', 50, 74),
  baris('6-muzzammil', 'Al Muzzammil', 45, 73),
  baris('6-floor', 'Kurang dari Al Muzzammil', 40, 73, undefined, true),
]

export const KRITERIA_TARGET_HQ: KriteriaTargetKelas[] = [
  { kelas: 1, judul: 'Target kelas Al Bayyinah', baris: kelas1 },
  { kelas: 2, judul: 'Target kelas An Naziat', baris: kelas2 },
  { kelas: 3, judul: 'Target kelas An Nuh', baris: kelas3 },
  { kelas: 4, judul: 'Target kelas Al Mujadilah ayat 11', baris: kelas4 },
  { kelas: 5, judul: 'Target kelas Ash Shof', baris: kelas5 },
  { kelas: 6, judul: 'Target kelas At Taghobun', baris: kelas6 },
]

export function kriteriaTargetKelas(kelas: number) {
  return KRITERIA_TARGET_HQ.find((item) => item.kelas === kelas) || KRITERIA_TARGET_HQ[0]
}
