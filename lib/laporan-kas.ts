import {
  KODE_AKUN_KAS,
  kanonUnitKeuangan,
  muatDaftarAkun,
  muatTransaksiKas,
  STATUS_DISETUJUI,
  type BarisAkun,
  type TransaksiKas,
} from '@/lib/kasir'
import { supabase } from '@/lib/supabase'

export type PosLaporan = {
  kode_akun: string
  nama_akun: string
  masuk: number
  keluar: number
  realisasi: number
  anggaran: number
}

export type ArusKas = {
  unit: string
  periode: string
  kas: { kode: string; nama: string; masuk: number; keluar: number; neto: number }[]
  totalMasuk: number
  totalKeluar: number
  neto: number
}

export type RealisasiAnggaran = {
  unit: string
  periode: string
  pendapatan: PosLaporan[]
  belanja: PosLaporan[]
  totalPendapatan: number
  totalBelanja: number
  totalAnggaranPendapatan: number
  totalAnggaranBelanja: number
}

export type NeracaKas = {
  unit: string
  periode: string
  aset: { kode: string; nama: string; saldo: number }[]
  totalAset: number
}

function namaBulan(periode: string) {
  if (!/^\d{4}-\d{2}$/.test(periode)) return periode
  const [tahun, bulan] = periode.split('-')
  const label = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${label[Number(bulan) - 1] || bulan} ${tahun}`
}

function dalamPeriode(tanggal: string, periode: string) {
  if (!periode) return true
  const nilai = String(tanggal || '').slice(0, 10)
  return nilai.startsWith(periode)
}

function kelompokAkun(kode: string, kategori?: string) {
  const akun = String(kode || '').trim()
  if (KODE_AKUN_KAS.includes(akun as (typeof KODE_AKUN_KAS)[number]) || akun.startsWith('3')) return 'kas'
  if (kategori === 'Penerimaan' || akun.startsWith('1') || akun.startsWith('4')) return 'pendapatan'
  if (kategori === 'Pengeluaran' || akun.startsWith('2') || akun.startsWith('5')) return 'belanja'
  return 'lain'
}

async function muatAnggaran(unit: string, tahun: string) {
  const peta = new Map<string, number>()
  const { data, error } = await supabase
    .from('tabel_anggaran')
    .select('kode_akun,nominal,unit,tahun')
    .limit(1000)
  if (error) return peta
  for (const baris of data || []) {
    const row = baris as { kode_akun?: string; nominal?: number; unit?: string; tahun?: string }
    if (unit && row.unit && kanonUnitKeuangan(row.unit) !== unit) continue
    if (tahun && row.tahun && String(row.tahun) !== tahun) continue
    peta.set(String(row.kode_akun || ''), Number(row.nominal) || 0)
  }
  return peta
}

export async function susunLaporanKeuangan(unitMentah?: string, periode = '') {
  const unit = kanonUnitKeuangan(unitMentah)
  const [transaksi, akun, anggaran] = await Promise.all([
    muatTransaksiKas(STATUS_DISETUJUI, unit || undefined),
    muatDaftarAkun().catch(() => [] as BarisAkun[]),
    muatAnggaran(unit, periode.slice(0, 4)),
  ])
  const aktif = periode
    ? transaksi.filter((item) => dalamPeriode(item.tanggal, periode) || dalamPeriode(item.created_at || '', periode))
    : transaksi
  const namaAkun = (kode: string) => akun.find((item) => item.kode_akun === kode)?.nama_akun || kode
  const kategoriAkun = (kode: string) => akun.find((item) => item.kode_akun === kode)?.kategori

  const kas = KODE_AKUN_KAS.map((kode) => {
    const masuk = aktif
      .filter((item) => item.jenis_transaksi === 'Penerimaan' && item.akun_kas_bank === kode)
      .reduce((jumlah, item) => jumlah + item.nominal, 0)
    const keluar = aktif
      .filter((item) => item.jenis_transaksi === 'Pengeluaran' && item.akun_kas_bank === kode)
      .reduce((jumlah, item) => jumlah + item.nominal, 0)
    return { kode, nama: namaAkun(kode), masuk, keluar, neto: masuk - keluar }
  })

  const pos = new Map<string, PosLaporan>()
  const tambah = (kode: string, jenis: 'masuk' | 'keluar', nominal: number) => {
    const ada = pos.get(kode) || {
      kode_akun: kode,
      nama_akun: namaAkun(kode),
      masuk: 0,
      keluar: 0,
      realisasi: 0,
      anggaran: anggaran.get(kode) || 0,
    }
    if (jenis === 'masuk') ada.masuk += nominal
    else ada.keluar += nominal
    ada.realisasi = ada.masuk || ada.keluar
    pos.set(kode, ada)
  }
  for (const bukti of aktif) {
    for (const item of bukti.items.length ? bukti.items : [{ kode_akun: bukti.kode_akun, nominal: bukti.nominal }]) {
      if (bukti.jenis_transaksi === 'Penerimaan') tambah(item.kode_akun, 'masuk', item.nominal)
      else tambah(item.kode_akun, 'keluar', item.nominal)
    }
  }

  const semua = [...pos.values()]
  const pendapatan = semua.filter((item) => kelompokAkun(item.kode_akun, kategoriAkun(item.kode_akun)) === 'pendapatan')
  const belanja = semua.filter((item) => kelompokAkun(item.kode_akun, kategoriAkun(item.kode_akun)) === 'belanja')
  const labelPeriode = namaBulan(periode) || 'Semua periode'

  const arus: ArusKas = {
    unit: unit || 'Semua Unit',
    periode: labelPeriode,
    kas,
    totalMasuk: kas.reduce((jumlah, item) => jumlah + item.masuk, 0),
    totalKeluar: kas.reduce((jumlah, item) => jumlah + item.keluar, 0),
    neto: kas.reduce((jumlah, item) => jumlah + item.neto, 0),
  }
  const realisasi: RealisasiAnggaran = {
    unit: unit || 'Semua Unit',
    periode: labelPeriode,
    pendapatan,
    belanja,
    totalPendapatan: pendapatan.reduce((jumlah, item) => jumlah + item.masuk, 0),
    totalBelanja: belanja.reduce((jumlah, item) => jumlah + item.keluar, 0),
    totalAnggaranPendapatan: pendapatan.reduce((jumlah, item) => jumlah + item.anggaran, 0),
    totalAnggaranBelanja: belanja.reduce((jumlah, item) => jumlah + item.anggaran, 0),
  }
  const neraca: NeracaKas = {
    unit: unit || 'Semua Unit',
    periode: labelPeriode,
    aset: kas.map((item) => ({ kode: item.kode, nama: item.nama, saldo: item.neto })),
    totalAset: kas.reduce((jumlah, item) => jumlah + item.neto, 0),
  }
  return { arus, realisasi, neraca, transaksi: aktif as TransaksiKas[] }
}
