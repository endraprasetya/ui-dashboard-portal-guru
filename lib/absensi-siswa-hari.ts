import { buildRekapSiswaPerHari, fetchJurnalRentang, type StatusAbsenLabel } from '@/lib/jurnal'
import { kunciHariJakarta } from '@/lib/tahfidz'

export type HasilCekAbsenSiswa = {
  tidakMasuk: boolean
  status: StatusAbsenLabel | null
  adaDataJurnal: boolean
}

export function tanggalKemarinJakarta(hari = kunciHariJakarta()) {
  const basis = new Date(`${hari}T12:00:00+07:00`)
  basis.setDate(basis.getDate() - 1)
  return kunciHariJakarta(basis)
}

/** Status kehadiran siswa pada satu tanggal (YYYY-MM-DD) dari jurnal pembelajaran kelasnya. */
export async function cekAbsenSiswaPadaTanggal(opts: {
  idSiswa: string
  namaSiswa: string
  kelas: string
  tanggal: string
}): Promise<HasilCekAbsenSiswa> {
  const kelas = String(opts.kelas || '').trim()
  const tanggal = String(opts.tanggal || '').slice(0, 10)
  if (!kelas || !tanggal) {
    return { tidakMasuk: false, status: null, adaDataJurnal: false }
  }

  const { rows, error } = await fetchJurnalRentang({ kelas, start: tanggal, end: tanggal })
  if (error || !rows.length) {
    return { tidakMasuk: false, status: null, adaDataJurnal: false }
  }

  const { baris } = buildRekapSiswaPerHari({
    rows,
    siswa: [{ id_siswa: opts.idSiswa, nama_siswa: opts.namaSiswa }],
  })

  const rincian = baris[0]?.rincian.find((item) => item.tanggal.slice(0, 10) === tanggal)
  if (!rincian) {
    return { tidakMasuk: false, status: null, adaDataJurnal: true }
  }

  return { tidakMasuk: true, status: rincian.status, adaDataJurnal: true }
}
