'use client'

import { useEffect, useMemo, useState } from 'react'
import { Printer, Search, X } from 'lucide-react'
import { formatDurasiMenit, formatTanggalID, nowJakarta } from '@/lib/guru-bantu/utils'
import {
  muatRekapBulananGuruBantuKepsek,
  type BarisRekapBulananGuruBantu,
  type RekapBulananGuruBantuKepsek,
  type SelHariGuruBantu,
} from '@/lib/kepsek-guru-bantu'

const HARI_SINGKAT = ['Ah', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb']

function kelasSel(sel: SelHariGuruBantu) {
  if (sel.kategori === 'hadir') return 'bg-emerald-50 text-emerald-800'
  if (sel.kategori === 'terlambat') return 'bg-amber-50 text-amber-900'
  if (sel.kategori === 'izin') return 'bg-sky-50 text-sky-800'
  if (sel.kategori === 'sakit') return 'bg-orange-50 text-orange-900'
  if (sel.kategori === 'alpa') return 'bg-rose-50 text-rose-800'
  if (sel.libur || sel.kategori === 'libur') return 'bg-rose-50/70 text-slate-400'
  return 'text-slate-400'
}

function isiSel(sel: SelHariGuruBantu, batasMasuk: string) {
  if (!sel.tanggal || sel.kategori === 'kosong') return { atas: '', bawah: '' }
  if (sel.kategori === 'libur' && !sel.jam_masuk && !sel.status) return { atas: '', bawah: '' }
  if (sel.kategori === 'belum') return { atas: '', bawah: '' }
  if (sel.kategori === 'hadir') return { atas: batasMasuk, bawah: sel.jam_masuk || 'Hadir' }
  if (sel.kategori === 'terlambat') {
    return {
      atas: sel.jam_masuk || 'Terlambat',
      bawah: sel.menitTerlambat > 0 ? `+${sel.menitTerlambat} mnt` : 'Terlambat',
    }
  }
  if (sel.kategori === 'izin') return { atas: 'Izin', bawah: sel.status !== 'Izin' ? sel.status : '' }
  if (sel.kategori === 'sakit') return { atas: 'Sakit', bawah: sel.status !== 'Sakit' ? sel.status : '' }
  if (sel.kategori === 'alpa') return { atas: 'TK', bawah: '' }
  return { atas: sel.jam_masuk || '', bawah: sel.status }
}

function judulSel(sel: SelHariGuruBantu) {
  if (!sel.tanggal) return 'Tanggal tidak ada di bulan ini'
  const jam = sel.jam_masuk ? `Jam masuk ${sel.jam_masuk}` : sel.status || 'Tidak ada data'
  const catatan = sel.catatan ? ` · ${sel.catatan}` : ''
  return `${formatTanggalID(sel.tanggal)} · ${jam}${catatan}`
}

export function RekapMatriksGuruBantu({
  rekap,
  loading,
  unit = '',
}: {
  rekap: RekapBulananGuruBantuKepsek | null
  loading?: boolean
  unit?: string
}) {
  const [cari, setCari] = useState('')
  const [detail, setDetail] = useState<BarisRekapBulananGuruBantu | null>(null)

  const baris = useMemo(() => {
    const daftar = rekap?.baris || []
    const q = cari.trim().toLowerCase()
    if (!q) return daftar
    return daftar.filter((row) => row.nama.toLowerCase().includes(q) || row.id_induk.toLowerCase().includes(q))
  }, [rekap, cari])

  const hari = Array.from({ length: 31 }, (_, i) => i + 1)
  const [tahun, bulanAngka] = (rekap?.bulan || '').split('-').map(Number)

  if (loading) {
    return <p className="py-8 text-center text-sm text-slate-500">Menyusun rekap matriks bulanan…</p>
  }

  if (!rekap || rekap.baris.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Belum ada akun guru bantu di unit ini.
      </p>
    )
  }

  return (
    <div className="rekap-gb space-y-3">
      <style>{`
        .rekap-gb-table { border-collapse: collapse; width: max-content; min-width: 100%; font-variant-numeric: tabular-nums; }
        .rekap-gb-table th, .rekap-gb-table td { border: 1px solid #cbd5e1; padding: 3px 2px; text-align: center; }
        .rekap-gb-table .nama-col { min-width: 11rem; padding-left: 8px; padding-right: 8px; text-align: left; }
        @media print {
          header, .no-print, .absensi-chrome { display: none !important; }
          body { background: #fff !important; }
          .rekap-gb-scroll { overflow: visible !important; }
          .rekap-gb-table { width: 100% !important; font-size: 6.5pt; }
          .rekap-gb-table .nama-col { width: 32mm; min-width: 0 !important; position: static !important; }
          .sel-libur { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold tracking-wide text-slate-500">
            SD ISLAM TERPADU AL MADINAH{unit ? ` · UNIT ${unit.toUpperCase()}` : ''}
          </p>
          <h3 className="text-base font-black text-slate-900">Rekap Absensi Guru Bantu Bulanan</h3>
          <p className="text-[11px] text-slate-600">
            {rekap.labelBulan} · {rekap.baris.length} guru · {rekap.hariKerja} hari kerja · batas masuk {rekap.batasMasuk}
          </p>
        </div>
        <div className="no-print flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
            <input
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Cari nama guru"
              className="rounded-lg border border-slate-300 py-2 pl-8 pr-3 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-bold text-white"
          >
            <Printer className="size-3.5" /> Cetak
          </button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
          {rekap.total.hadir} <span className="font-normal">hadir tepat waktu</span>
        </p>
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm font-bold text-amber-900">
          {rekap.total.terlambat} <span className="font-normal">keterlambatan</span>
        </p>
        <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">
          {rekap.total.izin} <span className="font-normal">izin</span>
        </p>
        <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900">
          {rekap.total.sakit} <span className="font-normal">sakit</span>
        </p>
        <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">
          {rekap.total.alpa} <span className="font-normal">tanpa keterangan</span>
        </p>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        Setiap sel: jam masuk atau status. Terlambat menampilkan menit keterlambatan dibanding {rekap.batasMasuk}.
        TK = Tanpa Keterangan. Kolom Jumat &amp; Ahad ditandai libur. Ketuk nama guru untuk rincian harian.
      </p>

      <div className="rekap-gb-scroll overflow-x-auto rounded-xl border border-slate-200">
        <table className="rekap-gb-table text-[10px] text-slate-700">
          <caption className="sr-only">
            Rekap absensi guru bantu bulan {rekap.labelBulan}
          </caption>
          <thead>
            <tr className="bg-[#143d32] font-bold text-white">
              <th className="col-no w-8">No</th>
              <th className="nama-col sticky left-0 z-20 bg-[#143d32]">Nama Karyawan</th>
              {hari.map((tanggal) => {
                const valid = tanggal <= rekap.jumlahHari
                const libur = valid && tahun && bulanAngka ? !isHariKerjaLokal(tahun, bulanAngka, tanggal) : false
                return (
                  <th
                    key={tanggal}
                    className={`min-w-[2.4rem] ${libur ? 'sel-libur bg-[#1f5c4c]' : ''} ${!valid ? 'bg-[#0f2e26] text-white/40' : ''}`}
                  >
                    {String(tanggal).padStart(2, '0')}
                  </th>
                )
              })}
              <th title="Hadir tepat waktu">H</th>
              <th title="Jumlah keterlambatan">T</th>
              <th title="Izin">I</th>
              <th title="Sakit">S</th>
              <th title="Tanpa Keterangan">TK</th>
            </tr>
            <tr className="bg-[#1a4f42] font-semibold text-white/80">
              <th />
              <th className="nama-col sticky left-0 z-20 bg-[#1a4f42]" />
              {hari.map((tanggal) => {
                const valid = tanggal <= rekap.jumlahHari && tahun && bulanAngka
                const indeks = valid ? new Date(tahun, bulanAngka - 1, tanggal).getDay() : -1
                const libur = indeks === 0 || indeks === 5
                return (
                  <th key={`hari-${tanggal}`} className={libur ? 'sel-libur bg-[#1f5c4c]' : ''}>
                    {indeks >= 0 ? HARI_SINGKAT[indeks] : ''}
                  </th>
                )
              })}
              <th />
              <th />
              <th />
              <th />
              <th />
            </tr>
          </thead>
          <tbody>
            {baris.map((item, index) => {
              const latar = index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
              return (
                <tr key={item.id_induk} className={latar}>
                  <td>{index + 1}</td>
                  <td className={`nama-col sticky left-0 z-10 ${latar}`}>
                    <button
                      type="button"
                      onClick={() => setDetail(item)}
                      className="text-left font-semibold text-emerald-900 underline decoration-dotted underline-offset-2"
                    >
                      {item.nama}
                    </button>
                  </td>
                  {item.sel.map((sel) => {
                    const isi = isiSel(sel, rekap.batasMasuk)
                    return (
                      <td
                        key={`${item.id_induk}-${sel.hari}`}
                        title={judulSel(sel)}
                        className={`leading-tight ${kelasSel(sel)}`}
                      >
                        {isi.atas ? <div className="font-bold">{isi.atas}</div> : null}
                        {isi.bawah ? <div className="text-[9px] opacity-80">{isi.bawah}</div> : !isi.atas ? '—' : null}
                      </td>
                    )
                  })}
                  <td className="font-bold text-emerald-800">{item.hadir}</td>
                  <td className="font-bold text-amber-800" title={item.menitTerlambat ? `Total ${formatDurasiMenit(item.menitTerlambat)}` : undefined}>
                    {item.terlambat}
                  </td>
                  <td className="font-bold text-sky-800">{item.izin}</td>
                  <td className="font-bold text-orange-800">{item.sakit}</td>
                  <td className="font-bold text-rose-800">{item.alpa}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-100 font-bold text-slate-800">
              <td />
              <td className="nama-col sticky left-0 z-10 bg-slate-100">Jumlah</td>
              {hari.map((tanggal) => (
                <td key={`jumlah-${tanggal}`} />
              ))}
              <td className="text-emerald-800">{rekap.total.hadir}</td>
              <td className="text-amber-800">{rekap.total.terlambat}</td>
              <td className="text-sky-800">{rekap.total.izin}</td>
              <td className="text-orange-800">{rekap.total.sakit}</td>
              <td className="text-rose-800">{rekap.total.alpa}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      <TabelCatatanKeterlambatan rekap={rekap} />

      {detail ? <ModalDetailGuru row={detail} bulan={rekap.labelBulan} unit={unit} onTutup={() => setDetail(null)} /> : null}
    </div>
  )
}

function labelHariTerlambat(iso: string, menit: number) {
  const [tahun, bulan, hari] = iso.split('-').map(Number)
  if (!tahun || !bulan || !hari) return iso
  const nama = new Intl.DateTimeFormat('id-ID', { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(tahun, bulan - 1, hari)))
    .replace('.', '')
  return `${String(hari).padStart(2, '0')} ${nama} (+${menit} mnt)`
}

function TabelCatatanKeterlambatan({ rekap }: { rekap: RekapBulananGuruBantuKepsek }) {
  const baris = rekap.baris
    .filter((row) => row.terlambat > 0)
    .map((row) => ({
      ...row,
      rincian: row.sel
        .filter((sel) => sel.kategori === 'terlambat' && sel.tanggal)
        .map((sel) => labelHariTerlambat(sel.tanggal || '', sel.menitTerlambat)),
    }))
    .sort((a, b) => b.terlambat - a.terlambat || b.menitTerlambat - a.menitTerlambat || a.nama.localeCompare(b.nama, 'id'))

  return (
    <section className="space-y-2">
      <div>
        <h4 className="text-sm font-black text-slate-900">Rekap Catatan Keterlambatan</h4>
        <p className="text-[11px] text-slate-500">
          {rekap.labelBulan}. Hanya guru yang tercatat terlambat. Batas masuk {rekap.batasMasuk}.
        </p>
      </div>
      {baris.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-3 text-sm text-slate-500">
          Tidak ada catatan keterlambatan pada bulan ini.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-amber-200">
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead className="bg-amber-50 font-bold text-amber-950">
              <tr>
                <th className="border-b border-amber-200 p-2">No</th>
                <th className="border-b border-amber-200 p-2">Nama Guru</th>
                <th className="border-b border-amber-200 p-2 text-right">Jumlah Hari Terlambat</th>
                <th className="border-b border-amber-200 p-2 text-right">Total Akumulasi Menit Terlambat</th>
                <th className="border-b border-amber-200 p-2">Rincian Tanggal Terlambat</th>
              </tr>
            </thead>
            <tbody>
              {baris.map((row, index) => (
                <tr key={row.id_induk} className="align-top">
                  <td className="border-b border-amber-100 p-2 text-slate-500">{index + 1}</td>
                  <td className="border-b border-amber-100 p-2 font-bold text-slate-900">{row.nama}</td>
                  <td className="border-b border-amber-100 p-2 text-right font-bold tabular-nums text-amber-900">{row.terlambat}</td>
                  <td className="border-b border-amber-100 p-2 text-right font-semibold tabular-nums text-amber-900">
                    {row.menitTerlambat} menit
                    {row.menitTerlambat >= 60 ? ` (${formatDurasiMenit(row.menitTerlambat)})` : ''}
                  </td>
                  <td className="border-b border-amber-100 p-2 leading-5 text-slate-700">{row.rincian.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function PanelRekapAbsensiGuruBantu({
  unit = '',
  bulanAwal,
}: {
  unit?: string
  bulanAwal?: string
}) {
  const hariIni = nowJakarta().tanggal
  const [bulan, setBulan] = useState(bulanAwal || hariIni.slice(0, 7))
  const [rekap, setRekap] = useState<RekapBulananGuruBantuKepsek | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!unit) {
      setRekap(null)
      setError('Unit akun belum terbaca dari tabel users.')
      setLoading(false)
      return
    }
    let batal = false
    setLoading(true)
    muatRekapBulananGuruBantuKepsek(bulan, unit)
      .then((hasil) => {
        if (!batal) {
          setRekap(hasil)
          setError('')
        }
      })
      .catch((e: Error) => {
        if (!batal) setError(e.message || 'Rekap bulanan belum dapat dimuat.')
      })
      .finally(() => {
        if (!batal) setLoading(false)
      })
    return () => {
      batal = true
    }
  }, [bulan, unit])

  return (
    <div className="space-y-4">
      <label className="no-print block text-xs font-bold text-slate-600">
        Bulan rekap
        <input
          type="month"
          value={bulan}
          max={hariIni.slice(0, 7)}
          onChange={(e) => setBulan(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
        />
      </label>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>
      ) : null}
      <RekapMatriksGuruBantu rekap={rekap} loading={loading} unit={unit} />
    </div>
  )
}

function isHariKerjaLokal(tahun: number, bulan: number, hari: number) {
  const indeks = new Date(tahun, bulan - 1, hari).getDay()
  return indeks !== 0 && indeks !== 5
}

function ModalDetailGuru({
  row,
  bulan,
  unit,
  onTutup,
}: {
  row: BarisRekapBulananGuruBantu
  bulan: string
  unit: string
  onTutup: () => void
}) {
  const isi = row.sel.filter((sel) => sel.tanggal && sel.kategori !== 'kosong' && sel.kategori !== 'libur' && sel.kategori !== 'belum')

  return (
    <div className="no-print fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 p-4" onClick={onTutup}>
      <div
        className="flex max-h-[88vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="judul-detail-absen-gb"
      >
        <div className="flex items-start justify-between gap-3 bg-[#143d32] px-5 py-4 text-white">
          <div>
            <p id="judul-detail-absen-gb" className="text-xs font-bold uppercase tracking-wide text-white/70">
              Detail absensi
            </p>
            <p className="text-lg font-black">{row.nama}</p>
            <p className="text-xs text-white/80">
              {row.role || 'Guru Bantu'} · {unit} · {bulan}
            </p>
          </div>
          <button type="button" onClick={onTutup} className="rounded-lg p-1 text-white/80 hover:bg-white/10" aria-label="Tutup">
            <X className="size-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 px-5 py-3 sm:grid-cols-5">
          <p className="rounded-lg bg-emerald-50 px-2 py-1.5 text-center text-xs font-bold text-emerald-900">H {row.hadir}</p>
          <p className="rounded-lg bg-amber-50 px-2 py-1.5 text-center text-xs font-bold text-amber-900">
            T {row.terlambat}
            {row.menitTerlambat ? ` · ${formatDurasiMenit(row.menitTerlambat)}` : ''}
          </p>
          <p className="rounded-lg bg-sky-50 px-2 py-1.5 text-center text-xs font-bold text-sky-900">I {row.izin}</p>
          <p className="rounded-lg bg-orange-50 px-2 py-1.5 text-center text-xs font-bold text-orange-900">S {row.sakit}</p>
          <p className="rounded-lg bg-rose-50 px-2 py-1.5 text-center text-xs font-bold text-rose-900">TK {row.alpa}</p>
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-5 pb-5">
          <table className="w-full text-left text-xs">
            <thead className="sticky top-0 bg-slate-50 font-bold text-slate-600">
              <tr>
                <th className="p-2">No</th>
                <th className="p-2">Tanggal</th>
                <th className="p-2">Masuk</th>
                <th className="p-2">Pulang</th>
                <th className="p-2">Status / keterlambatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isi.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-4 text-center text-slate-500">
                    Belum ada catatan absensi pada bulan ini.
                  </td>
                </tr>
              ) : (
                isi.map((sel, index) => (
                  <tr key={sel.tanggal}>
                    <td className="p-2 text-slate-500">{index + 1}</td>
                    <td className="p-2 font-semibold">{sel.tanggal ? formatTanggalID(sel.tanggal) : '—'}</td>
                    <td className="p-2 tabular-nums">{sel.jam_masuk || '—'}</td>
                    <td className="p-2 tabular-nums">{sel.jam_pulang || '—'}</td>
                    <td className="p-2">
                      <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelasSel(sel)}`}>{sel.status}</span>
                      {sel.catatan && sel.catatan !== sel.status ? (
                        <span className="ml-2 text-amber-800">{sel.catatan}</span>
                      ) : null}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
