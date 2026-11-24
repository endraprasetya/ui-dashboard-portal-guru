import { supabase } from '@/lib/supabase'
import { normalKelas } from '@/lib/qiroah'
import { isKelasAlumni } from '@/lib/siswa'
import { JENIS_ASESMEN_KURMER, periodeKurmer, type JenisAsesmenKurmer } from '@/lib/rapor-kurmer'

export const PILIHAN_ASESMEN_RAPOR_KURMER = JENIS_ASESMEN_KURMER

export type BarisPemantauanRaporKurmer = {
  namaGuru: string
  kelas: string
  status: 'Sudah Menyetorkan' | 'Belum Menyetorkan'
  siswaMasuk: number
  siswaTotal: number
}

export type NilaiMentahKurmer = {
  idSiswa: string
  kelas: string
  mapel: string
  asts: number | null
  asas: number | null
}

export type DataMentahRaporKurmer = {
  tahunAjaran: string
  semester: string
  labelSemester: string
  kelasSiswa: { kelas: string; namaGuru: string; idSiswa: string[] }[]
  nilai: NilaiMentahKurmer[]
}

export type RingkasRaporKurmer = {
  asesmen: JenisAsesmenKurmer
  sudah: number
  belum: number
  total: number
  siswaSudah: number
  kelasSudah: string[]
}

export type SiswaUnitKurmer = {
  id_siswa: string
  nama_siswa: string
  kelas: string
}

function angkaAtauNull(nilai: unknown) {
  if (nilai == null || nilai === '') return null
  const n = Number(nilai)
  return Number.isFinite(n) ? n : null
}

function adaNilai(nilai: number | null) {
  return nilai != null && Number.isFinite(nilai)
}

export function nilaiAsesmenKurmer(baris: NilaiMentahKurmer, asesmen: JenisAsesmenKurmer) {
  return asesmen === 'ASAS' ? baris.asas : baris.asts
}

export function kumpulanSiswaKurmerMasuk(mentah: DataMentahRaporKurmer, asesmen: JenisAsesmenKurmer) {
  const ids = new Set<string>()
  for (const row of mentah.nilai) {
    if (adaNilai(nilaiAsesmenKurmer(row, asesmen))) ids.add(row.idSiswa)
  }
  return ids
}

export function pilihAsesmenRaporKurmer(mentah: DataMentahRaporKurmer): JenisAsesmenKurmer {
  let terpilih: JenisAsesmenKurmer = 'ASTS'
  let jumlah = -1
  for (const asesmen of PILIHAN_ASESMEN_RAPOR_KURMER) {
    const n = kumpulanSiswaKurmerMasuk(mentah, asesmen).size
    if (n > jumlah) {
      jumlah = n
      terpilih = asesmen
    }
  }
  return terpilih
}

export function hitungPemantauanRaporKurmer(
  mentah: DataMentahRaporKurmer,
  asesmen: JenisAsesmenKurmer,
): BarisPemantauanRaporKurmer[] {
  const masuk = kumpulanSiswaKurmerMasuk(mentah, asesmen)
  return mentah.kelasSiswa
    .filter((blok) => blok.idSiswa.length > 0)
    .map((blok) => {
      const siswaMasuk = blok.idSiswa.filter((id) => masuk.has(id)).length
      return {
        namaGuru: blok.namaGuru || 'Wali kelas',
        kelas: blok.kelas,
        siswaMasuk,
        siswaTotal: blok.idSiswa.length,
        status: siswaMasuk === blok.idSiswa.length ? ('Sudah Menyetorkan' as const) : ('Belum Menyetorkan' as const),
      }
    })
    .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.namaGuru.localeCompare(b.namaGuru, 'id'))
}

export function ringkasPemantauanRaporKurmer(
  baris: BarisPemantauanRaporKurmer[],
  asesmen: JenisAsesmenKurmer,
  siswaSudah = 0,
): RingkasRaporKurmer {
  const sudah = baris.filter((row) => row.status === 'Sudah Menyetorkan').length
  const kelasSudah = baris
    .filter((row) => row.siswaMasuk > 0)
    .map((row) => row.kelas)
    .sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
  return { asesmen, sudah, belum: baris.length - sudah, total: baris.length, siswaSudah, kelasSudah }
}

function guruDariJurnal(jurnal: { kelas?: string | null; guru?: string | null }[]) {
  const hitung = new Map<string, Map<string, number>>()
  for (const row of jurnal) {
    const kelas = normalKelas(String(row.kelas || ''))
    const guru = String(row.guru || '').trim()
    if (!kelas || !guru) continue
    const peta = hitung.get(kelas) || new Map<string, number>()
    peta.set(guru, (peta.get(guru) || 0) + 1)
    hitung.set(kelas, peta)
  }
  const hasil = new Map<string, string>()
  for (const [kelas, peta] of hitung) {
    const terbaik = [...peta.entries()].sort((a, b) => b[1] - a[1])[0]
    if (terbaik) hasil.set(kelas, terbaik[0])
  }
  return hasil
}

export function dataKurmerKosong(): DataMentahRaporKurmer {
  const periode = periodeKurmer()
  return {
    tahunAjaran: periode.tahunAjaran,
    semester: periode.semester,
    labelSemester: periode.labelSemester,
    kelasSiswa: [],
    nilai: [],
  }
}

export async function muatDataRaporKurmerKepsek(
  siswaUnit: SiswaUnitKurmer[],
  jurnal: { kelas?: string | null; guru?: string | null }[] = [],
): Promise<{ mentah: DataMentahRaporKurmer; catatan: string[] }> {
  const periode = periodeKurmer()
  const catatan: string[] = []
  const guruKelas = guruDariJurnal(jurnal)
  const perKelas = new Map<string, string[]>()
  const idUnit = new Set<string>()
  for (const siswa of siswaUnit) {
    const kelas = normalKelas(siswa.kelas)
    if (!kelas || isKelasAlumni(kelas)) continue
    idUnit.add(siswa.id_siswa)
    const daftar = perKelas.get(kelas) || []
    daftar.push(siswa.id_siswa)
    perKelas.set(kelas, daftar)
  }

  const nilai: NilaiMentahKurmer[] = []
  const ids = [...idUnit]
  const ukuran = 80
  for (let i = 0; i < ids.length; i += ukuran) {
    const bagian = ids.slice(i, i + ukuran)
    const { data, error } = await supabase
      .from('rapor_kurmer_nilai')
      .select('id_siswa,kelas,mata_pelajaran,tahun_ajaran,semester,asts,asas')
      .eq('tahun_ajaran', periode.tahunAjaran)
      .in('id_siswa', bagian)
    if (error) {
      catatan.push('Kiriman rapor Kurmer belum dapat dimuat.')
      break
    }
    for (const row of data || []) {
      const semester = String(row.semester ?? '')
      if (semester !== periode.semester && Number(semester) !== Number(periode.semester)) continue
      const idSiswa = String(row.id_siswa || '')
      if (!idUnit.has(idSiswa)) continue
      nilai.push({
        idSiswa,
        kelas: normalKelas(String(row.kelas || '')) || normalKelas(siswaUnit.find((item) => item.id_siswa === idSiswa)?.kelas || ''),
        mapel: String(row.mata_pelajaran || ''),
        asts: angkaAtauNull(row.asts),
        asas: angkaAtauNull(row.asas),
      })
    }
  }

  const kelasSiswa = [...perKelas.entries()]
    .map(([kelas, idSiswa]) => ({
      kelas,
      namaGuru: guruKelas.get(kelas) || 'Wali kelas',
      idSiswa: [...new Set(idSiswa)],
    }))
    .sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }))

  return {
    mentah: {
      tahunAjaran: periode.tahunAjaran,
      semester: periode.semester,
      labelSemester: periode.labelSemester,
      kelasSiswa,
      nilai,
    },
    catatan,
  }
}
