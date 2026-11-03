/** Aturan bawaan Tertib Point — disinkronkan dengan seed `supabase/aturan-tertib-point.sql`. */

export type AturanTertib = { label: string; pts: number; type: 'neg' | 'pos' }

/**
 * Pelanggaran: urutan array = tampilan dropdown (poin terkecil → terbesar,
 * dengan urutan stabil di dalam tier poin yang sama).
 */
export const PELANGGARAN_TERTIB: readonly { label: string; pts: number }[] = [
  { label: 'Bermain dikasur / bermain kasur', pts: 10 },
  { label: 'Keluar kelas tanpa ijin', pts: 10 },
  { label: 'Membuang sampah sembarangan', pts: 10 },
  { label: 'Terlambat masuk sekolah / Terlambat datang', pts: 10 },
  { label: 'Tidak membawa buku', pts: 10 },
  { label: 'Mencoret tembok/meja', pts: 20 },
  { label: 'Membawa mainan', pts: 20 },
  { label: 'Main lari-larian bukan saat olah raga', pts: 20 },
  { label: 'Masuk kantor tanpa kepentingan / tanpa ijin', pts: 20 },
  { label: 'Tidak memperhatikan pelajaran / Tidak mengikuti pelajaran', pts: 20 },
  { label: 'Tidak piket', pts: 20 },
  { label: 'Tidak semangat saat menirukan talqin bersama ustadz', pts: 20 },
  { label: 'Tidak tidur siang', pts: 20 },
  { label: 'Tidak menirukan talqin bersama ustadz saat hq/qq/hafalan hadits', pts: 25 },
  { label: 'Tidak seragam lengkap / Tidak berseragam lengkap', pts: 25 },
  { label: 'Makan di kelas saat jam pelajaran', pts: 25 }, 
  { label: 'Tidur di kelas saat jam pelajaran', pts: 25 },
  { label: 'Mainan pintu / gedor-gedor pintu kelas / kamar mandi', pts: 30 },
  { label: 'Merusak barang orang lain', pts: 30 },
  { label: 'Merusak fasilitas sekolah', pts: 30 },
  { label: 'Klotekan / main musik / bernyanyi', pts: 30 },
  { label: 'Bermain bola bukan di jam olah raga', pts: 30 },
  { label: 'Membully adik kelas / teman sekelas / teman antar kelas', pts: 30 },
  { label: 'Mendholimi teman', pts: 30 },
  { label: 'Ramai di masjid saat menunggu sholat / Tidak tertib di masjid', pts: 30 },
  { label: 'Bicara kotor', pts: 30 },
  { label: 'Mengejek teman', pts: 30 },
  { label: 'Tidak menghormati guru', pts: 30 },
  { label: 'Berbohong', pts: 40 },
  { label: 'Berkelahi', pts: 50 },
  { label: 'Membolos', pts: 50 },
  { label: 'Tidak sholat', pts: 50 },
  {
    label: 'Membawa rokok / merokok di sekolah baik elektrik maupun non elektrik',
    pts: 150,
  },
] as const

/** Kontribusi positif (menambah poin). */
export const KONTRIBUSI_TERTIB: readonly { label: string; pts: number }[] = [
  { label: 'Menolong teman', pts: 10 },
  { label: 'Berbagi', pts: 10 },
  { label: 'Membantu ustadz', pts: 10 },
] as const

const INDEKS_PELANGGARAN = new Map(PELANGGARAN_TERTIB.map((r, i) => [r.label, i]))
const INDEKS_KONTRIBUSI = new Map(KONTRIBUSI_TERTIB.map((r, i) => [r.label, i]))

/** Urutkan aturan sesuai daftar resmi (poin kecil → besar). */
export function sortAturanTertib<T extends { label: string; pts: number; type: 'pos' | 'neg' }>(daftar: T[]): T[] {
  return [...daftar].sort((a, b) => {
    const ia = a.type === 'neg' ? INDEKS_PELANGGARAN.get(a.label) : INDEKS_KONTRIBUSI.get(a.label)
    const ib = b.type === 'neg' ? INDEKS_PELANGGARAN.get(b.label) : INDEKS_KONTRIBUSI.get(b.label)
    if (ia != null && ib != null) return ia - ib
    if (ia != null) return -1
    if (ib != null) return 1
    if (a.pts !== b.pts) return a.pts - b.pts
    return a.label.localeCompare(b.label, 'id')
  })
}

export const DEF_NEG: [string, number][] = PELANGGARAN_TERTIB.map((r) => [r.label, r.pts])
export const DEF_POS: [string, number][] = KONTRIBUSI_TERTIB.map((r) => [r.label, r.pts])
