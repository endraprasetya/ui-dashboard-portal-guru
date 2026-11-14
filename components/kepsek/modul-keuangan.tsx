'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { Banknote, ChevronRight, Printer, RefreshCw, Search, Users, Wallet } from 'lucide-react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import { KartuRekapanTagihan } from '@/components/kepsek/rekapan-tagihan'
import { SuratTunggakan } from '@/components/kepsek/surat-tunggakan'
import { labelTapel } from '@/lib/ampss-urai'
import type { DetailTunggakan, RekapKeuangan, SiswaTunggakan, StatusBayar } from '@/lib/keuangan-tipe'

const UKURAN_HALAMAN = 20

type PanelRingkas = 'piutang' | 'masuk' | 'menunggak' | 'lunas'

const kelasKartu =
  'cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

function rupiah(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai)
}

function waktuLokal(iso: string) {
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return ''
  return tanggal.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function LencanaStatus({ status }: { status: StatusBayar }) {
  const kelas = status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}>{status}</span>
}

export function ModulKeuangan() {
  const [data, setData] = useState<RekapKeuangan | null>(null)
  const [galat, setGalat] = useState('')
  const [memuat, setMemuat] = useState(true)
  const [cari, setCari] = useState('')
  const [kelas, setKelas] = useState('semua')
  const [status, setStatus] = useState<'semua' | StatusBayar>('Menunggak')
  const [halaman, setHalaman] = useState(0)
  const [detail, setDetail] = useState<DetailTunggakan | null>(null)
  const [detailMuat, setDetailMuat] = useState(false)
  const [detailGalat, setDetailGalat] = useState('')
  const [panel, setPanel] = useState<PanelRingkas | null>(null)
  const [surat, setSurat] = useState<SiswaTunggakan | null>(null)
  const permintaanDetail = useRef(0)

  const muat = (segar = false) => {
    setMemuat(true)
    setGalat('')
    fetch(segar ? '/api/kepsek/keuangan?segar=1' : '/api/kepsek/keuangan')
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Data keuangan belum dapat dimuat.')
        setData(json as RekapKeuangan)
      })
      .catch((error: Error) => setGalat(error.message || 'Data keuangan belum dapat dimuat.'))
      .finally(() => setMemuat(false))
  }

  useEffect(() => {
    muat(false)
  }, [])

  const kelasPilihan = useMemo(() => {
    const daftar = new Set((data?.siswa || []).map((baris) => baris.kelas))
    return [...daftar].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
  }, [data])

  const tersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return (data?.siswa || []).filter((baris) => {
      if (status === 'Lunas' && !baris.aktif) return false
      if (status !== 'semua' && baris.status !== status) return false
      if (kelas !== 'semua' && baris.kelas !== kelas) return false
      if (!kata) return true
      return baris.nama.toLowerCase().includes(kata) || baris.nis.includes(kata)
    })
  }, [data, cari, kelas, status])

  const halamanMaks = Math.max(0, Math.ceil(tersaring.length / UKURAN_HALAMAN) - 1)
  const halamanAman = Math.min(halaman, halamanMaks)
  const tampil = tersaring.slice(halamanAman * UKURAN_HALAMAN, halamanAman * UKURAN_HALAMAN + UKURAN_HALAMAN)

  const bukaPanel = (berikutnya: PanelRingkas) => {
    setCari('')
    setKelas('semua')
    setHalaman(0)
    setStatus(berikutnya === 'lunas' ? 'Lunas' : 'Menunggak')
    setPanel(berikutnya)
  }

  const bukaDetail = (nis: string) => {
    const tiket = ++permintaanDetail.current
    setDetail(null)
    setDetailGalat('')
    setDetailMuat(true)
    fetch(`/api/kepsek/keuangan/${nis}`)
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Rincian tagihan belum dapat dimuat.')
        if (permintaanDetail.current === tiket) setDetail(json as DetailTunggakan)
      })
      .catch((error: Error) => {
        if (permintaanDetail.current === tiket) setDetailGalat(error.message || 'Rincian tagihan belum dapat dimuat.')
      })
      .finally(() => {
        if (permintaanDetail.current === tiket) setDetailMuat(false)
      })
  }

  return (
    <>
    <section id="keuangan-tunggakan" className="no-print space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-emerald-900">
            <Wallet className="size-4" />
            <h2 className="text-sm font-extrabold">Keuangan & rekap tunggakan</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            {data
              ? `${data.sekolah} · tahun pelajaran ${data.tapel} · tunggakan ${data.periodeTagihan} · diperbarui ${waktuLokal(data.diambilPada)}`
              : 'Sumber data admin AMPSS'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => muat(true)}
          disabled={memuat}
          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`size-3.5 ${memuat ? 'animate-spin' : ''}`} /> Muat ulang
        </button>
      </div>

      {galat && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{galat}</p>}
      {memuat && !data && <p className="text-sm text-slate-500">Mengambil tagihan dan penerimaan dari AMPSS...</p>}

      {data && (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <button type="button" onClick={() => bukaPanel('piutang')} className={`${kelasKartu} border-amber-200 bg-amber-50`}>
            <span className="flex items-center justify-between gap-2 text-amber-900">
              <span className="text-xs font-extrabold uppercase">Dana belum masuk</span>
              <ChevronRight className="size-4 text-amber-700/70" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{rupiah(data.piutang)}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Piutang yang sudah jatuh tempo sampai bulan berjalan.</span>
          </button>
          <button type="button" onClick={() => bukaPanel('masuk')} className={`${kelasKartu} border-emerald-200 bg-emerald-50`}>
            <span className="flex items-center justify-between gap-2 text-emerald-900">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
                <Banknote className="size-3.5" /> Dana masuk hari ini
              </span>
              <ChevronRight className="size-4 text-emerald-700/70" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{rupiah(data.penerimaanHariIni)}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Total penerimaan unit pada laporan bank AMPSS.</span>
          </button>
          <button type="button" onClick={() => bukaPanel('menunggak')} className={`${kelasKartu} border-slate-200 bg-white`}>
            <span className="flex items-center justify-between gap-2 text-amber-800">
              <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
                <Users className="size-3.5" /> Siswa menunggak
              </span>
              <ChevronRight className="size-4 text-slate-400" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{data.siswaMenunggak}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Siswa dengan tagihan jatuh tempo yang masih terbuka.</span>
          </button>
          <button type="button" onClick={() => bukaPanel('lunas')} className={`${kelasKartu} border-slate-200 bg-white`}>
            <span className="flex items-center justify-between gap-2 text-emerald-800">
              <span className="text-xs font-extrabold uppercase">Siswa lunas</span>
              <ChevronRight className="size-4 text-slate-400" />
            </span>
            <span className="mt-2 block text-xl font-black text-slate-900">{data.siswaLunas}</span>
            <span className="mt-1 block text-xs font-medium text-slate-600">Siswa rombel aktif tanpa tagihan jatuh tempo.</span>
          </button>
          <KartuRekapanTagihan baris={data.rekapan} periode={data.periodeTagihan} />
        </div>
      )}

      {data && panel && (
        <ModalKerangka
          judul={judulPanel(panel)}
          keterangan={keteranganPanel(panel, data)}
          onTutup={() => setPanel(null)}
          lebar={panel === 'menunggak' || panel === 'lunas' ? 'max-w-5xl' : 'max-w-3xl'}
        >
          {panel === 'piutang' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <PanelPos judul="Piutang per jenis" baris={data.piutangPerJenis} />
                <PanelPos judul="Piutang per tahun pelajaran" baris={data.piutangPerTapel} />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="border-b p-2">Kelas</th>
                      <th className="border-b p-2 text-end">Siswa</th>
                      <th className="border-b p-2 text-end">Lunas</th>
                      <th className="border-b p-2 text-end">Menunggak</th>
                      <th className="border-b p-2 text-end">Piutang</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.perKelas.map((baris) => (
                      <tr key={baris.kelas}>
                        <td className="border-b p-2 font-bold">{baris.kelas}</td>
                        <td className="border-b p-2 text-end">{baris.siswa}</td>
                        <td className="border-b p-2 text-end">{baris.lunas}</td>
                        <td className="border-b p-2 text-end">{baris.menunggak}</td>
                        <td className="border-b p-2 text-end font-bold">{rupiah(baris.piutang)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {panel === 'masuk' && (
            <PanelPos judul="Penerimaan bank hari ini per jenis" baris={data.penerimaanPerItem} kosong="Belum ada penerimaan pada laporan bank hari ini." />
          )}
          {(panel === 'menunggak' || panel === 'lunas') && (
            <DaftarSiswa
              cari={cari}
              kelas={kelas}
              kelasPilihan={kelasPilihan}
              halamanAman={halamanAman}
              halamanMaks={halamanMaks}
              jumlah={tersaring.length}
              tampil={tampil}
              onCari={(nilai) => {
                setCari(nilai)
                setHalaman(0)
              }}
              onKelas={(nilai) => {
                setKelas(nilai)
                setHalaman(0)
              }}
              onHalaman={(arah) => setHalaman((nilai) => Math.max(0, Math.min(halamanMaks, nilai + arah)))}
              onRincian={bukaDetail}
              onCetak={panel === 'menunggak' ? setSurat : undefined}
            />
          )}
        </ModalKerangka>
      )}

      {(detail || detailMuat || detailGalat) && (
        <ModalKerangka
          judul={detail ? detail.nama : 'Rincian tunggakan'}
          keterangan={detail ? `NIS ${detail.nis} · Kelas ${detail.kelas} · ${detail.status}` : 'Tagihan yang belum dibayar'}
          onTutup={() => {
            permintaanDetail.current += 1
            setDetail(null)
            setDetailGalat('')
            setDetailMuat(false)
          }}
          lebar="max-w-2xl"
        >
          {detailMuat && <p className="text-sm text-slate-500">Menyiapkan rincian tagihan...</p>}
          {detailGalat && <p className="text-sm text-red-700">{detailGalat}</p>}
          {detail && (
            <>
              {detail.rincian.length === 0 ? (
                <p className="text-sm text-slate-600">Tidak ada tagihan yang belum dibayar.</p>
              ) : (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 text-slate-600">
                      <th className="border-b p-2">Tahun</th>
                      <th className="border-b p-2">Tagihan</th>
                      <th className="border-b p-2 text-end">Jumlah</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.rincian.map((item, indeks) => (
                      <tr key={`${item.tapel}-${item.kode}-${item.jumlah}-${indeks}`}>
                        <td className="border-b p-2">{labelTapel(item.tapel)}</td>
                        <td className="border-b p-2">
                          <p>{item.item}</p>
                          {item.tagihanAwal != null && item.terbayar != null && (
                            <p className="text-[11px] font-medium text-slate-500">
                              Tagihan {rupiah(item.tagihanAwal)} · terbayar {rupiah(item.terbayar)}
                            </p>
                          )}
                        </td>
                        <td className="border-b p-2 text-end font-bold">{rupiah(item.jumlah)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td colSpan={2} className="p-2 font-extrabold">Total tunggakan</td>
                      <td className="p-2 text-end font-extrabold text-amber-900">{rupiah(detail.tunggakan)}</td>
                    </tr>
                  </tfoot>
                </table>
              )}
            </>
          )}
        </ModalKerangka>
      )}
    </section>
    {surat && <SuratTunggakan siswa={surat} onTutup={() => setSurat(null)} />}
    </>
  )
}

function judulPanel(panel: PanelRingkas) {
  if (panel === 'piutang') return 'Dana belum masuk'
  if (panel === 'masuk') return 'Dana masuk hari ini'
  if (panel === 'menunggak') return 'Siswa menunggak'
  return 'Siswa lunas'
}

function keteranganPanel(panel: PanelRingkas, data: RekapKeuangan) {
  if (panel === 'piutang') return `${rupiah(data.piutang)} · tagihan terbuka ${data.sekolah}`
  if (panel === 'masuk') return `${rupiah(data.penerimaanHariIni)} · laporan bank AMPSS`
  if (panel === 'menunggak') return `${data.siswaMenunggak} siswa · ${data.diLuarRombel} di luar rombel ${data.tapel}`
  return `${data.siswaLunas} dari ${data.siswaAktif} siswa rombel aktif`
}

function DaftarSiswa({
  cari,
  kelas,
  kelasPilihan,
  halamanAman,
  halamanMaks,
  jumlah,
  tampil,
  onCari,
  onKelas,
  onHalaman,
  onRincian,
  onCetak,
}: {
  cari: string
  kelas: string
  kelasPilihan: string[]
  halamanAman: number
  halamanMaks: number
  jumlah: number
  tampil: SiswaTunggakan[]
  onCari: (nilai: string) => void
  onKelas: (nilai: string) => void
  onHalaman: (arah: number) => void
  onRincian: (nis: string) => void
  onCetak?: (siswa: SiswaTunggakan) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-2">
        <label className="text-xs font-bold">
          Kelas
          <select value={kelas} onChange={(event) => onKelas(event.target.value)} className="mt-1 block rounded-lg border px-2 py-1.5 font-semibold">
            <option value="semua">Semua kelas</option>
            {kelasPilihan.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </label>
        <label className="min-w-[220px] flex-1 text-xs font-bold">
          Cari siswa
          <span className="relative mt-1 block">
            <Search className="pointer-events-none absolute left-2 top-2 size-3.5 text-slate-400" />
            <input
              value={cari}
              onChange={(event) => onCari(event.target.value)}
              placeholder="Nama atau NIS"
              className="w-full rounded-lg border py-1.5 pl-7 pr-2 font-semibold"
            />
          </span>
        </label>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 text-slate-600">
              <th className="border-b p-2">Siswa</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2 text-end">Tagihan terbuka</th>
              <th className="border-b p-2 text-end">Tunggakan</th>
              <th className="border-b p-2">Status</th>
              <th className="border-b p-2" />
            </tr>
          </thead>
          <tbody>
            {tampil.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-4 text-center text-slate-400">Tidak ada siswa pada saringan ini.</td>
              </tr>
            ) : tampil.map((baris) => (
              <tr key={baris.nis}>
                <td className="border-b p-2">
                  <button type="button" onClick={() => onRincian(baris.nis)} className="text-left font-bold text-emerald-950 underline-offset-2 hover:underline">
                    {baris.nama}
                  </button>
                  <p className="text-[11px] text-slate-500">NIS {baris.nis}{baris.aktif ? '' : ' · di luar rombel aktif'}</p>
                </td>
                <td className="border-b p-2">{baris.kelas}</td>
                <td className="border-b p-2 text-end">{baris.jumlahTagihan}</td>
                <td className="border-b p-2 text-end font-bold">{rupiah(baris.tunggakan)}</td>
                <td className="border-b p-2"><LencanaStatus status={baris.status} /></td>
                <td className="border-b p-2 text-end">
                  <div className="flex flex-wrap justify-end gap-1">
                    {onCetak && (
                      <button
                        type="button"
                        onClick={() => onCetak(baris)}
                        className="inline-flex items-center gap-1 rounded-lg border border-emerald-800 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900 hover:bg-emerald-50"
                      >
                        <Printer className="size-3" /> Cetak Surat
                      </button>
                    )}
                    <button type="button" onClick={() => onRincian(baris.nis)} className="rounded-lg bg-[#143d32] px-3 py-1.5 text-[11px] font-bold text-white">
                      Rincian
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between gap-2 text-xs">
        <p className="text-slate-500">{jumlah} siswa</p>
        <div className="flex items-center gap-2">
          <button type="button" disabled={halamanAman === 0} onClick={() => onHalaman(-1)} className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40">
            Sebelumnya
          </button>
          <span className="font-bold">{halamanAman + 1} / {halamanMaks + 1}</span>
          <button type="button" disabled={halamanAman >= halamanMaks} onClick={() => onHalaman(1)} className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40">
            Berikutnya
          </button>
        </div>
      </div>
    </div>
  )
}

function PanelPos({ judul, baris, kosong = 'Belum ada tagihan terbuka.' }: { judul: string; baris: { nama: string; jumlah: number }[]; kosong?: string }) {
  return (
    <article className="rounded-2xl border border-slate-200 p-3">
      <h3 className="text-xs font-extrabold text-slate-900">{judul}</h3>
      {baris.length === 0 ? (
        <p className="mt-2 text-xs text-slate-400">{kosong}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {baris.map((item) => (
            <li key={item.nama} className="flex items-start justify-between gap-3 text-xs">
              <span className="text-slate-700">{item.nama}</span>
              <span className="shrink-0 font-bold">{rupiah(item.jumlah)}</span>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}
