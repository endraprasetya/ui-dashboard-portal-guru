/**
 * Rubrik rapor HQ (lembar Excel Juz30/Juz29):
 * Kelancaran = MAX(90 − kesalahan × E, 40)
 * Tajwid     = MAX(100 − (Mad + Dengung + Makhraj) × F, 56)
 * NA         = (Kelancaran + Tajwid + Adab) / 2
 * Contoh At-Tiin: E=13, F=4 → 2 kesalahan kelancaran = 64; (64+100+10)/2 = 87
 * Contoh An-Naba: E=4, F=2
 */
export const MAKS_NILAI_KELANCAN = 90
export const MIN_NILAI_KELANCAN = 40
export const MAKS_NILAI_TAJWID = 100
export const MIN_NILAI_TAJWID = 56
export const MAKS_NILAI_ADAB = 10
export const PEMBAGI_NILAI_AKHIR = 2
export const MAKS_NILAI_AKHIR = (MAKS_NILAI_KELANCAN + MAKS_NILAI_TAJWID + MAKS_NILAI_ADAB) / PEMBAGI_NILAI_AKHIR

export type BobotTajwidSurat = {
  nomor: number
  nama: string
  jumlahAyat: number
  panjang: string
  potonganKelancaran: number
  potonganTajwid: number
  potonganMad: number
  potonganDengung: number
  potonganMakhraj: number
}

/** Acuan nama & jumlah ayat (sesuai tabel `surah` SDIT Al Madinah). */
export const DAFTAR_SURAH_RAPOR: { n: number; a: number; nama: string }[] = [
  { n: 1, a: 7, nama: 'Al-Fatihah' },
  { n: 2, a: 286, nama: 'Al-Baqarah' },
  { n: 3, a: 200, nama: "Ali 'Imran" },
  { n: 4, a: 176, nama: "An-Nisa'" },
  { n: 5, a: 120, nama: "Al-Ma'idah" },
  { n: 6, a: 165, nama: "Al-An'am" },
  { n: 7, a: 206, nama: "Al-A'raf" },
  { n: 8, a: 75, nama: 'Al-Anfal' },
  { n: 9, a: 129, nama: 'At-Taubah' },
  { n: 10, a: 109, nama: 'Yunus' },
  { n: 11, a: 123, nama: 'Hud' },
  { n: 12, a: 111, nama: 'Yusuf' },
  { n: 13, a: 43, nama: "Ar-Ra'd" },
  { n: 14, a: 52, nama: 'Ibrahim' },
  { n: 15, a: 99, nama: 'Al-Hijr' },
  { n: 16, a: 128, nama: 'An-Nahl' },
  { n: 17, a: 111, nama: "Al-Isra'" },
  { n: 18, a: 110, nama: 'Al-Kahf' },
  { n: 19, a: 98, nama: 'Maryam' },
  { n: 20, a: 135, nama: 'Ta Ha' },
  { n: 21, a: 112, nama: "Al-Anbiya'" },
  { n: 22, a: 78, nama: 'Al-Hajj' },
  { n: 23, a: 118, nama: "Al-Mu'minun" },
  { n: 24, a: 64, nama: 'An-Nur' },
  { n: 25, a: 77, nama: 'Al-Furqan' },
  { n: 26, a: 227, nama: "Asy-Syu'ara'" },
  { n: 27, a: 93, nama: 'An-Naml' },
  { n: 28, a: 88, nama: 'Al-Qasas' },
  { n: 29, a: 69, nama: "Al-'Ankabut" },
  { n: 30, a: 60, nama: 'Ar-Rum' },
  { n: 31, a: 34, nama: 'Luqman' },
  { n: 32, a: 30, nama: 'As-Sajdah' },
  { n: 33, a: 73, nama: 'Al-Ahzab' },
  { n: 34, a: 54, nama: "Saba'" },
  { n: 35, a: 45, nama: 'Fatir' },
  { n: 36, a: 83, nama: 'Ya Sin' },
  { n: 37, a: 182, nama: 'As-Saffat' },
  { n: 38, a: 88, nama: 'Sad' },
  { n: 39, a: 75, nama: 'Az-Zumar' },
  { n: 40, a: 85, nama: 'Gafir' },
  { n: 41, a: 54, nama: 'Fussilat' },
  { n: 42, a: 53, nama: 'Asy-Syura' },
  { n: 43, a: 89, nama: 'Az-Zukhruf' },
  { n: 44, a: 59, nama: 'Ad-Dukhan' },
  { n: 45, a: 37, nama: 'Al-Jasiyah' },
  { n: 46, a: 35, nama: 'Al-Ahqaf' },
  { n: 47, a: 38, nama: 'Muhammad' },
  { n: 48, a: 29, nama: 'Al-Fath' },
  { n: 49, a: 18, nama: 'Al-Hujurat' },
  { n: 50, a: 45, nama: 'Qaf' },
  { n: 51, a: 60, nama: 'Az-Zariyat' },
  { n: 52, a: 49, nama: 'At-Tur' },
  { n: 53, a: 62, nama: 'An-Najm' },
  { n: 54, a: 55, nama: 'Al-Qamar' },
  { n: 55, a: 78, nama: 'Ar-Rahman' },
  { n: 56, a: 96, nama: "Al-Waqi'ah" },
  { n: 57, a: 29, nama: 'Al-Hadid' },
  { n: 58, a: 22, nama: 'Al-Mujadilah' },
  { n: 59, a: 24, nama: 'Al-Hasyr' },
  { n: 60, a: 13, nama: 'Al-Mumtahanah' },
  { n: 61, a: 14, nama: 'As-Saff' },
  { n: 62, a: 11, nama: "Al-Jumu'ah" },
  { n: 63, a: 11, nama: 'Al-Munafiqun' },
  { n: 64, a: 18, nama: 'At-Tagabun' },
  { n: 65, a: 12, nama: 'At-Talaq' },
  { n: 66, a: 12, nama: 'At-Tahrim' },
  { n: 67, a: 30, nama: 'Al-Mulk' },
  { n: 68, a: 52, nama: 'Al-Qalam' },
  { n: 69, a: 52, nama: 'Al-Haqqah' },
  { n: 70, a: 44, nama: "Al-Ma'arij" },
  { n: 71, a: 28, nama: 'Nuh' },
  { n: 72, a: 28, nama: 'Al-Jinn' },
  { n: 73, a: 20, nama: 'Al-Muzzammil' },
  { n: 74, a: 56, nama: 'Al-Muddassir' },
  { n: 75, a: 40, nama: 'Al-Qiyamah' },
  { n: 76, a: 31, nama: 'Al-Insan' },
  { n: 77, a: 50, nama: 'Al-Mursalat' },
  { n: 78, a: 40, nama: "An-Naba'" },
  { n: 79, a: 46, nama: "An-Nazi'at" },
  { n: 80, a: 42, nama: 'Abasa' },
  { n: 81, a: 29, nama: 'At-Takwir' },
  { n: 82, a: 19, nama: 'Al-Infitar' },
  { n: 83, a: 36, nama: 'Al-Mutaffifin' },
  { n: 84, a: 25, nama: 'Al-Insyiqaq' },
  { n: 85, a: 22, nama: 'Al-Buruj' },
  { n: 86, a: 17, nama: 'At-Tariq' },
  { n: 87, a: 19, nama: "Al-A'la" },
  { n: 88, a: 26, nama: 'Al-Gasyiyah' },
  { n: 89, a: 30, nama: 'Al-Fajr' },
  { n: 90, a: 20, nama: 'Al-Balad' },
  { n: 91, a: 15, nama: 'Asy-Syams' },
  { n: 92, a: 21, nama: 'Al-Lail' },
  { n: 93, a: 11, nama: 'Ad-Dhuha' },
  { n: 94, a: 8, nama: 'Al-Insyirah' },
  { n: 95, a: 8, nama: 'At-Tin' }, // At-Tiin / At-Tin
  { n: 96, a: 19, nama: "Al-'Alaq" },
  { n: 97, a: 5, nama: 'Al-Qadr' },
  { n: 98, a: 8, nama: 'Al-Bayyinah' },
  { n: 99, a: 8, nama: 'Az-Zalzalah' },
  { n: 100, a: 11, nama: "Al-'Adiyat" },
  { n: 101, a: 11, nama: "Al-Qari'ah" },
  { n: 102, a: 8, nama: 'At-Takasur' },
  { n: 103, a: 3, nama: "Al-'Asr" },
  { n: 104, a: 9, nama: 'Al-Humazah' },
  { n: 105, a: 5, nama: 'Al-Fil' },
  { n: 106, a: 4, nama: 'Quraisy' },
  { n: 107, a: 7, nama: "Al-Ma'un" },
  { n: 108, a: 3, nama: 'Al-Kautsar' },
  { n: 109, a: 6, nama: 'Al-Kafirun' },
  { n: 110, a: 3, nama: 'An-Nasr' },
  { n: 111, a: 5, nama: 'Al-Lahab' },
  { n: 112, a: 4, nama: 'Al-Ikhlas' },
  { n: 113, a: 5, nama: 'Al-Falaq' },
  { n: 114, a: 6, nama: 'An-Naas' },
]

/** Kolom E (kelancaran) & F (tajwid) dari "DAFTAR PENGURANGAN POINT SETIAP 1 KESALAHAN PER SURAT". */
const TABEL_BOBOT_HQ: Record<number, { k: number; t: number; panjang: string }> = {
  114: { k: 16, t: 5, panjang: '4 Baris' },
  113: { k: 18, t: 6, panjang: '3 Baris' },
  112: { k: 18, t: 6, panjang: '2 Baris' },
  111: { k: 18, t: 6, panjang: '3 Baris' },
  110: { k: 18, t: 6, panjang: '3 Baris' },
  109: { k: 18, t: 6, panjang: '3 Baris' },
  108: { k: 18, t: 6, panjang: '2 Baris' },
  107: { k: 16, t: 5, panjang: '4 Baris' },
  106: { k: 18, t: 6, panjang: '3 Baris' },
  105: { k: 18, t: 6, panjang: '3 Baris' },
  104: { k: 16, t: 5, panjang: '4 Baris' },
  103: { k: 18, t: 6, panjang: '2 Baris' },
  102: { k: 16, t: 5, panjang: '4 Baris' },
  101: { k: 13, t: 4, panjang: '6 Baris' },
  100: { k: 13, t: 4, panjang: '5 Baris' },
  99: { k: 13, t: 4, panjang: '5 Baris' },
  98: { k: 5, t: 3, panjang: '11 Baris' },
  97: { k: 16, t: 5, panjang: '4 Baris' },
  96: { k: 10, t: 3, panjang: '8 Baris' },
  95: { k: 13, t: 4, panjang: '5 Baris' },
  94: { k: 16, t: 5, panjang: '4 Baris' },
  93: { k: 13, t: 4, panjang: '6 Baris' },
  92: { k: 7, t: 3, panjang: '9 Baris' },
  91: { k: 10, t: 3, panjang: '8 Baris' },
  90: { k: 7, t: 3, panjang: '10 Baris' },
  89: { k: 4, t: 2, panjang: '1 Muka 2 Baris' },
  88: { k: 5, t: 3, panjang: '12 Baris' },
  87: { k: 7, t: 3, panjang: '9 Baris' },
  86: { k: 10, t: 4, panjang: '7 Baris' },
  85: { k: 5, t: 3, panjang: '13 Baris' },
  84: { k: 5, t: 3, panjang: '13 Baris' },
  83: { k: 4, t: 2, panjang: '1 Muka 4 Baris' },
  82: { k: 7, t: 3, panjang: '10 Baris' },
  81: { k: 5, t: 3, panjang: '13 Baris' },
  80: { k: 4, t: 2, panjang: '1 Muka' },
  79: { k: 4, t: 2, panjang: '1 Muka 6 Baris' },
  78: { k: 4, t: 2, panjang: '1 Muka 6 Baris' },
  77: { k: 3.5, t: 2, panjang: '1 Muka 8 Baris' },
  76: { k: 3.5, t: 2, panjang: '1 Muka 6 Baris' },
  75: { k: 4, t: 2, panjang: '1 Muka 2 Baris' },
  74: { k: 3.5, t: 2, panjang: '1 Muka 12 Baris' },
  73: { k: 4, t: 2, panjang: '1 Muka 6 Baris' },
  72: { k: 3, t: 2, panjang: '2 Muka' },
  71: { k: 3.5, t: 2, panjang: '1 Muka 10 Baris' },
  70: { k: 3.5, t: 2, panjang: '1 Muka 10 Baris' },
  69: { k: 3.5, t: 2, panjang: '1 Muka 14 Baris' },
  68: { k: 3, t: 2, panjang: '2 Muka' },
  67: { k: 3, t: 1.5, panjang: '2 Muka 5 Baris' },
  66: { k: 3, t: 2, panjang: '2 Muka' },
  65: { k: 3, t: 2, panjang: '2 Muka' },
  64: { k: 3, t: 2, panjang: '2 Muka' },
  63: { k: 4, t: 2, panjang: '1 Muka 7 Baris' },
  62: { k: 4, t: 2, panjang: '1 Muka 5 Baris' },
  61: { k: 3.5, t: 2, panjang: '1 Muka 8 Baris' },
  60: { k: 3, t: 1.5, panjang: '2 Muka 6 Baris' },
  59: { k: 1.5, t: 1, panjang: '3 Muka 8 Baris' },
  58: { k: 1.5, t: 1, panjang: '3 Muka 9 Baris' },
  57: { k: 1, t: 1, panjang: '4 Muka 4 Baris' },
  56: { k: 2, t: 1, panjang: '3 Muka 3 Baris' },
  55: { k: 2, t: 1, panjang: '3 Muka 1 Baris' },
  54: { k: 2.5, t: 1.5, panjang: '2 Muka 10 Baris' },
  53: { k: 2.5, t: 1.5, panjang: '2 Muka 8 Baris' },
  52: { k: 2.5, t: 1.5, panjang: '2 Muka 7 Baris' },
  51: { k: 2.5, t: 1.5, panjang: '2 Muka 10 Baris' },
  50: { k: 2.5, t: 1.5, panjang: '2 Muka 11 Baris' },
  49: { k: 2.5, t: 1.5, panjang: '2 Muka 8 Baris' },
  48: { k: 1, t: 1, panjang: '4 Muka 6 Baris' },
  47: { k: 1, t: 1, panjang: '4 Muka' },
  46: { k: 1, t: 1, panjang: '4 Muka 8 Baris' },
  45: { k: 2, t: 1, panjang: '3 Muka 6 Baris' },
  44: { k: 2, t: 1, panjang: '3 Muka' },
  43: { k: 0.5, t: 0.5, panjang: '6 Muka 10 Baris' },
  42: { k: 0.5, t: 0.5, panjang: '6 Muka 4 Baris' },
  41: { k: 0.5, t: 0.5, panjang: '6 Muka' },
  40: { k: 0.5, t: 0.5, panjang: '9 Muka 12 Baris' },
  39: { k: 0.5, t: 0.5, panjang: '8 Muka 13 Baris' },
}

function fallbackBobotDariAyat(jumlahAyat: number) {
  const ayat = Math.max(1, jumlahAyat)
  if (ayat >= 80) return { k: 0.5, t: 0.5, panjang: '6 muka lebih' }
  if (ayat >= 50) return { k: 1, t: 1, panjang: '4–6 muka' }
  if (ayat >= 40) return { k: 1.5, t: 1, panjang: '3 muka 8 baris' }
  if (ayat >= 30) return { k: 2, t: 1, panjang: '3 muka' }
  if (ayat >= 25) return { k: 2.5, t: 1.5, panjang: '2 muka 8 baris' }
  if (ayat >= 20) return { k: 3, t: 2, panjang: '2 muka' }
  if (ayat >= 16) return { k: 3.5, t: 2, panjang: '1 muka 8 baris' }
  if (ayat >= 12) return { k: 4, t: 2, panjang: '1 muka' }
  if (ayat >= 11) return { k: 5, t: 3, panjang: '11–14 baris' }
  if (ayat >= 9) return { k: 7, t: 3, panjang: '9–10 baris' }
  if (ayat >= 7) return { k: 10, t: 3, panjang: '7–8 baris' }
  if (ayat >= 5) return { k: 13, t: 4, panjang: '5–6 baris' }
  if (ayat >= 4) return { k: 16, t: 5, panjang: '4 baris' }
  return { k: 18, t: 6, panjang: '< 4 baris' }
}

function normNama(nama: string) {
  return String(nama || '')
    .trim()
    .toLowerCase()
    .replace(/[''`´]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, '')
    .replace(/\./g, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^surat\s+/, '')
    .replace(/aa/g, 'a')
    .replace(/ii/g, 'i')
    .replace(/uu/g, 'u')
}

export function cariMetaSurah(namaSurat: string) {
  const q = normNama(namaSurat)
  if (!q) return undefined
  const tepat = DAFTAR_SURAH_RAPOR.find((item) => normNama(item.nama) === q)
  if (tepat) return tepat
  return DAFTAR_SURAH_RAPOR.find(
    (item) => normNama(item.nama).includes(q) || q.includes(normNama(item.nama)),
  )
}

function bundar(n: number) {
  return Math.round(n * 100) / 100
}

export function bobotTajwidUntukSurah(namaSurat: string): BobotTajwidSurat {
  const meta = cariMetaSurah(namaSurat)
  const nomor = meta?.n ?? 0
  const jumlahAyat = Math.max(1, meta?.a ?? 10)
  const nama = meta?.nama || String(namaSurat || '').trim() || 'Surah'
  const hq = (nomor && TABEL_BOBOT_HQ[nomor]) || fallbackBobotDariAyat(jumlahAyat)
  return {
    nomor,
    nama,
    jumlahAyat,
    panjang: hq.panjang,
    potonganKelancaran: hq.k,
    potonganTajwid: hq.t,
    potonganMad: hq.t,
    potonganDengung: hq.t,
    potonganMakhraj: hq.t,
  }
}

export function nilaiKelancaranDariKesalahanSurah(namaSurat: string, jumlah: number | '') {
  if (jumlah === '') return ''
  const potongan = bobotTajwidUntukSurah(namaSurat).potonganKelancaran
  return Math.max(
    MIN_NILAI_KELANCAN,
    Math.min(MAKS_NILAI_KELANCAN, MAKS_NILAI_KELANCAN - Number(jumlah) * potongan),
  )
}

export function nilaiTajwidDariKesalahan(
  namaSurat: string,
  mad: number | '',
  dengung: number | '',
  makhraj: number | '',
) {
  if ([mad, dengung, makhraj].some((item) => item === '')) return ''
  const b = bobotTajwidUntukSurah(namaSurat)
  const totalKesalahan = Number(mad) + Number(dengung) + Number(makhraj)
  return bundar(
    Math.min(MAKS_NILAI_TAJWID, Math.max(MIN_NILAI_TAJWID, 100 - totalKesalahan * b.potonganTajwid)),
  )
}

export function nilaiAkhirSuratHQ(kelancaran: number, tajwid: number, adab: number) {
  return bundar((kelancaran + tajwid + adab) / PEMBAGI_NILAI_AKHIR)
}

export function uraianKelancaran(namaSurat: string, kesalahan: number | '', nilai: number | '') {
  if (kesalahan === '' || nilai === '') return ''
  const p = bobotTajwidUntukSurah(namaSurat).potonganKelancaran
  return `MAX(${MAKS_NILAI_KELANCAN} − (${kesalahan} × ${p}), ${MIN_NILAI_KELANCAN}) = ${nilai}`
}

export function uraianTajwid(
  namaSurat: string,
  mad: number | '',
  dengung: number | '',
  makhraj: number | '',
  nilai: number | '',
) {
  if (mad === '' || dengung === '' || makhraj === '' || nilai === '') return ''
  const p = bobotTajwidUntukSurah(namaSurat).potonganTajwid
  return `MAX(100 − ((${mad}+${dengung}+${makhraj}) × ${p}), ${MIN_NILAI_TAJWID}) = ${nilai}`
}

export function ringkasanBobotKelancaran(namaSurat: string) {
  const b = bobotTajwidUntukSurah(namaSurat)
  return `${b.nama} · ${b.panjang} · −${b.potonganKelancaran} / kesalahan (skor ${MIN_NILAI_KELANCAN}–${MAKS_NILAI_KELANCAN})`
}

export function ringkasanBobotTajwid(namaSurat: string) {
  const b = bobotTajwidUntukSurah(namaSurat)
  return `${b.panjang} · −${b.potonganTajwid} / kesalahan Mad+Dengung+Makhraj (skor ${MIN_NILAI_TAJWID}–${MAKS_NILAI_TAJWID})`
}
