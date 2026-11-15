import { akunCocokKodeTagihan, angkaIdentitas, muatPembayaranKasTerverifikasi, type PembayaranKas } from '@/lib/kasir'
import { jumlahkanPos, jenisItem } from '@/lib/ampss-urai'
import type { DetailTunggakan, RekapKeuangan, RincianTagihan, SiswaTunggakan } from '@/lib/keuangan-tipe'

function identitasCocok(kandidat: string | null | undefined, nis: string) {
  const a = angkaIdentitas(kandidat)
  const b = angkaIdentitas(nis)
  if (a.length < 3 || b.length < 3) return false
  return a === b || b.endsWith(a) || a.endsWith(b)
}

export function pembayaranCocokSiswa(bayar: PembayaranKas, nis: string) {
  return identitasCocok(bayar.nis, nis) || identitasCocok(bayar.id_siswa, nis)
}

function alokasikanKeRincian(rincian: RincianTagihan[], bayar: PembayaranKas): RincianTagihan[] {
  let sisa = Number(bayar.nominal) || 0
  if (sisa <= 0) return rincian
  const hasil = rincian.map((item) => ({ ...item }))
  const urutan: number[] = []
  const kodeSasar = String(bayar.kode_tagihan || '').trim().toUpperCase()
  const tapelSasar = String(bayar.tapel_tagihan || '').trim()
  if (kodeSasar) {
    hasil.forEach((item, indeks) => {
      if (item.jumlah <= 0) return
      if (item.kode.toUpperCase() !== kodeSasar) return
      if (tapelSasar && item.tapel !== tapelSasar) return
      urutan.push(indeks)
    })
  }
  hasil.forEach((item, indeks) => {
    if (urutan.includes(indeks) || item.jumlah <= 0) return
    if (akunCocokKodeTagihan(bayar.kode_akun, item.kode)) urutan.push(indeks)
  })
  for (const indeks of urutan) {
    if (sisa <= 0) break
    const item = hasil[indeks]
    const potong = Math.min(item.jumlah, sisa)
    item.jumlah -= potong
    item.terbayar = (item.terbayar || 0) + potong
    sisa -= potong
  }
  return hasil.filter((item) => item.jumlah > 0)
}

export function terapkanPembayaranKeDetail(detail: DetailTunggakan, daftar: PembayaranKas[]): DetailTunggakan {
  const milik = daftar.filter((item) => pembayaranCocokSiswa(item, detail.nis))
  let rincian = detail.rincian.map((item) => ({ ...item }))
  for (const bayar of milik) rincian = alokasikanKeRincian(rincian, bayar)
  const tunggakan = rincian.reduce((jumlah, item) => jumlah + item.jumlah, 0)
  return {
    ...detail,
    rincian,
    tunggakan,
    status: tunggakan > 0 ? 'Menunggak' : 'Lunas',
  }
}

function overlaySiswaDanRincian(
  siswa: SiswaTunggakan[],
  rincian: Map<string, RincianTagihan[]>,
  daftar: PembayaranKas[],
) {
  const rincianBaru = new Map<string, RincianTagihan[]>()
  const siswaBaru = siswa.map((baris) => {
    const detail = terapkanPembayaranKeDetail(
      {
        nis: baris.nis,
        nama: baris.nama,
        kelas: baris.kelas,
        tunggakan: baris.tunggakan,
        status: baris.status,
        rincian: rincian.get(baris.nis) || [],
      },
      daftar,
    )
    rincianBaru.set(baris.nis, detail.rincian)
    return {
      ...baris,
      tunggakan: detail.tunggakan,
      status: detail.status,
      jumlahTagihan: detail.rincian.length,
    }
  })
  return { siswa: siswaBaru, rincian: rincianBaru }
}

export async function overlayRekapKeuangan(rekap: RekapKeuangan, rincian: Map<string, RincianTagihan[]>): Promise<RekapKeuangan> {
  const daftar = await muatPembayaranKasTerverifikasi().catch(() => [] as PembayaranKas[])
  if (daftar.length === 0) return rekap
  const overlay = overlaySiswaDanRincian(rekap.siswa, rincian, daftar)
  const siswaAktif = overlay.siswa.filter((baris) => baris.aktif)
  const menunggak = overlay.siswa.filter((baris) => baris.status === 'Menunggak')
  const sisaTagihan: [string, number][] = []
  for (const daftarTagihan of overlay.rincian.values()) {
    for (const item of daftarTagihan) {
      sisaTagihan.push([jenisItem(item.kode, item.item), item.jumlah])
    }
  }
  return {
    ...rekap,
    siswa: overlay.siswa,
    piutang: menunggak.reduce((jumlah, baris) => jumlah + baris.tunggakan, 0),
    siswaLunas: siswaAktif.filter((baris) => baris.status === 'Lunas').length,
    siswaMenunggak: menunggak.length,
    diLuarRombel: menunggak.filter((baris) => !baris.aktif).length,
    piutangPerJenis: jumlahkanPos(sisaTagihan),
    perKelas: rekapKelasLokal(overlay.siswa),
    rekapan: rekap.rekapan.map((baris) => {
      const sisa = overlay.rincian.get(baris.nis)?.find((item) => item.kode === baris.kode && item.tapel === baris.tapel)
      if (baris.status === 'Belum' && !sisa) return { ...baris, status: 'Lunas' as const, nominal: 0 }
      if (sisa) return { ...baris, nominal: sisa.jumlah, status: sisa.jumlah > 0 ? ('Belum' as const) : ('Lunas' as const) }
      return baris
    }),
  }
}

export async function overlayDetailTunggakan(detail: DetailTunggakan): Promise<DetailTunggakan> {
  const daftar = await muatPembayaranKasTerverifikasi().catch(() => [] as PembayaranKas[])
  if (daftar.length === 0) return detail
  return terapkanPembayaranKeDetail(detail, daftar)
}

export async function overlayDaftarTunggakan(daftar: DetailTunggakan[]): Promise<DetailTunggakan[]> {
  const bayar = await muatPembayaranKasTerverifikasi().catch(() => [] as PembayaranKas[])
  if (bayar.length === 0) return daftar
  return daftar.map((item) => terapkanPembayaranKeDetail(item, bayar))
}

function rekapKelasLokal(siswa: SiswaTunggakan[]) {
  const peta = new Map<string, { kelas: string; siswa: number; menunggak: number; lunas: number; piutang: number }>()
  for (const baris of siswa) {
    if (!baris.aktif) continue
    const kini = peta.get(baris.kelas) || { kelas: baris.kelas, siswa: 0, menunggak: 0, lunas: 0, piutang: 0 }
    kini.siswa += 1
    kini.piutang += baris.tunggakan
    if (baris.status === 'Menunggak') kini.menunggak += 1
    else kini.lunas += 1
    peta.set(baris.kelas, kini)
  }
  return [...peta.values()].sort((a, b) => b.piutang - a.piutang || a.kelas.localeCompare(b.kelas, 'id', { numeric: true }))
}
