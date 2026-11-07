/** Kerangka data Prestasi & Ekskul Portal Wali — siap dihubungkan ke database. */

export type BidangPrestasi = 'akademik' | 'non-akademik'

export type RekamPrestasi = {
  id: string
  judul: string
  bidang: BidangPrestasi
  tingkat: string
  tanggal: string
  keterangan: string
  penyelenggara?: string
}

export type KegiatanEkskul = {
  id: string
  nama: string
  pembina: string
  jadwal: string
  keterangan: string
}

export type FotoGaleriEkskul = {
  id: string
  kegiatan: string
  judul: string
  keterangan: string
  url?: string
}

/** Rekam jejak prestasi: kosong sampai data sekolah tersedia. */
export const REKAM_PRESTASI_SISWA: RekamPrestasi[] = []

/** Kegiatan ekskul — jadwal kurikuler masih dinamis, pembina menyesuaikan tahun berjalan. */
export const KEGIATAN_EKSKUL: KegiatanEkskul[] = [
  {
    id: 'pramuka',
    nama: 'Pramuka',
    pembina: 'Menyesuaikan SK tahun berjalan',
    jadwal: 'Mengikuti kalender sekolah (dinamis)',
    keterangan: 'Kegiatan kepramukaan dan karakter.',
  },
  {
    id: 'olahraga',
    nama: 'Olahraga & Futsal',
    pembina: 'Menyesuaikan SK tahun berjalan',
    jadwal: 'Mengikuti kalender sekolah (dinamis)',
    keterangan: 'Latihan dan pertandingan internal.',
  },
  {
    id: 'seni',
    nama: 'Seni & Kaligrafi',
    pembina: 'Menyesuaikan SK tahun berjalan',
    jadwal: 'Mengikuti kalender sekolah (dinamis)',
    keterangan: 'Pengembangan bakat seni Islami.',
  },
  {
    id: 'tahfidz-plus',
    nama: 'Tahfidz Plus',
    pembina: 'Guru tahfidz pendamping',
    jadwal: 'Mengikuti kalender sekolah (dinamis)',
    keterangan: 'Pendalaman hafalan di luar jam kurikuler.',
  },
]

/** Galeri foto kegiatan — wadah tampilan; isi URL saat dokumentasi tersedia. */
export const GALERI_FOTO_EKSKUL: FotoGaleriEkskul[] = []
