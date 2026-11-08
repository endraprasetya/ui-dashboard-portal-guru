import type { HasilUjianCetak } from '@/components/cetak-ujian-qiroah'
import { labelPredikatUjian } from '@/lib/qiroah'
import { catatanPenguji } from '@/lib/ujian-relasi'

export function jilidTanpaTajwid(jilid?: string) {
  const j = String(jilid || '').toLowerCase()
  return j.includes('jilid 1') || j.includes('jilid 2')
}

type SumberRekap = {
  id_ujian?: string
  id_siswa?: string
  nama?: string
  kelas?: string
  tanggal_ujian?: string
  guru_pengampu?: string
  jilid_asal?: string
  jilid_tujuan?: string
  penguji?: string
  kelancaran?: number | string | null
  makhraj?: number | string | null
  harakat?: number | string | null
  tajwid?: number | string | null
  adab?: number | string | null
  nilai_akhir?: number | string | null
  predikat?: string
  keputusan?: string
  keterangan?: string
  kelebihan_siswa?: string | null
}

type SumberPengajuan = {
  id_pengajuan?: string
  id_siswa?: string
  nama_siswa?: string
  kelas?: string
  unit?: string
  jilid_diujikan?: string
  tanggal_pelaksanaan?: string
  diajukan_oleh?: string
  nama_penguji?: string
}

export function rekapKeTampilanNilai(
  rekap: SumberRekap,
  pengajuan?: SumberPengajuan | null,
): HasilUjianCetak {
  const asal = String(rekap.jilid_asal || pengajuan?.jilid_diujikan || '')
  const catatan = catatanPenguji(rekap)
  return {
    nomor: String(rekap.id_ujian || pengajuan?.id_pengajuan || ''),
    nama: String(rekap.nama || pengajuan?.nama_siswa || 'Siswa'),
    kelas: String(rekap.kelas || pengajuan?.kelas || '-'),
    unit: String(pengajuan?.unit || ''),
    idSiswa: String(rekap.id_siswa || pengajuan?.id_siswa || ''),
    tanggal: String(rekap.tanggal_ujian || pengajuan?.tanggal_pelaksanaan || ''),
    penguji: String(rekap.penguji || pengajuan?.nama_penguji || '-'),
    guruPengampu: String(rekap.guru_pengampu || pengajuan?.diajukan_oleh || '-'),
    jilidAsal: asal,
    jilidTujuan: String(rekap.jilid_tujuan || ''),
    kelancaran: Number(rekap.kelancaran || 0),
    makhraj: Number(rekap.makhraj || 0),
    harakat: Number(rekap.harakat || 0),
    tajwid: jilidTanpaTajwid(asal) ? null : Number(rekap.tajwid || 0),
    adab: Number(rekap.adab || 0),
    nilaiAkhir: Number(rekap.nilai_akhir || 0),
    predikat: labelPredikatUjian(rekap.predikat) || String(rekap.predikat || '-'),
    keputusan: String(rekap.keputusan || '-'),
    catatan,
  }
}

export function rekapLulusKepsekKeTampilan(row: {
  id_ujian: string
  id_siswa: string
  nama: string
  kelas: string
  unit: string
  tanggal_ujian: string
  guru_pengampu: string
  jilid_asal: string
  jilid_tujuan: string
  penguji: string
  kelancaran: number
  makhraj: number
  harakat: number
  tajwid: number
  adab: number
  nilai_akhir: number
  predikat: string
  keputusan: string
  kelebihan_siswa: string
}): HasilUjianCetak {
  return rekapKeTampilanNilai(
    {
      id_ujian: row.id_ujian,
      id_siswa: row.id_siswa,
      nama: row.nama,
      kelas: row.kelas,
      tanggal_ujian: row.tanggal_ujian,
      guru_pengampu: row.guru_pengampu,
      jilid_asal: row.jilid_asal,
      jilid_tujuan: row.jilid_tujuan,
      penguji: row.penguji,
      kelancaran: row.kelancaran,
      makhraj: row.makhraj,
      harakat: row.harakat,
      tajwid: row.tajwid,
      adab: row.adab,
      nilai_akhir: row.nilai_akhir,
      predikat: row.predikat,
      keputusan: row.keputusan,
      kelebihan_siswa: row.kelebihan_siswa,
    },
    { unit: row.unit },
  )
}
