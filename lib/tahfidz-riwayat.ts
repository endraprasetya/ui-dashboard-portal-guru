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
  surah_ziyadah?: string
  status?: string
  keterangan?: string
  keterangan_pesan_hafalan?: string
  tugas_rumah?: string
  surah_tugas?: string
  ayat_mulai_tugas?: string
  ayat_selesai_tugas?: string
  konfirmasi_ortu?: string
  tipe_tugas?: string
}

export async function fetchRiwayatSetoranTahfidz(idSiswa: string, limit = 5): Promise<RiwayatSetoranTahfidz[]> {
  const id = String(idSiswa || '').trim()
  if (!id) return []

  const kolomUtama =
    'id_setoran,tanggal,hafalan_baru,ayat_mulai,ayat_selesai,surah_ziyadah,status,keterangan,keterangan_pesan_hafalan,tugas_rumah,surah_tugas,ayat_mulai_tugas,ayat_selesai_tugas,konfirmasi_ortu,tipe_tugas'
  const kolomDasar =
    'id_setoran,tanggal,hafalan_baru,ayat_mulai,ayat_selesai,status,keterangan,keterangan_pesan_hafalan,tugas_rumah,surah_tugas,ayat_mulai_tugas,ayat_selesai_tugas,konfirmasi_ortu,tipe_tugas'
  const permintaan = (kolom: string) =>
    supabase
      .from('setoran_tahfidz')
      .select(kolom)
      .eq('id_siswa', id)
      .order('tanggal', { ascending: false })
      .limit(Math.max(limit, 5) * 3)

  let { data, error } = await permintaan(kolomUtama)
  if (error && /surah_ziyadah|column|schema cache/i.test(error.message || '')) {
    const ulang = await permintaan(kolomDasar)
    data = ulang.data
    error = ulang.error
  }

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

