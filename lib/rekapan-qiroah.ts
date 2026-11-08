import { supabase } from '@/lib/supabase'
import type { RekapanRingkas } from '@/lib/ujian-relasi'

/** Kolom standar tabel `rekapan` untuk komponen penilaian ujian QQ. */
export const KOLOM_REKAPAN_QIROAH =
  'id_ujian,tanggal_ujian,id_siswa,nama,kelas,unit,guru_pengampu,jilid_asal,jilid_tujuan,penguji,kelancaran,makhraj,harakat,tajwid,adab,keterangan,kelebihan_siswa,predikat,keputusan,nilai_akhir' as const

export type RekapanLengkap = RekapanRingkas & {
  kelas?: string
  nama?: string
  unit?: string
  guru_pengampu?: string
  kelancaran?: number | string | null
  makhraj?: number | string | null
  harakat?: number | string | null
  tajwid?: number | string | null
  adab?: number | string | null
  kelebihan_siswa?: string | null
}

async function ambilChunk(ids: string[]) {
  const { data, error } = await supabase.from('rekapan').select(KOLOM_REKAPAN_QIROAH).in('id_siswa', ids)
  if (error) throw new Error(error.message)
  return (data || []) as RekapanLengkap[]
}

/** Muat rekapan untuk banyak siswa (batangan 80 id). */
export async function muatRekapanUntukSiswa(idsSiswa: string[]): Promise<RekapanLengkap[]> {
  const ids = [...new Set(idsSiswa.map((id) => String(id).trim()).filter(Boolean))]
  if (ids.length === 0) return []
  const ukuran = 80
  const gabung: RekapanLengkap[] = []
  for (let i = 0; i < ids.length; i += ukuran) {
    gabung.push(...(await ambilChunk(ids.slice(i, i + ukuran))))
  }
  gabung.sort((a, b) => String(b.tanggal_ujian || '').localeCompare(String(a.tanggal_ujian || '')))
  return gabung
}

export function keputusanLulus(keputusan?: string) {
  return String(keputusan || '').trim().toLowerCase() === 'lulus'
}

export function statusUjianFilter(row: RekapanLengkap, filter: 'semua' | 'lulus' | 'mengulang') {
  if (filter === 'semua') return true
  if (filter === 'lulus') return keputusanLulus(row.keputusan)
  return !keputusanLulus(row.keputusan)
}

export function dalamRentangTanggal(iso: string | undefined, dari: string, sampai: string) {
  const t = String(iso || '').slice(0, 10)
  if (!t) return false
  return t >= dari && t <= sampai
}
