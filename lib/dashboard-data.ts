export const student = {
  name: 'Aisyah Putri Ramadhani',
  shortName: 'Aisyah',
  className: 'Kelas 4A',
  nis: '2023.04.117',
  halaqah: 'Halaqah Ummu Salamah',
  parentName: 'Bapak Ahmad Fauzi',
}

export const tahfidz = {
  surah: 'An-Naba',
  surahArabic: 'النبأ',
  ayat: '1 – 40',
  juz: 30,
  totalJuzTarget: 3,
  juzCompleted: 1.6,
  status: 'Lancar' as const,
  lastDate: 'Senin, 12 Okt 2026',
}

export const qiroah = {
  method: 'Ummi',
  jilid: 5,
  totalJilid: 6,
  halaman: 28,
  totalHalaman: 40,
  note: 'Makharijul huruf sudah baik. Perlu latihan lagi pada bacaan ghunnah dan mad thabi’i agar lebih konsisten.',
  ustadz: 'Ustadzah Fatimah Az-Zahra',
}

export const finance = {
  billMonth: 'SPP Oktober 2026',
  billAmount: 850000,
  billStatus: 'Belum Lunas' as const,
  dueDate: '15 Okt 2026',
  pocketBalance: 237500,
  lastTopUp: 'Rp 300.000 · 5 Okt',
}

export const attendance = {
  month: 'Oktober 2026',
  present: 9,
  sick: 1,
  permission: 0,
  absent: 0,
  totalDays: 10,
}

export const schedule = [
  { time: '07.00 – 08.10', subject: "Tahfidz Al-Qur'an", teacher: 'Ustadzah Fatimah Az-Zahra', status: 'done' },
  { time: '08.10 – 09.20', subject: 'Matematika', teacher: 'Ibu Siti Nurhaliza, S.Pd', status: 'done' },
  { time: '09.40 – 10.50', subject: 'Bahasa Arab', teacher: 'Ustadz Hasan Basri, Lc', status: 'ongoing' },
  { time: '10.50 – 12.00', subject: 'Fiqih Ibadah', teacher: 'Ustadz Muhammad Rizki', status: 'upcoming' },
  { time: '13.00 – 14.10', subject: 'IPAS', teacher: 'Ibu Dewi Lestari, S.Pd', status: 'upcoming' },
] as const

export const hafalanHistory = [
  { date: '12 Okt 2026', surah: 'An-Naba', ayat: '31 – 40', type: 'Ziyadah', status: 'Lancar', score: 92 },
  { date: '10 Okt 2026', surah: 'An-Naba', ayat: '21 – 30', type: 'Ziyadah', status: 'Lancar', score: 88 },
  { date: '09 Okt 2026', surah: "An-Nazi'at", ayat: '1 – 46', type: "Muraja'ah", status: 'Cukup', score: 78 },
  { date: '08 Okt 2026', surah: 'An-Naba', ayat: '11 – 20', type: 'Ziyadah', status: 'Perlu Mengulang', score: 65 },
  { date: '06 Okt 2026', surah: 'An-Naba', ayat: '1 – 10', type: 'Ziyadah', status: 'Lancar', score: 90 },
] as const

export const announcements = [
  {
    title: 'Pertemuan Wali Murid Semester Ganjil',
    date: '18 Okt 2026',
    category: 'Agenda',
    excerpt: 'Dimohon kehadiran Bapak/Ibu di Aula Utama pukul 08.00 WIB untuk evaluasi tengah semester.',
  },
  {
    title: 'Wisuda Tahfidz Juz 30',
    date: '25 Okt 2026',
    category: 'Tahfidz',
    excerpt: 'Santri yang telah menuntaskan Juz 30 akan diwisuda. Mohon persiapkan seragam putih.',
  },
  {
    title: 'Libur Peringatan Maulid Nabi',
    date: '28 Okt 2026',
    category: 'Libur',
    excerpt: 'Kegiatan belajar mengajar diliburkan dan akan kembali aktif pada hari berikutnya.',
  },
] as const

export function formatRupiah(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}
