export type StatusBayar = 'Lunas' | 'Menunggak' | 'Ditanggung Yayasan'
export type StatusTagihan = 'Lunas' | 'Belum'

export type RincianTagihan = {
  tapel: string
  kode: string
  item: string
  jumlah: number
  tagihanAwal?: number
  terbayar?: number
}

export type SiswaTunggakan = {
  nis: string
  nama: string
  kelas: string
  tunggakan: number
  status: StatusBayar
  aktif: boolean
  jumlahTagihan: number
  yatim?: boolean
  /** Nominal tagihan yang ditanggung yayasan, di luar piutang yang ditagihkan. */
  subsidi?: number
}

export type PosUang = {
  nama: string
  jumlah: number
}

export type RekapKelas = {
  kelas: string
  siswa: number
  menunggak: number
  lunas: number
  piutang: number
}

export type RekapKeuangan = {
  sekolah: string
  sekolahId: string
  tapel: string
  diambilPada: string
  piutang: number
  penerimaanHariIni: number
  siswaAktif: number
  siswaLunas: number
  siswaMenunggak: number
  diLuarRombel: number
  penerimaanPerItem: PosUang[]
  piutangPerJenis: PosUang[]
  piutangPerTapel: PosUang[]
  perKelas: RekapKelas[]
  siswa: SiswaTunggakan[]
  periodeTagihan: string
  rekapan: BarisRekapan[]
  /** Rekap internal subsidi silang. Tidak masuk arus kas, LRA, atau neraca. */
  subsidiYatim?: {
    siswa: number
    nominal: number
    baris: { nis: string; nama: string; kelas: string; nominal: number }[]
  }
}

export type BarisRekapan = {
  nis: string
  nama: string
  kelas: string
  tapel: string
  kunciBulan: string
  bulan: string
  jenis: string
  item: string
  kode: string
  status: StatusTagihan
  nominal: number
}

export type DetailTunggakan = {
  nis: string
  nama: string
  kelas: string
  tunggakan: number
  status: StatusBayar
  rincian: RincianTagihan[]
  yatim?: boolean
  subsidi?: number
}
