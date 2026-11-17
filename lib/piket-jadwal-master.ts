/** Jadwal tetap Juli 2026, unit Nogosari. Jumat tidak tercantum pada jadwal dinding. */
export const UNIT_MASTER_PIKET = 'Nogosari'

export type EntriMasterPiket = {
  hari: number
  jenis: 'Piket Guru/Karyawan' | 'Piket Gerbang'
  nama: string
}

const guru = 'Piket Guru/Karyawan' as const
const gerbang = 'Piket Gerbang' as const

function baris(hari: number, jenis: EntriMasterPiket['jenis'], nama: string[]): EntriMasterPiket[] {
  return nama.map((item) => ({ hari, jenis, nama: item }))
}

export const MASTER_JADWAL_PIKET: EntriMasterPiket[] = [
  ...baris(1, guru, ['Wisono, S.Pd.', 'Musa Abdullah Muhammad', 'Irvan Dwi Raharjo, S.Ds.', 'Muqorrobin, S.Pd.I', 'Azzam']),
  ...baris(2, guru, [
    'Ali Wahyudin, S.Pd.I',
    'Sugeng Riyadi, S.Pd.',
    'Sri Sunarko Utomo, S.Pd.',
    'Waji Darmanto, A.Md.',
    'Sholahudin M. Akbar, S.Pd.',
    'Faza Fauzan Al Farisi',
  ]),
  ...baris(3, guru, ['Faiz Mubarok, S.Pd.', 'Suharman, S.Pd.I', 'Prasetyo, S.Pd.', 'Sulaiman', "Syu'aib"]),
  ...baris(4, guru, ['Ery Kristyono, S.Pd.', 'Yulianto, S.Pd.', 'Kalis Wardoyo, S.Pd.', 'M. Musthofa Imtikhan, A.Ma.', 'Yahya']),
  ...baris(6, guru, [
    'Haryono, S.Pd.',
    'Andreas Haryanto, S.Pd.',
    'Heru Purnomo, S.Pd.',
    'Muhammad Arifin, S.Pd.',
    'Isrofi Muchammad',
    'Endra Prasetya, A.Md.',
  ]),

  ...baris(1, gerbang, [
    'Haura Nurul Firdaus',
    'Novitasari, S.Sos',
    'Dwi Mei Supianti, S.Pd',
    'Nia Zahrotun Niam',
    'Dewi Nurmalasari',
  ]),
  ...baris(2, gerbang, ['Ima Karmila, S.Pd', 'Ambar Novitasari, S.Pd', 'Aisyah Fithri', 'Dian Aprilia Kartikaningrum']),
  ...baris(3, gerbang, ['Suginem, S.Pd', 'Titik Retno Palupi, A.Md.Kes', 'Asiyah', 'Wiwin Sri Rejeki, A.Ma']),
  ...baris(4, gerbang, ["Mustami'ah", 'Siswati, S.Pd', 'Riskha Fatmaningrum, S.Pd', 'Warsi, S.Pd']),
  ...baris(6, gerbang, ['Erni Fasichah, S.Pd', 'Shabrina Silmi, B.A', 'Imilda, S.Si', 'Rita Fatmawati']),
]
