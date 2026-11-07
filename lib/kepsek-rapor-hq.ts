import { supabase } from '@/lib/supabase'
import { TABEL_HEADER_RAPOR, periodeAjaranSekarang } from '@/lib/rapor-tahfidz-nilai'
import { UNIT_KEPALA_SEKOLAH, adalahKepalaSekolah } from '@/lib/kepala-sekolah'
import { normalKelas, teacherDisplayName } from '@/lib/qiroah'

export const PILIHAN_ASESMEN_RAPOR_HQ = [
  { kode: 'ASTS I', label: 'ASTS 1' },
  { kode: 'ASAS', label: 'ASAS' },
  { kode: 'ASTS II', label: 'ASTS 2' },
  { kode: 'ASAT', label: 'ASAT' },
] as const

export type KodeAsesmenRaporHq = (typeof PILIHAN_ASESMEN_RAPOR_HQ)[number]['kode']

export type BarisPemantauanRaporHq = {
  namaGuru: string
  kelas: string
  status: 'Sudah Menyetorkan' | 'Belum Menyetorkan'
}

export type DataMentahRaporHq = {
  tahunAjaran: string
  semester: string
  guruKelas: { guruId: string; namaGuru: string; kelas: string; idSiswa: string[] }[]
  headerNilai: { id_siswa: string; jenis_asesmen: string; nilai_akhir: number | null }[]
}

export type RingkasRaporHq = {
  asesmen: KodeAsesmenRaporHq
  sudah: number
  belum: number
  total: number
}

export type SiswaBinaanUnit = {
  id_siswa: string
  kelas: string
  id_pembimbing?: string | null
}

function unitSama(nilai?: string) {
  return String(nilai || '').trim().toLowerCase() === UNIT_KEPALA_SEKOLAH.toLowerCase()
}

function normalAsesmen(teks: string) {
  const k = String(teks || '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
  if (k.includes('ASTS II') || k.includes('ASTS 2') || k.includes('TENGAH SEMESTER II')) return 'ASTS II'
  if (k.includes('ASTS I') || k.includes('ASTS 1') || k.includes('TENGAH SEMESTER I') || k === 'ASTS') return 'ASTS I'
  if (k === 'ASAT' || k.includes('AKHIR TAHUN')) return 'ASAT'
  if (k === 'ASAS' || k.includes('AKHIR SEMESTER')) return 'ASAS'
  return k
}

function sudahMenyetorkan(nilai: number | null | undefined) {
  return nilai != null && Number.isFinite(Number(nilai))
}

export function hitungPemantauanRaporHq(mentah: DataMentahRaporHq, asesmen: KodeAsesmenRaporHq): BarisPemantauanRaporHq[] {
  const kode = normalAsesmen(asesmen)
  const petaHeader = new Map<string, boolean>()
  for (const row of mentah.headerNilai) {
    if (normalAsesmen(row.jenis_asesmen) !== kode) continue
    if (sudahMenyetorkan(row.nilai_akhir)) {
      petaHeader.set(String(row.id_siswa), true)
    }
  }

  const baris: BarisPemantauanRaporHq[] = []
  for (const blok of mentah.guruKelas) {
    if (blok.idSiswa.length === 0) continue
    const lengkap = blok.idSiswa.every((id) => petaHeader.get(id))
    baris.push({
      namaGuru: blok.namaGuru,
      kelas: blok.kelas,
      status: lengkap ? 'Sudah Menyetorkan' : 'Belum Menyetorkan',
    })
  }
  return baris.sort((a, b) => a.kelas.localeCompare(b.kelas, 'id', { numeric: true }) || a.namaGuru.localeCompare(b.namaGuru, 'id'))
}

export function ringkasPemantauanRaporHq(baris: BarisPemantauanRaporHq[], asesmen: KodeAsesmenRaporHq): RingkasRaporHq {
  const sudah = baris.filter((row) => row.status === 'Sudah Menyetorkan').length
  return { asesmen, sudah, belum: baris.length - sudah, total: baris.length }
}

export async function muatDataRaporHqKepsek(
  siswaUnit: SiswaBinaanUnit[],
): Promise<{ mentah: DataMentahRaporHq; catatan: string[] }> {
  const catatan: string[] = []
  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const ids = siswaUnit.map((s) => s.id_siswa)
  const headerNilai: DataMentahRaporHq['headerNilai'] = []

  if (ids.length) {
    const ukuran = 80
    for (let i = 0; i < ids.length; i += ukuran) {
      const bagian = ids.slice(i, i + ukuran)
      const { data, error } = await supabase
        .from(TABEL_HEADER_RAPOR)
        .select('id_siswa,jenis_asesmen,nilai_akhir')
        .eq('tahun_ajaran', tahunAjaran)
        .eq('semester', semester)
        .in('id_siswa', bagian)
      if (error) {
        catatan.push('Nilai Rapor HQ belum dapat dimuat.')
        break
      }
      for (const row of data || []) {
        headerNilai.push({
          id_siswa: String(row.id_siswa),
          jenis_asesmen: String(row.jenis_asesmen || ''),
          nilai_akhir: row.nilai_akhir == null ? null : Number(row.nilai_akhir),
        })
      }
    }
  }

  const { data: guru, error: galatGuru } = await supabase
    .from('users')
    .select('target_id,username,nama_lengkap,unit,role')
    .eq('unit', UNIT_KEPALA_SEKOLAH)
    .limit(500)
  if (galatGuru) {
    catatan.push('Daftar guru untuk Rapor HQ belum dapat dimuat.')
    return { mentah: { tahunAjaran, semester, guruKelas: [], headerNilai }, catatan }
  }

  const kelasBinaan = (row: { target_id?: string; username?: string }) => {
    const id = String(row.target_id || row.username || '')
      .trim()
      .toUpperCase()
    if (!id) return new Map<string, string[]>()
    const peta = new Map<string, string[]>()
    for (const siswa of siswaUnit) {
      const pembimbing = String(siswa.id_pembimbing || '')
        .split(',')
        .map((item) => item.trim().toUpperCase())
      if (!pembimbing.includes(id)) continue
      const kelas = normalKelas(siswa.kelas)
      if (!kelas) continue
      const daftar = peta.get(kelas) || []
      daftar.push(siswa.id_siswa)
      peta.set(kelas, daftar)
    }
    return peta
  }

  const guruKelas: DataMentahRaporHq['guruKelas'] = []
  for (const row of guru || []) {
    if (!unitSama(row.unit) || adalahKepalaSekolah(row)) continue
    const guruId = String(row.target_id || row.username || '').trim().toUpperCase()
    if (!guruId) continue
    const namaGuru = teacherDisplayName(row)
    for (const [kelas, idSiswa] of kelasBinaan(row)) {
      guruKelas.push({ guruId, namaGuru, kelas, idSiswa: [...new Set(idSiswa)] })
    }
  }

  return {
    mentah: { tahunAjaran, semester, guruKelas, headerNilai },
    catatan,
  }
}
