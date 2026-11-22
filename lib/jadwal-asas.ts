export type ItemJadwalAsas = {
  kelas: string
  mapel: string
}

export type SesiJadwalAsas = {
  waktu: string
  item: ItemJadwalAsas[]
  catatan?: string
}

export type HariJadwalAsas = {
  iso: string
  hari: string
  tanggalTampil: string
  sesi: SesiJadwalAsas[]
}

export const JUDUL_JADWAL_ASAS_I = 'Jadwal ASAS I Tahun Pelajaran 2026/2027'

export const CATATAN_KEPULANGAN_ASAS_I =
  'Kepulangan siswa mulai Senin, 30 November hingga Kamis, 17 Desember 2026 pukul 12.30 WIB.'

export const JADWAL_ASAS_I: HariJadwalAsas[] = [
  {
    iso: '2026-11-23',
    hari: 'Senin',
    tanggalTampil: '23/11/2026',
    sesi: [{ waktu: '07.00–16.00', item: [{ kelas: 'Kelas I–VI', mapel: "Hafalan Al Qur'an" }] }],
  },
  {
    iso: '2026-11-24',
    hari: 'Selasa',
    tanggalTampil: '24/11/2026',
    sesi: [{ waktu: '07.00–14.00', item: [{ kelas: 'Kelas I–VI', mapel: "Hafalan Al Qur'an" }] }],
  },
  {
    iso: '2026-11-25',
    hari: 'Rabu',
    tanggalTampil: '25/11/2026',
    sesi: [{ waktu: '07.00–16.00', item: [{ kelas: 'Kelas I–VI', mapel: 'Hafalan Hadits' }] }],
  },
  {
    iso: '2026-11-26',
    hari: 'Kamis',
    tanggalTampil: '26/11/2026',
    sesi: [{ waktu: '07.00–16.00', item: [{ kelas: 'Kelas I–VI', mapel: 'Hafalan Hadits' }] }],
  },
  {
    iso: '2026-11-28',
    hari: 'Sabtu',
    tanggalTampil: '28/11/2026',
    sesi: [
      {
        waktu: '07.00–09.00',
        item: [
          { kelas: 'Kelas I & II', mapel: 'Praktek PJOK' },
          { kelas: 'Kelas III–VI', mapel: 'Praktek Bahasa Arab' },
        ],
      },
      {
        waktu: '09.30–16.00',
        item: [
          { kelas: 'Kelas I–III', mapel: "Qiro'atul Qur'an" },
          { kelas: 'Kelas IV', mapel: 'Praktek Coding' },
          { kelas: 'Kelas V & VI', mapel: 'Praktek Tajwid' },
        ],
      },
    ],
  },
  {
    iso: '2026-11-30',
    hari: 'Senin',
    tanggalTampil: '30/11/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Semua Kelas', mapel: 'Pembekalan' }] },
      { waktu: '07.30–09.00', item: [{ kelas: 'Semua Kelas', mapel: 'PKN' }] },
      { waktu: '09.30–11.00', item: [{ kelas: 'Semua Kelas', mapel: 'AQIDAH' }] },
    ],
  },
  {
    iso: '2026-12-01',
    hari: 'Selasa',
    tanggalTampil: '01/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Semua Kelas', mapel: 'Pembekalan' }] },
      { waktu: '07.30–09.00', item: [{ kelas: 'Semua Kelas', mapel: 'BAHASA INGGRIS' }] },
      { waktu: '09.30–11.00', item: [{ kelas: 'Semua Kelas', mapel: 'FIQH AKHLAK' }] },
    ],
  },
  {
    iso: '2026-12-02',
    hari: 'Rabu',
    tanggalTampil: '02/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Semua Kelas', mapel: 'Pembekalan' }] },
      { waktu: '07.30–09.00', item: [{ kelas: 'Semua Kelas', mapel: 'BAHASA INDONESIA' }] },
      { waktu: '09.30–11.00', item: [{ kelas: 'Semua Kelas', mapel: 'BAHASA ARAB' }] },
    ],
  },
  {
    iso: '2026-12-03',
    hari: 'Kamis',
    tanggalTampil: '03/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Semua Kelas', mapel: 'Pembekalan' }] },
      { waktu: '07.30–09.00', item: [{ kelas: 'Semua Kelas', mapel: 'BAHASA JAWA' }] },
      {
        waktu: '09.30–11.00',
        item: [
          { kelas: 'Kelas I–III', mapel: 'MATEMATIKA' },
          { kelas: 'Kelas IV–VI', mapel: 'TAJWID' },
        ],
      },
    ],
  },
  {
    iso: '2026-12-05',
    hari: 'Sabtu',
    tanggalTampil: '05/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Semua Kelas', mapel: 'Pembekalan' }] },
      {
        waktu: '07.30–09.00',
        item: [
          { kelas: 'Kelas I & II', mapel: 'Praktek Bahasa Arab' },
          { kelas: 'Kelas III–VI', mapel: 'IPAS' },
        ],
      },
      {
        waktu: '09.30–11.00',
        item: [
          { kelas: 'Kelas III', mapel: 'Praktek SBdP' },
          { kelas: 'Kelas IV–VI', mapel: 'HADITS SIROH' },
        ],
        catatan: 'Kelas I & II selesai',
      },
    ],
  },
  {
    iso: '2026-12-07',
    hari: 'Senin',
    tanggalTampil: '07/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Semua Kelas', mapel: 'Pembekalan' }] },
      {
        waktu: '07.30–09.00',
        item: [
          { kelas: 'Kelas I & II', mapel: 'Praktek Fiqh' },
          { kelas: 'Kelas III', mapel: 'Praktek PJOK' },
          { kelas: 'Kelas IV–VI', mapel: 'MATEMATIKA' },
        ],
      },
      {
        waktu: '09.30–11.00',
        item: [
          { kelas: 'Kelas I & II', mapel: 'Praktek SBdP' },
          { kelas: 'Kelas III', mapel: 'Praktek Fiqh' },
          { kelas: 'Kelas IV', mapel: 'Praktek Tajwid' },
          { kelas: 'Kelas V & VI', mapel: 'Praktek Fiqh' },
        ],
      },
    ],
  },
  {
    iso: '2026-12-08',
    hari: 'Selasa',
    tanggalTampil: '08/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Kelas IV–VI', mapel: 'Pembekalan' }] },
      {
        waktu: '07.30–09.00',
        item: [
          { kelas: 'Kelas I–III', mapel: 'REMIDI DAN SUSULAN' },
          { kelas: 'Kelas IV & VI', mapel: 'Praktek PJOK' },
          { kelas: 'Kelas V', mapel: 'Praktek SBdP' },
        ],
      },
      {
        waktu: '09.30–11.00',
        item: [
          { kelas: 'Kelas IV', mapel: 'Praktek Fiqh' },
          { kelas: 'Kelas V', mapel: 'Praktek Coding' },
          { kelas: 'Kelas VI', mapel: 'Praktek SBdP' },
        ],
      },
    ],
  },
  {
    iso: '2026-12-09',
    hari: 'Rabu',
    tanggalTampil: '09/12/2026',
    sesi: [
      { waktu: '07.00–07.30', item: [{ kelas: 'Kelas IV–VI', mapel: 'Pembekalan' }] },
      {
        waktu: '07.30–11.00',
        item: [
          { kelas: 'Kelas I–III', mapel: 'REMIDI DAN SUSULAN' },
          { kelas: 'Kelas IV', mapel: 'Praktek SBdP' },
          { kelas: 'Kelas V', mapel: 'Praktek PJOK' },
          { kelas: 'Kelas VI', mapel: 'Praktek Coding' },
        ],
      },
    ],
  },
  {
    iso: '2026-12-10',
    hari: 'Kamis',
    tanggalTampil: '10/12/2026',
    sesi: [{ waktu: '07.00–11.00', item: [{ kelas: 'Semua Kelas I–VI', mapel: 'REMIDI DAN SUSULAN' }] }],
  },
]

export function isoTanggalLokal(tanggal = new Date()) {
  const tahun = tanggal.getFullYear()
  const bulan = String(tanggal.getMonth() + 1).padStart(2, '0')
  const hari = String(tanggal.getDate()).padStart(2, '0')
  return `${tahun}-${bulan}-${hari}`
}
