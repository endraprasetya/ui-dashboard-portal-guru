import { fetchPejabatUntukCetak, type PejabatCetak } from '@/lib/setting-cetak'
import { supabase } from '@/lib/supabase'
import { namaSuratArab } from '@/lib/surah-arab'
import { fetchAllSurah, cariSurah } from '@/lib/surah'
import {
  TABEL_DETAIL_RAPOR,
  TABEL_HEADER_RAPOR,
  formatKelasRapor,
  judulAsesmenTahfidz,
  nilaiRaporTahfidz,
  nilaiRataRataSurah,
  nilaiSurah,
  noAbsenDariKode,
  periodeAjaranSekarang,
} from '@/lib/rapor-tahfidz-nilai'
import {
  angkaKelas,
  buatNarasiCapaianTarget,
  buatNarasiKompetensi,
  buatNarasiMotivasi,
  hitungNilaiTarget,
  posisiDariNama,
  posisiTerbaik,
  type PosisiHafalan,
} from '@/lib/target-tahfidz'

export type BarisCetakRaporTahfidz = {
  juz: string
  nomorSurat: string
  namaSurat: string
  namaArab: string
  rentangAyat: string
  kesalahanKelancaran: number
  nilaiKelancaran: number
  nilaiTajwid: number
  nilaiAdab: number
  nilaiSurat: number | null
}

export type DataCetakRaporTahfidz = {
  siswa: {
    idSiswa: string
    nama: string
    nis: string
    nisn: string
    noAbsen: string
    kelas: string
    kelasTampil: string
    unit: string
    pembimbing: string
  }
  asesmen: string
  judulAsesmen: string
  semester: string
  tahunAjaran: string
  judulTahunAjaran: string
  tanggalCetak: string
  nilaiRataRata: number | null
  nilaiTarget: number | null
  nilaiRapor: number | null
  predikat: string
  capaianKompetensi: string
  capaianTarget: string
  motivasi: string
  detail: BarisCetakRaporTahfidz[]
  kepsek: PejabatCetak
  lokasi: string
}

function teks(value: unknown) {
  const hasil = String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
  if (!hasil || hasil === '-' || hasil.toLowerCase() === 'null') return ''
  return hasil
}

function angka(value: unknown) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function posisiDariSetoran(surahs: Awaited<ReturnType<typeof fetchAllSurah>>, row: Record<string, unknown>): PosisiHafalan | null {
  const nama = teks(row.surah_ziyadah) || teks(row.hafalan_baru)
  const ayat = [teks(row.ayat_selesai), teks(row.ayat_mulai), teks(row.rentang_ayat)].filter(Boolean).join('-')
  return posisiDariNama(surahs, nama, ayat)
}

function tanggalPanjang(date = new Date()) {
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

async function ambilDataDiri(nama: string, kelas: string, nis: string) {
  if (nis) {
    const { data } = await supabase
      .from('data_diri_siswa')
      .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn')
      .eq('nomor_induk_sekolah', nis)
      .limit(1)
      .maybeSingle()
    if (data) return data
  }
  if (nama && kelas) {
    const { data } = await supabase
      .from('data_diri_siswa')
      .select('nama_lengkap,kelas,nomor_induk_sekolah,nisn')
      .eq('nama_lengkap', nama)
      .eq('kelas', kelas)
      .limit(1)
      .maybeSingle()
    return data
  }
  return null
}

async function ambilHeaderCetak(id: string, asesmen: string, tahunAjaran: string, semester: string) {
  const kolomLengkap =
    'id_ujian_tahfidz,id_siswa,jenis_asesmen,tahun_ajaran,semester,nilai_akhir,predikat,capaian_kompetensi,capaian_target,motivasi,nilai_target,updated_at'
  const kolomDasar =
    'id_ujian_tahfidz,id_siswa,jenis_asesmen,tahun_ajaran,semester,nilai_akhir,predikat,capaian_kompetensi,capaian_target,motivasi,updated_at'

  let query = supabase.from(TABEL_HEADER_RAPOR).select(kolomLengkap).eq('id_siswa', id)
  if (asesmen) query = query.eq('jenis_asesmen', asesmen)
  const lengkap = await query.order('updated_at', { ascending: false }).limit(5)
  if (!lengkap.error) {
    const rows = lengkap.data || []
    return rows.find((row) => row.tahun_ajaran === tahunAjaran && row.semester === semester) || rows[0] || null
  }
  if (!/nilai_target/i.test(lengkap.error.message || '')) return null

  let cadangan = supabase.from(TABEL_HEADER_RAPOR).select(kolomDasar).eq('id_siswa', id)
  if (asesmen) cadangan = cadangan.eq('jenis_asesmen', asesmen)
  const { data } = await cadangan.order('updated_at', { ascending: false }).limit(5)
  const rows = data || []
  return rows.find((row) => row.tahun_ajaran === tahunAjaran && row.semester === semester) || rows[0] || null
}

export async function fetchCetakRaporTahfidz(idSiswa: string, asesmen?: string): Promise<DataCetakRaporTahfidz | null> {
  const id = teks(idSiswa)
  if (!id) return null

  const { data: siswaRow, error: galatSiswa } = await supabase
    .from('siswa')
    .select('id_siswa,nama_siswa,kelas,unit,id_pembimbing,nis,id_ortu')
    .eq('id_siswa', id)
    .maybeSingle()

  if (galatSiswa || !siswaRow) return null

  const { tahunAjaran, semester } = periodeAjaranSekarang()
  const header = await ambilHeaderCetak(id, teks(asesmen), tahunAjaran, semester)

  const [{ data: detail }, surahs, diri, setoranRes] = await Promise.all([
    header
      ? supabase
          .from(TABEL_DETAIL_RAPOR)
          .select(
            'nama_surat,rentang_ayat,kesalahan_kelancaran,nilai_kelancaran,kesalahan_mad,kesalahan_dengung,kesalahan_makhraj,nilai_tajwid,nilai_adab',
          )
          .eq('header_id', header.id_ujian_tahfidz)
      : Promise.resolve({ data: [] as Record<string, unknown>[] }),
    fetchAllSurah(),
    ambilDataDiri(teks(siswaRow.nama_siswa), teks(siswaRow.kelas), teks(siswaRow.nis)),
    supabase
      .from('setoran_tahfidz')
      .select('hafalan_baru,ayat_mulai,ayat_selesai,surah_ziyadah,tanggal')
      .eq('id_siswa', id)
      .order('tanggal', { ascending: false })
      .limit(80),
  ])

  const idsPembimbing = teks(siswaRow.id_pembimbing)
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)

  let pembimbing = ''
  if (idsPembimbing.length > 0) {
    const { data: guru } = await supabase.from('users').select('target_id,nama_lengkap').in('target_id', idsPembimbing)
    pembimbing = (guru || []).map((row) => teks(row.nama_lengkap)).filter(Boolean).join(', ')
  }

  const pejabat = await fetchPejabatUntukCetak({
    unit: teks(siswaRow.unit),
    kelas: teks(siswaRow.kelas),
    idSiswa: id,
    namaSiswa: teks(siswaRow.nama_siswa),
    guruPengampu: pembimbing,
  })

  const baris: BarisCetakRaporTahfidz[] = (detail || []).map((row) => {
    const namaSurat = teks(row.nama_surat)
    const surah = cariSurah(surahs, namaSurat)
    const mappedNilai = {
      namaSurat,
      rentangAyat: teks(row.rentang_ayat),
      kesalahanKelancaran: angka(row.kesalahan_kelancaran),
      nilaiKelancaran: angka(row.nilai_kelancaran),
      kesalahanMad: angka(row.kesalahan_mad),
      kesalahanDengung: angka(row.kesalahan_dengung),
      kesalahanMakhraj: angka(row.kesalahan_makhraj),
      nilaiTajwid: angka(row.nilai_tajwid),
      nilaiAdab: angka(row.nilai_adab),
    }
    return {
      juz: surah ? String(surah.juz) : '',
      nomorSurat: surah ? String(surah.nomor_surat) : '',
      namaSurat,
      namaArab: namaSuratArab(surah?.nomor_surat),
      rentangAyat: mappedNilai.rentangAyat,
      kesalahanKelancaran: mappedNilai.kesalahanKelancaran,
      nilaiKelancaran: mappedNilai.nilaiKelancaran,
      nilaiTajwid: mappedNilai.nilaiTajwid,
      nilaiAdab: mappedNilai.nilaiAdab,
      nilaiSurat: nilaiSurah(mappedNilai),
    }
  })

  baris.sort((a, b) => Number(b.nomorSurat || 0) - Number(a.nomorSurat || 0))

  const kelasAngka = angkaKelas(teks(siswaRow.kelas))
  const kandidat: PosisiHafalan[] = []
  for (const row of setoranRes.data || []) {
    const posisi = posisiDariSetoran(surahs, row as Record<string, unknown>)
    if (posisi) kandidat.push(posisi)
  }
  for (const row of baris) {
    const posisi = posisiDariNama(surahs, row.namaSurat, row.rentangAyat)
    if (posisi) kandidat.push(posisi)
  }
  const posisiCapaian = posisiTerbaik(kelasAngka || 1, kandidat)
  const hasilTarget = hitungNilaiTarget(teks(siswaRow.kelas), posisiCapaian, surahs)
  const nilaiRataRata = nilaiRataRataSurah(baris.map((row) => row.nilaiSurat))
  const nilaiTarget = hasilTarget.poin
  const nilaiRapor = nilaiRaporTahfidz(nilaiRataRata, nilaiTarget)
  const capaianTarget = buatNarasiCapaianTarget(hasilTarget, teks(header?.jenis_asesmen) || teks(asesmen), surahs)
  const motivasi = buatNarasiMotivasi(hasilTarget)
  const capaianKompetensi =
    teks(header?.capaian_kompetensi) || buatNarasiKompetensi(baris.map((row) => row.namaSurat))

  return {
    siswa: {
      idSiswa: id,
      nama: teks(siswaRow.nama_siswa),
      nis: teks(diri?.nomor_induk_sekolah) || teks(siswaRow.nis),
      nisn: teks(diri?.nisn),
      noAbsen: noAbsenDariKode(teks((siswaRow as { id_ortu?: string }).id_ortu)),
      kelas: teks(siswaRow.kelas),
      kelasTampil: formatKelasRapor(teks(siswaRow.kelas)),
      unit: teks(siswaRow.unit),
      pembimbing,
    },
    asesmen: teks(header?.jenis_asesmen) || teks(asesmen),
    judulAsesmen: judulAsesmenTahfidz(teks(header?.jenis_asesmen) || teks(asesmen), teks(header?.semester) || semester),
    semester: teks(header?.semester) || semester,
    tahunAjaran: teks(header?.tahun_ajaran) || tahunAjaran,
    judulTahunAjaran: `TAHUN AJARAN ${teks(header?.tahun_ajaran) || tahunAjaran}`,
    tanggalCetak: tanggalPanjang(),
    nilaiRataRata,
    nilaiTarget,
    nilaiRapor,
    predikat: teks(header?.predikat),
    capaianKompetensi,
    capaianTarget,
    motivasi,
    detail: baris,
    kepsek: pejabat.kepsek,
    lokasi: pejabat.lokasi || teks(siswaRow.unit) || 'Nogosari',
  }
}
