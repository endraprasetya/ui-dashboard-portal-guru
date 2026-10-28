'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildRekapMatriks, type SimbolHadir } from '@/lib/jurnal'

const TTD_KEY = 'portal-guru-ttd-absensi'
const HARI_SINGKAT = ['Ah', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb']

type TandaTangan = {
  kepsekNama: string
  kepsekNip: string
  guruNama: string
  guruNip: string
  tempat: string
}

function labelBulan(monthValue: string) {
  const [year, month] = monthValue.split('-').map(Number)
  if (!year || !month) return monthValue
  return new Date(year, month - 1, 1).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
}

function formatPersen(value: number | null) {
  if (value == null) return '—'
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}

function garis(value: string) {
  return value.trim() || '................................'
}

function kelasSimbol(simbol: SimbolHadir) {
  if (simbol === '•') return 'font-black text-emerald-700'
  if (simbol === 'S') return 'font-black text-amber-700'
  if (simbol === 'I') return 'font-black text-sky-700'
  if (simbol === 'A') return 'font-black text-red-700'
  return ''
}

function judulSimbol(simbol: SimbolHadir) {
  if (simbol === '•') return 'Hadir'
  if (simbol === 'S') return 'Sakit'
  if (simbol === 'I') return 'Izin'
  if (simbol === 'A') return 'Alpa'
  return 'Tidak ada kegiatan belajar'
}

export function AbsensiMatriks({
  bulan,
  kelas,
  unit,
  siswa,
  rows,
  loading,
  guruNama,
  guruNip,
  kepsekTetap,
}: {
  bulan: string
  kelas: string
  unit: string
  siswa: { id_siswa: string; nama_siswa: string }[]
  rows: { tanggal?: string; semester?: number | string | null; siswa_tidak_hadir?: unknown }[]
  loading: boolean
  guruNama: string
  guruNip: string
  kepsekTetap?: { nama: string; niy: string }
}) {
  const [ttd, setTtd] = useState<TandaTangan>({
    kepsekNama: kepsekTetap?.nama || '',
    kepsekNip: kepsekTetap?.niy || '',
    guruNama,
    guruNip,
    tempat: '',
  })
  const [ttdSiap, setTtdSiap] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TTD_KEY)
      if (raw) {
        const saved = JSON.parse(raw)
        setTtd((prev) => ({
          kepsekNama: kepsekTetap?.nama || (typeof saved.kepsekNama === 'string' ? saved.kepsekNama : prev.kepsekNama),
          kepsekNip: kepsekTetap?.niy || (typeof saved.kepsekNip === 'string' ? saved.kepsekNip : prev.kepsekNip),
          guruNama: typeof saved.guruNama === 'string' ? saved.guruNama : prev.guruNama,
          guruNip: typeof saved.guruNip === 'string' ? saved.guruNip : prev.guruNip,
          tempat: typeof saved.tempat === 'string' ? saved.tempat : prev.tempat,
        }))
      }
    } catch {
      /* data lama yang rusak diabaikan */
    }
    setTtdSiap(true)
  }, [kepsekTetap?.nama, kepsekTetap?.niy])

  useEffect(() => {
    if (!ttdSiap) return
    localStorage.setItem(TTD_KEY, JSON.stringify(ttd))
  }, [ttd, ttdSiap])

  const rekap = useMemo(() => buildRekapMatriks({ bulan, rows, siswa }), [bulan, rows, siswa])
  const semester = useMemo(() => {
    const found = rows.find((row) => row.semester != null && String(row.semester) !== '')
    return found ? String(found.semester) : ''
  }, [rows])

  const tanggalCetak = new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
  const [year, month] = bulan.split('-').map(Number)
  const hari = Array.from({ length: rekap.jumlahHari }, (_, index) => index + 1)
  const totalSakit = rekap.baris.reduce((sum, item) => sum + item.sakit, 0)
  const totalIzin = rekap.baris.reduce((sum, item) => sum + item.izin, 0)
  const totalAlpa = rekap.baris.reduce((sum, item) => sum + item.alpa, 0)
  const persenTerisi = rekap.baris.filter((item) => item.persen != null)
  const rataPersen =
    persenTerisi.length > 0
      ? Math.round((persenTerisi.reduce((sum, item) => sum + (item.persen || 0), 0) / persenTerisi.length) * 10) / 10
      : null

  const setField = (key: keyof TandaTangan, value: string) => {
    setTtd((prev) => ({ ...prev, [key]: value }))
  }

  if (!kelas) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Pilih satu kelas untuk menampilkan rekap matriks tanggal 1 sampai akhir bulan.
      </p>
    )
  }

  return (
    <div className="rekap-sheet space-y-3">
      <style>{`
        @page { size: 215mm 330mm; margin: 1cm; }
        .rekap-table { border-collapse: collapse; width: max-content; min-width: 100%; font-variant-numeric: tabular-nums; }
        .rekap-table th, .rekap-table td { border: 1px solid #cbd5e1; padding: 3px 2px; text-align: center; }
        .rekap-table .nama-col { min-width: 9.5rem; padding-left: 6px; padding-right: 6px; text-align: left; box-shadow: 2px 0 0 #e2e8f0; }
        .ttd-block td { border: none; text-align: center; vertical-align: top; }
        @media print {
          header, .no-print, .absensi-chrome { display: none !important; }
          body { background: #fff !important; }
          main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
          .absensi-card { overflow: visible !important; border: none !important; background: #fff !important; box-shadow: none !important; }
          .absensi-body { padding: 0 !important; }
          .rekap-scroll { overflow: visible !important; }
          .rekap-table { width: 100% !important; font-size: 7pt; table-layout: fixed; }
          .rekap-table th, .rekap-table td { padding: 1px 0 !important; }
          .rekap-table .nama-col { width: 34mm; min-width: 0 !important; position: static !important; box-shadow: none !important; }
          .rekap-table .col-no { width: 6mm; }
          .rekap-table .col-rekap { width: 9mm; }
          .sticky { position: static !important; }
          .sel-libur { background: #f8fafc !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .rekap-table thead { display: table-header-group; }
          .rekap-table tr, .ttd-block { break-inside: avoid; page-break-inside: avoid; }
          .ttd-spasi { height: 18mm; }
        }
      `}</style>

      <div className="no-print grid gap-3 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-3 sm:grid-cols-2 lg:grid-cols-3">
        <p className="text-[11px] font-bold text-slate-500 sm:col-span-2 lg:col-span-3">
          Data tanda tangan tersimpan di browser ini dan ikut tercetak.
        </p>
        <label className="text-[11px] font-bold text-slate-600">
          Tempat
          <input
            value={ttd.tempat}
            onChange={(event) => setField('tempat', event.target.value)}
            placeholder="Kota"
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          Nama kepala sekolah
          <input
            value={ttd.kepsekNama}
            onChange={(event) => setField('kepsekNama', event.target.value)}
            readOnly={Boolean(kepsekTetap)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold read-only:bg-slate-100"
          />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          {kepsekTetap ? 'NIY kepala sekolah' : 'NIP kepala sekolah'}
          <input
            value={ttd.kepsekNip}
            onChange={(event) => setField('kepsekNip', event.target.value)}
            readOnly={Boolean(kepsekTetap)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold read-only:bg-slate-100"
          />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          Nama guru kelas
          <input
            value={ttd.guruNama}
            onChange={(event) => setField('guruNama', event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          />
        </label>
        <label className="text-[11px] font-bold text-slate-600">
          NIP guru kelas
          <input
            value={ttd.guruNip}
            onChange={(event) => setField('guruNip', event.target.value)}
            className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
          />
        </label>
      </div>

      <div className="text-center">
        <p className="text-[11px] font-bold tracking-wide text-slate-500">
          SD ISLAM TERPADU AL MADINAH{unit ? ` · UNIT ${unit.toUpperCase()}` : ''}
        </p>
        <h3 className="text-base font-black text-slate-900">Rekap Absensi Bulanan</h3>
        <p className="text-[11px] text-slate-600">
          Kelas {kelas} · Bulan {labelBulan(bulan)}
          {semester ? ` · Semester ${semester}` : ''} · {siswa.length} siswa · Hari efektif {rekap.hariEfektif}
        </p>
      </div>

      <p className="text-[10px] leading-relaxed text-slate-500">
        • Hadir · S Sakit · I Izin · A Alpa. Kolom kosong berarti tidak ada jurnal pada tanggal itu.
        Persentase kehadiran = jumlah hari hadir ÷ hari efektif × 100. Baris jumlah berisi total S, I, A, dan rata-rata persentase. Latar tanggal Jumat dan Ahad menandai hari libur KBM.
        Jika dalam satu hari ada lebih dari satu keterangan, yang dipakai berurutan adalah Alpa, Sakit, lalu Izin.
      </p>

      {loading && <p className="text-xs text-slate-500">Menyusun rekap matriks...</p>}
      {!loading && siswa.length === 0 && (
        <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
          Daftar siswa kelas {kelas} belum tersedia.
        </p>
      )}
      {!loading && siswa.length > 0 && rekap.hariEfektif === 0 && (
        <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
          Belum ada jurnal pada bulan ini. Tanggal tetap ditampilkan, dan simbol terisi setelah presensi disimpan dari Jurnal Pembelajaran.
        </p>
      )}

      {!loading && siswa.length > 0 && (
        <div className="rekap-scroll overflow-x-auto rounded-xl border border-slate-200">
          <table className="rekap-table text-[10px] text-slate-700">
            <caption className="sr-only">
              Rekap absensi bulanan kelas {kelas} bulan {labelBulan(bulan)}
            </caption>
            <thead className="bg-slate-100 font-bold text-slate-700">
              <tr>
                <th rowSpan={2} className="col-no">
                  No
                </th>
                <th rowSpan={2} className="nama-col sticky left-0 z-20 bg-slate-100">
                  Nama siswa
                </th>
                {hari.map((tanggal) => {
                  const libur = rekap.libur[tanggal - 1]
                  return (
                    <th key={tanggal} title={libur ? 'Libur' : 'Hari efektif bila ada jurnal'} className={libur ? 'sel-libur bg-amber-50 text-amber-800' : ''}>
                      {tanggal}
                    </th>
                  )
                })}
                <th rowSpan={2} className="col-rekap" title="Total Sakit">
                  S
                </th>
                <th rowSpan={2} className="col-rekap" title="Total Izin">
                  I
                </th>
                <th rowSpan={2} className="col-rekap" title="Total Alpa">
                  A
                </th>
                <th rowSpan={2} className="col-rekap" title="Persentase Kehadiran">
                  %
                </th>
              </tr>
              <tr>
                {hari.map((tanggal) => {
                  const libur = rekap.libur[tanggal - 1]
                  const indeks = new Date(year, month - 1, tanggal).getDay()
                  return (
                    <th key={`hari-${tanggal}`} className={`font-semibold ${libur ? 'sel-libur bg-amber-50 text-amber-700' : 'text-slate-400'}`}>
                      {HARI_SINGKAT[indeks]}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {rekap.baris.map((item, index) => {
                const latar = index % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                return (
                <tr key={item.key} className={latar}>
                  <td>{index + 1}</td>
                  <td className={`nama-col sticky left-0 z-10 font-semibold text-slate-800 ${latar}`}>{item.nama}</td>
                  {item.simbol.map((simbol, tanggalIndex) => {
                    const libur = rekap.libur[tanggalIndex]
                    return (
                      <td
                        key={`${item.key}-${tanggalIndex + 1}`}
                        title={judulSimbol(simbol)}
                        className={`${kelasSimbol(simbol)} ${libur ? 'sel-libur bg-amber-50/70' : ''}`}
                      >
                        {simbol}
                      </td>
                    )
                  })}
                  <td className="font-bold text-amber-700">{item.sakit}</td>
                  <td className="font-bold text-sky-700">{item.izin}</td>
                  <td className="font-bold text-red-700">{item.alpa}</td>
                  <td className="font-bold text-emerald-800">{formatPersen(item.persen)}</td>
                </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-slate-100 font-bold text-slate-800">
                <td />
                <td className="nama-col sticky left-0 z-10 bg-slate-100">Jumlah</td>
                {hari.map((tanggal) => (
                  <td key={`jumlah-${tanggal}`} className={rekap.libur[tanggal - 1] ? 'sel-libur bg-amber-50' : ''} />
                ))}
                <td className="text-amber-700">{totalSakit}</td>
                <td className="text-sky-700">{totalIzin}</td>
                <td className="text-red-700">{totalAlpa}</td>
                <td className="text-emerald-800" title="Rata-rata persentase kehadiran">
                  {formatPersen(rataPersen)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      <table className="ttd-block mt-8 w-full text-[11px] text-slate-800">
        <tbody>
          <tr>
            <td className="w-1/2">
              <p>Mengetahui,</p>
              <p>Kepala Sekolah</p>
              <div className="ttd-spasi h-16" />
              <p className="font-bold underline">{garis(ttd.kepsekNama)}</p>
              <p>{kepsekTetap ? 'NIY' : 'NIP'}. {garis(ttd.kepsekNip)}</p>
            </td>
            <td className="w-1/2">
              <p>
                {ttd.tempat.trim() ? `${ttd.tempat.trim()}, ` : ''}
                {tanggalCetak}
              </p>
              <p>Guru Kelas</p>
              <div className="ttd-spasi h-16" />
              <p className="font-bold underline">{garis(ttd.guruNama)}</p>
              <p>NIP. {garis(ttd.guruNip)}</p>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
