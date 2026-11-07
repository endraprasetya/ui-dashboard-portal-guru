import { supabase } from '@/lib/supabase'
import {
  labelStatusPengajuan,
  menungguJadwal,
  pengujiEfektif,
  sudahTerjadwal,
  waktuDariStatus,
} from '@/lib/qiroah'
import {
  bulanSekarangJakarta,
  hitungProgresBulananSantri,
  muatSetoranQiroah,
  type SetoranRingkas,
} from '@/lib/qiroah-koordinator-setoran'
import { catatanPenguji, cariRekapan, ujianSudahSelesai, type RekapanRingkas } from '@/lib/ujian-relasi'
import { fetchDaftarSiswa, unitCocok } from '@/lib/siswa'

export type PengajuanKoordinator = {
  id_pengajuan: string
  tanggal_diajukan?: string
  tanggal_pelaksanaan?: string
  unit?: string
  id_siswa?: string
  nama_siswa?: string
  kelas?: string
  jilid_diujikan?: string
  diajukan_oleh?: string
  nama_penguji?: string
  status?: string
}

export type RekapanKoordinator = RekapanRingkas & {
  kelas?: string
  guru_pengampu?: string
  rekomendasi_tindak_lanjut?: string
  kelebihan_siswa?: string
}

export type { SetoranRingkas } from '@/lib/qiroah-koordinator-setoran'

export function keputusanLulus(keputusan?: string) {
  return String(keputusan || '').trim().toLowerCase() === 'lulus'
}

export function tindakLanjutKoordinator(rekap: RekapanKoordinator) {
  const keputusan = String(rekap.keputusan || '').trim().toLowerCase()
  const rek = String(rekap.rekomendasi_tindak_lanjut || '').trim().toLowerCase()
  const jilidTujuan = String(rekap.jilid_tujuan || '').toLowerCase()
  if (keputusanLulus(rekap.keputusan)) {
    if (jilidTujuan.includes('hafalan') || jilidTujuan.includes("qur'an") || jilidTujuan.includes('quran')) {
      return { label: 'Siap SKL', tone: 'emerald' as const }
    }
    return { label: 'Siap naik jilid', tone: 'sky' as const }
  }
  if (keputusan.includes('maqbul') || keputusan.includes('remedial') || rek.includes('ulang')) {
    return { label: 'Remedial / ujian ulang', tone: 'amber' as const }
  }
  if (keputusan && keputusan !== 'lulus') {
    return { label: 'Perlu perhatian', tone: 'rose' as const }
  }
  return { label: 'Tindak lanjut', tone: 'slate' as const }
}

function filterUnit<T extends { unit?: string }>(rows: T[], currentUser?: { unit?: string } | null) {
  if (!currentUser?.unit) return rows
  return rows.filter((r) => unitCocok(currentUser.unit, r.unit))
}

export async function muatDataKoordinatorQQ(
  currentUser?: { unit?: string } | null,
  bulan: string = bulanSekarangJakarta(),
) {
  const semuaSiswa = await fetchDaftarSiswa()
  const unitUser = String(currentUser?.unit || '').trim()
  const siswa =
    unitUser && unitUser.toLowerCase() !== 'semua unit'
      ? semuaSiswa.filter((s) => unitCocok(unitUser, s.unit))
      : semuaSiswa

  const [{ data: pengajuanRaw, error: errPengajuan }, { data: rekapanRaw, error: errRekapan }] = await Promise.all([
    supabase.from('pengajuan').select('*').order('tanggal_diajukan', { ascending: false }),
    supabase
      .from('rekapan')
      .select(
        'id_ujian,tanggal_ujian,id_siswa,nama,kelas,guru_pengampu,jilid_asal,jilid_tujuan,ujian_ke,penguji,kelancaran,makhraj,harakat,tajwid,adab,keterangan,kelebihan_siswa,rekomendasi_tindak_lanjut,predikat,keputusan,nilai_akhir',
      )
      .order('tanggal_ujian', { ascending: false }),
  ])

  if (errPengajuan) throw new Error(errPengajuan.message)
  if (errRekapan) throw new Error(errRekapan.message)

  const pengajuan = filterUnit((pengajuanRaw || []) as PengajuanKoordinator[], currentUser)
  const rekapan = (rekapanRaw || []) as RekapanKoordinator[]

  const bulanAktif = /^\d{4}-\d{2}$/.test(bulan) ? bulan : bulanSekarangJakarta()
  const setoran = await muatSetoranQiroah(siswa, { bulan: bulanAktif })
  const progresBulanan = hitungProgresBulananSantri(siswa, setoran, bulanAktif)

  const pengajuanAktif = pengajuan.filter((p) => {
    const rekap = cariRekapan(p, rekapan)
    return !ujianSudahSelesai(p.status, rekap)
  })

  const menunggu = pengajuanAktif.filter((p) => menungguJadwal(p.status))
  const terjadwal = pengajuanAktif.filter((p) => sudahTerjadwal(p.status))

  const lulus = rekapan.filter((r) => keputusanLulus(r.keputusan)).length
  const maqbul = rekapan.filter((r) => {
    const k = String(r.keputusan || '').toLowerCase()
    return k && !keputusanLulus(r.keputusan)
  }).length

  const jadwal = terjadwal
    .map((row) => ({
      ...row,
      labelStatus: labelStatusPengajuan(row.status),
      waktu: waktuDariStatus(row.status),
      penguji: pengujiEfektif(row),
    }))
    .sort((a, b) =>
      String(a.tanggal_pelaksanaan || a.tanggal_diajukan || '').localeCompare(
        String(b.tanggal_pelaksanaan || b.tanggal_diajukan || ''),
      ),
    )

  const hasilUjian = rekapan.map((row) => ({
    ...row,
    catatan: catatanPenguji(row),
    tindak: tindakLanjutKoordinator(row),
  }))

  return {
    siswa,
    pengajuan,
    rekapan,
    stats: {
      santriAktif: siswa.length,
      pengajuanBerjalan: pengajuanAktif.length,
      menungguJadwal: menunggu.length,
      terjadwal: terjadwal.length,
      lulus,
      belumLulus: maqbul,
    },
    bulan: bulanAktif,
    setoran,
    progresBulanan,
    jadwal,
    hasilUjian,
  }
}

export function persenKelulusan(lulus: number, maqbul: number) {
  const total = lulus + maqbul
  if (total === 0) return { lulus: 0, maqbul: 0 }
  return {
    lulus: Math.round((lulus / total) * 100),
    maqbul: Math.round((maqbul / total) * 100),
  }
}
