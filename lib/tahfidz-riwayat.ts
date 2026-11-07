import { supabase } from '@/lib/supabase'
import { parseCustomDate } from '@/lib/qiroah'
import { formatDateString } from '@/lib/qiroah'
import { formatZiyadahRecord } from '@/lib/tahfidz'

export type RiwayatSetoranTahfidz = {
  id_setoran?: string
  tanggal?: string
  hafalan_baru?: string
  ayat_mulai?: string
  ayat_selesai?: string
  status?: string
  keterangan?: string
  keterangan_pesan_hafalan?: string
  tugas_rumah?: string
  surah_tugas?: string
}

export async function fetchRiwayatSetoranTahfidz(idSiswa: string, limit = 5): Promise<RiwayatSetoranTahfidz[]> {
  const id = String(idSiswa || '').trim()
  if (!id) return []

  const { data, error } = await supabase
    .from('setoran_tahfidz')
    .select(
      'id_setoran,tanggal,hafalan_baru,ayat_mulai,ayat_selesai,status,keterangan,keterangan_pesan_hafalan,tugas_rumah,surah_tugas',
    )
    .eq('id_siswa', id)
    .order('tanggal', { ascending: false })
    .limit(Math.max(limit, 5) * 3)

  if (error) {
    console.error('Gagal memuat riwayat tahfidz:', error.message)
    return []
  }

  const urut = [...(data || [])].sort((a, b) => {
    const ta = parseCustomDate(String(a.tanggal || ''))?.getTime() ?? 0
    const tb = parseCustomDate(String(b.tanggal || ''))?.getTime() ?? 0
    return tb - ta
  })

  return urut.slice(0, limit) as RiwayatSetoranTahfidz[]
}

export function ringkasRiwayatTahfidz(row: RiwayatSetoranTahfidz) {
  const hafalan = formatZiyadahRecord(row)
  const status = String(row.status || '').trim()
  return [hafalan, status].filter(Boolean).join(' · ') || 'Setoran tahfidz'
}

