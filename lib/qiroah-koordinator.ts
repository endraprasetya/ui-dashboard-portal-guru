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
import { fetchDaftarSiswa, kanonNamaUnit, unitCocok } from '@/lib/siswa'

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

const KELAS_PUTRA_QQ = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B', '5A', '5B', '6A', '6B']
const KELAS_PUTRI_QQ = ['1C', '1D', '2C', '2D', '3C', '3D', '4C', '4D', '5C', '5D', '6C', '6D']

export type LingkupKoordinatorQQ = {
  jenis: 'Putra' | 'Putri'
  kelas: string[]
  nama: string
}

type AkunKoordinator = {
  unit?: string | null
  nama_lengkap?: string | null
  nama?: string | null
  username?: string | null
  target_id?: string | null
}

function tokenOrang(nilai: unknown) {
  return String(nilai ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter((token) => token.length > 2)
}

export function kodeKelasQQ(kelas: unknown) {
  return String(kelas ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

export function lingkupKoordinatorQQ(user?: AkunKoordinator | null): LingkupKoordinatorQQ | null {
  const token = new Set([user?.nama_lengkap, user?.nama, user?.username].flatMap((item) => tokenOrang(item)))
  const target = String(user?.target_id || '').trim().toUpperCase()
  if (token.has('yulianto') || target === 'U023') {
    return { jenis: 'Putra', kelas: KELAS_PUTRA_QQ, nama: 'Ustadz Yulianto' }
  }
  if (token.has('siswati') || target === 'U190') {
    return { jenis: 'Putri', kelas: KELAS_PUTRI_QQ, nama: 'Ustadzah Siswati' }
  }
  return null
}

function jenisKelaminNorm(nilai: unknown): 'Putra' | 'Putri' | '' {
  const teks = String(nilai ?? '').trim().toLowerCase()
  if (!teks) return ''
  if (teks.includes('perempuan') || teks.includes('putri') || teks === 'p' || teks === 'w') return 'Putri'
  if (teks.includes('laki') || teks.includes('putra') || teks === 'l') return 'Putra'
  return ''
}

function kunciNamaKelas(nama: unknown, kelas: unknown) {
  const bersih = String(nama ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  return `${kodeKelasQQ(kelas)}|${bersih}`
}

async function muatPetaJenisKelamin() {
  const peta = new Map<string, 'Putra' | 'Putri'>()
  const ukuran = 1000
  let dari = 0
  while (true) {
    const { data, error } = await supabase
      .from('data_diri_siswa')
      .select('nama_lengkap,kelas,jenis_kelamin')
      .range(dari, dari + ukuran - 1)
    if (error || !data?.length) break
    for (const row of data) {
      const jenis = jenisKelaminNorm(row.jenis_kelamin)
      if (!jenis) continue
      peta.set(kunciNamaKelas(row.nama_lengkap, row.kelas), jenis)
    }
    if (data.length < ukuran) break
    dari += ukuran
  }
  return peta
}

function masukLingkup(
  nama: unknown,
  kelas: unknown,
  lingkup: LingkupKoordinatorQQ,
  jenisKelamin: Map<string, 'Putra' | 'Putri'>,
) {
  if (!lingkup.kelas.includes(kodeKelasQQ(kelas))) return false
  const jenis = jenisKelamin.get(kunciNamaKelas(nama, kelas))
  if (!jenis) return true
  return jenis === lingkup.jenis
}

function filterUnit<T extends { unit?: string }>(rows: T[], currentUser?: { unit?: string | null } | null) {
  const mentah = String(currentUser?.unit || '').trim()
  if (/^semua\s*unit$/i.test(mentah)) return rows
  if (!kanonNamaUnit(mentah)) return []
  return rows.filter((r) => unitCocok(mentah, r.unit))
}

export async function muatDataKoordinatorQQ(
  currentUser?: AkunKoordinator | null,
  bulan: string = bulanSekarangJakarta(),
) {
  const semuaSiswa = await fetchDaftarSiswa()
  const unitUser = String(currentUser?.unit || '').trim()
  const siswaUnit = /^semua\s*unit$/i.test(unitUser)
    ? semuaSiswa
    : kanonNamaUnit(unitUser)
      ? semuaSiswa.filter((s) => unitCocok(unitUser, s.unit))
      : []
  const lingkup = lingkupKoordinatorQQ(currentUser)
  const jenisKelamin = lingkup ? await muatPetaJenisKelamin() : new Map<string, 'Putra' | 'Putri'>()
  const siswa = lingkup ? siswaUnit.filter((s) => masukLingkup(s.nama_siswa, s.kelas, lingkup, jenisKelamin)) : siswaUnit

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

  const idSiswaUnit = new Set(siswa.map((item) => String(item.id_siswa)))
  const pengajuan = filterUnit((pengajuanRaw || []) as PengajuanKoordinator[], currentUser).filter((row) => {
    if (!lingkup) return true
    const id = String(row.id_siswa || '').trim()
    if (id) return idSiswaUnit.has(id)
    return masukLingkup(row.nama_siswa, row.kelas, lingkup, jenisKelamin)
  })
  const rekapan = ((rekapanRaw || []) as RekapanKoordinator[]).filter((row) => {
    const id = String(row.id_siswa || '').trim()
    if (id) return idSiswaUnit.has(id)
    if (!lingkup) return false
    return masukLingkup(row.nama, row.kelas, lingkup, jenisKelamin)
  })

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
    lingkup,
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
