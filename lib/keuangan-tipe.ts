export type StatusBayar = 'Lunas' | 'Menunggak'

export type RincianTagihan = {
  tapel: string
  kode: string
  item: string
  jumlah: number
}

export type SiswaTunggakan = {
  nis: string
  nama: string
  kelas: string
  tunggakan: number
  status: StatusBayar
  aktif: boolean
  jumlahTagihan: number
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
}

export type DetailTunggakan = {
  nis: string
  nama: string
  kelas: string
  tunggakan: number
  status: StatusBayar
  rincian: RincianTagihan[]
}
