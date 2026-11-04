import { supabase } from '@/lib/supabase'
import { ambilBarisSiswa } from '@/lib/siswa'
import { validasiAyatSurat, type Surah } from '@/lib/surah'

export const ASESMEN_TAHFIDZ = ['ASTS I', 'ASAS', 'ASTS II', 'ASAT'] as const
export type AsesmenTahfidz = (typeof ASESMEN_TAHFIDZ)[number]

export type MateriSurah = {
  nomor: number
  nama: string
  ayatMulai: string
  ayatSelesai: string
  jumlahAyat: number
}

export type BarisMateriUjian = {
  id_siswa: string
  kelas: string
  asesmen: string
  surah: string
  ayat: string
  keterangan: string
  guru: string
}

export const CONTOH_KETERANGAN_UJIAN = 'siswa dapat menyetorkan surah dengan lancar dan benar'

export const JUDUL_JADWAL_UJIAN_TAHFIDZ = "Jadwal Ujian Hafalan Qur'an"

export const TEKS_JADWAL_UJIAN_TAHFIDZ_KOSONG =
  'Tanggal ujian belum diatur. Silakan koordinasi dengan koordinator tahfidz untuk penjadwalan ujian hafalan.'

/** Teks jadwal dari tabel `setting` (nama_variabel mengandung jadwal ujian tahfidz), atau teks default. */
export async function fetchTeksJadwalUjianTahfidz() {
  const { data, error } = await supabase.from('setting').select('nama_variabel,nilai,keterangan')
  if (error || !data?.length) return TEKS_JADWAL_UJIAN_TAHFIDZ_KOSONG

  const baris = data.find((row) => {
    const k = teks(row.nama_variabel).toLowerCase().replace(/[\s_-]+/g, '')
    return k.includes('jadwal') && k.includes('ujian') && (k.includes('tahfidz') || k.includes('hafalan'))
  })
  if (!baris) return TEKS_JADWAL_UJIAN_TAHFIDZ_KOSONG

  const nilai = teks(baris.nilai)
  const ket = teks(baris.keterangan)
  if (nilai && ket) return `${nilai} — ${ket}`
  if (nilai) return nilai
  if (ket) return ket
  return TEKS_JADWAL_UJIAN_TAHFIDZ_KOSONG
}

function teks(value: unknown) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
}

export function formatRentangAyat(mulai: string, selesai: string) {
  const a = teks(mulai)
  const b = teks(selesai) || a
  if (!a) return ''
  return a === b ? a : `${a}-${b}`
}

export function formatLabelMateri(item: MateriSurah) {
  const ayat = formatRentangAyat(item.ayatMulai, item.ayatSelesai)
  return ayat ? `${item.nama} (Ayat ${ayat})` : item.nama
}

export function validasiMateriUjian(surahs: Surah[], materi: MateriSurah[]) {
  if (materi.length === 0) return 'Pilih minimal satu surah untuk materi ujian.'
  for (const item of materi) {
    const galat = validasiAyatSurat(surahs, item.nama, item.ayatMulai, item.ayatSelesai, item.nama)
    if (galat) return galat
    if (!teks(item.ayatMulai) || !teks(item.ayatSelesai)) {
      return `Lengkapi ayat untuk ${item.nama}.`
    }
  }
  return null
}

export async function fetchMateriUjianTahfidz(idSiswa: string[]) {
  return ambilBarisSiswa(idSiswa, (bagian, from, to) =>
    supabase
      .from('materi_ujian_tahfidz')
      .select('id_siswa,kelas,asesmen,surah,ayat,keterangan,guru')
      .in('id_siswa', bagian)
      .range(from, to),
  )
}

export async function simpanMateriUjianTahfidz(payload: {
  idSiswa: string
  kelas: string
  asesmen: AsesmenTahfidz
  materi: MateriSurah[]
  keterangan: string
  guru: string
}) {
  const baris: BarisMateriUjian[] = payload.materi.map((item) => ({
    id_siswa: payload.idSiswa,
    kelas: payload.kelas,
    asesmen: payload.asesmen,
    surah: item.nama,
    ayat: formatRentangAyat(item.ayatMulai, item.ayatSelesai),
    keterangan: teks(payload.keterangan),
    guru: teks(payload.guru),
  }))

  const hapus = await supabase
    .from('materi_ujian_tahfidz')
    .delete()
    .eq('id_siswa', payload.idSiswa)
    .eq('asesmen', payload.asesmen)

  if (hapus.error && hapus.error.code !== 'PGRST116') {
    console.error('Gagal mereset materi ujian lama:', hapus.error.message)
  }

  const { data, error } = await supabase.from('materi_ujian_tahfidz').insert(baris).select('id_siswa,asesmen,surah')
  if (error) return { error: error.message, data: [] as BarisMateriUjian[] }
  return { error: null, data: (data || []) as BarisMateriUjian[] }
}

export function gabungMateriSiswa(baris: BarisMateriUjian[]) {
  const peta = new Map<
    string,
    {
      idSiswa: string
      kelas: string
      asesmen: string
      guru: string
      keterangan: string
      materi: string
    }
  >()

  for (const row of baris) {
    const kunci = `${row.id_siswa}|${row.asesmen}`
    const label = row.ayat ? `${row.surah} (Ayat ${row.ayat})` : row.surah
    const lama = peta.get(kunci)
    if (!lama) {
      peta.set(kunci, {
        idSiswa: row.id_siswa,
        kelas: row.kelas,
        asesmen: row.asesmen,
        guru: row.guru,
        keterangan: row.keterangan,
        materi: label,
      })
      continue
    }
    lama.materi = `${lama.materi}; ${label}`
    if (!lama.keterangan) lama.keterangan = row.keterangan
  }

  return Array.from(peta.values())
}
