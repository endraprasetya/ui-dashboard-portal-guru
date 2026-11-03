/** Aturan bawaan Tertib Point — disinkronkan dengan seed `supabase/aturan-tertib-point.sql`. */

export type AturanTertib = { label: string; pts: number; type: 'neg' | 'pos' }

/** Pelanggaran (poin positif = nilai yang dikurangkan dari bekal). */
export const PELANGGARAN_TERTIB: readonly { label: string; pts: number }[] = [
  { label: 'Berkelahi', pts: 50 },
  { label: 'Mengejek teman', pts: 25 },
  { label: 'Mencoret tembok/meja', pts: 20 },
  { label: 'Merusak fasilitas sekolah', pts: 30 },
  { label: 'Terlambat masuk sekolah', pts: 25 },
  { label: 'Tidak memperhatikan pelajaran', pts: 20 },
  { label: 'Bermain dikasur', pts: 10 },
  { label: 'Membawa mainan', pts: 20 },
  { label: 'Mendholimi teman', pts: 30 },
  { label: 'Tidak tidur siang', pts: 20 },
  { label: 'Membuang sampah sembarangan', pts: 20 },
  { label: 'Tidak menirukan talqin bersama ustadz saat hq/qq/hafalan hadits', pts: 25 },
  { label: 'Tidak semangat saat menirukan talqin bersama ustadz', pts: 20 },
  { label: 'Naik meja', pts: 20 },
  { label: 'Merusak barang orang lain', pts: 30 },
  { label: 'Mainan pintu/gedor-gedor pintu kelas/kamar mandi', pts: 30 },
  { label: 'Tidak piket', pts: 20 },
  { label: 'Main lari-larian bukan saat olah raga', pts: 20 },
  { label: 'Ramai dimasjid saat menunggu sholat', pts: 30 },
  { label: 'Tidak sholat', pts: 50 },
  { label: 'Berbohong', pts: 40 },
  { label: 'Tidak seragam lengkap', pts: 25 },
  { label: 'Masuk kantor tanpa kepentingan/tanpa ijin', pts: 20 },
  { label: 'Klotekan/main musik/bernyanyi', pts: 30 },
  { label: 'Bermain bola bukan di jam olah raga', pts: 30 },
  { label: 'Membully adik kelas/teman sekelas/teman antar kelas', pts: 30 },
  {
    label: 'Membawa rokok/merokok disekolah baik elektrik maupun non elektrik',
    pts: 150,
  },
] as const

/** Kontribusi positif (menambah poin). */
export const KONTRIBUSI_TERTIB: readonly { label: string; pts: number }[] = [
  { label: 'Menolong teman', pts: 10 },
  { label: 'Berbagi', pts: 10 },
  { label: 'Membantu ustadz', pts: 10 },
] as const

export const DEF_NEG: [string, number][] = PELANGGARAN_TERTIB.map((r) => [r.label, r.pts])
export const DEF_POS: [string, number][] = KONTRIBUSI_TERTIB.map((r) => [r.label, r.pts])
