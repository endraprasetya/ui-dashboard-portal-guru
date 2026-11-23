import { fetchRiwayatSetoranTahfidz } from '@/lib/tahfidz-riwayat'
import { fetchAllSurah, type Surah } from '@/lib/surah'
import { formatZiyadahRecord, parseBagianAyat } from '@/lib/tahfidz'
import {
  angkaKelas,
  buatNarasiCapaianTarget,
  buatNarasiMotivasi,
  hitungNilaiTarget,
  posisiDariNama,
  posisiTerbaik,
  type PosisiHafalan,
} from '@/lib/target-tahfidz'

function posisiDariSetoran(surahs: Surah[], row: Record<string, unknown>): PosisiHafalan | null {
  const label = formatZiyadahRecord(row)
  const bagian = parseBagianAyat(label === '-' ? '' : label)
  if (bagian?.surah) {
    const rentang = [bagian.mulai, bagian.selesai].filter(Boolean).join('-')
    const pos = posisiDariNama(surahs, bagian.surah, rentang)
    if (pos) return pos
  }
  const nama = String(row.surah_ziyadah || row.hafalan_baru || row.surah || row.nama_surat || '').trim()
  const ayat = String(row.ayat_selesai || row.ayat_mulai || row.ayat || row.ayat_akhir || '').trim()
  if (!nama) return null
  return posisiDariNama(surahs, nama, ayat)
}

export type SaranTargetTahfidz = {
  nilaiTarget: number
  capaianTarget: string
  motivasi: string
  ringkas: string
}

export async function hitungSaranTargetTahfidz(
  idSiswa: string,
  kelas: string,
  asesmen: string,
  materiUjian: { nama: string; ayat: string }[],
): Promise<SaranTargetTahfidz | null> {
  const [surahs, setoran] = await Promise.all([fetchAllSurah(), fetchRiwayatSetoranTahfidz(idSiswa, 30)])
  const kandidat: PosisiHafalan[] = []
  for (const row of setoran) {
    const pos = posisiDariSetoran(surahs, row as Record<string, unknown>)
    if (pos) kandidat.push(pos)
  }
  for (const row of materiUjian) {
    const pos = posisiDariNama(surahs, row.nama, row.ayat)
    if (pos) kandidat.push(pos)
  }
  const kelasAngka = angkaKelas(kelas) || 1
  const posisi = posisiTerbaik(kelasAngka, kandidat)
  const benar = hitungNilaiTarget(kelas, posisi, surahs)
  return {
    nilaiTarget: benar.poin,
    capaianTarget: buatNarasiCapaianTarget(benar, asesmen, surahs),
    motivasi: buatNarasiMotivasi(benar),
    ringkas: `Target kurikulum: ${benar.targetKurikulum} · ${benar.poin} poin`,
  }
}
