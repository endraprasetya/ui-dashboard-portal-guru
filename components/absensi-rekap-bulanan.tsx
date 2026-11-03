'use client'

import { useEffect, useMemo, useState } from 'react'
import { X } from 'lucide-react'
import {
  buildRekapSiswaPerHari,
  type RekapSiswaPerHari,
  type SiswaKelas,
} from '@/lib/jurnal'

function formatPersen(value: number | null) {
  if (value == null) return '—'
  return Number.isInteger(value) ? `${value}%` : `${value.toFixed(1)}%`
}

function formatTanggalId(iso: string) {
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return iso
  return new Date(year, month - 1, day).toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function warnaPersen(value: number | null) {
  if (value == null) return 'text-slate-500'
  if (value >= 90) return 'text-emerald-700'
  if (value >= 75) return 'text-amber-700'
  return 'text-red-700'
}

function warnaStatus(status: string) {
  if (status === 'Sakit') return 'bg-amber-50 text-amber-800'
  if (status === 'Izin') return 'bg-sky-50 text-sky-800'
  return 'bg-red-50 text-red-800'
}

export function AbsensiRekapBulanan({
  kelas,
  labelPeriode,
  siswa,
  rows,
  loading,
}: {
  kelas: string
  labelPeriode: string
  siswa: SiswaKelas[]
  rows: { tanggal?: string; siswa_tidak_hadir?: unknown }[]
  loading: boolean
}) {
  const [detail, setDetail] = useState<RekapSiswaPerHari | null>(null)

  useEffect(() => {
    setDetail(null)
  }, [kelas, labelPeriode])

  useEffect(() => {
    if (!detail) return
    const tutup = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setDetail(null)
    }
    window.addEventListener('keydown', tutup)
    return () => window.removeEventListener('keydown', tutup)
  }, [detail])

  const rekap = useMemo(
    () => buildRekapSiswaPerHari({ rows, siswa, roster: siswa }),
    [rows, siswa],
  )

  const rataPersen = useMemo(() => {
    const terisi = rekap.baris.filter((item) => item.persen != null)
    if (terisi.length === 0) return null
    return Math.round((terisi.reduce((sum, item) => sum + (item.persen || 0), 0) / terisi.length) * 10) / 10
  }, [rekap.baris])

  const totalTidakHadir = rekap.baris.reduce((sum, item) => sum + item.hariTidakHadir, 0)

  if (!kelas) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Pilih <b>kelas</b> dan <b>bulan</b> di atas untuk menampilkan rekap kehadiran seluruh siswa.
      </p>
    )
  }

  if (loading) {
    return <p className="text-xs text-slate-500">Memuat rekap bulanan kelas {kelas}...</p>
  }

  if (siswa.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
        Daftar siswa kelas {kelas} belum tersedia.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-xl bg-slate-50 p-3">
          <p className="text-[11px] font-bold uppercase text-slate-500">Hari efektif</p>
          <p className="text-2xl font-black text-slate-900">{rekap.hariEfektif}</p>
          <p className="mt-1 text-[11px] text-slate-500">Tanggal yang ada jurnal kelas</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-3">
          <p className="text-[11px] font-bold uppercase text-emerald-700">Jumlah siswa</p>
          <p className="text-2xl font-black text-emerald-800">{rekap.baris.length}</p>
        </div>
        <div className="rounded-xl bg-sky-50 p-3">
          <p className="text-[11px] font-bold uppercase text-sky-700">Rata-rata kehadiran</p>
          <p className="text-2xl font-black text-sky-800">{formatPersen(rataPersen)}</p>
        </div>
        <div className="rounded-xl bg-amber-50 p-3">
          <p className="text-[11px] font-bold uppercase text-amber-700">Total hari tidak hadir</p>
          <p className="text-2xl font-black text-amber-800">{totalTidakHadir}</p>
        </div>
      </div>

      <p className="text-xs text-slate-500">
        Kelas <b>{kelas}</b> · {labelPeriode}. Dihitung per <b>hari efektif</b> (satu tanggal = satu hari),
        bukan per jam pelajaran. Klik angka tidak hadir untuk melihat rincian.
      </p>

      {rekap.hariEfektif === 0 && (
        <p className="rounded-xl border border-dashed border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Belum ada jurnal pada periode ini. Daftar siswa tetap ditampilkan; persentase akan terisi setelah presensi
          tersimpan dari Jurnal Pembelajaran.
        </p>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-600">
            <tr>
              <th className="w-12 p-2.5">No</th>
              <th className="p-2.5">Nama siswa</th>
              <th className="p-2.5 text-center">Hari hadir</th>
              <th className="p-2.5 text-center">Hari tidak hadir</th>
              <th className="p-2.5 text-center">Persentase kehadiran</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs">
            {rekap.baris.map((item, index) => (
              <tr key={item.key} className="hover:bg-slate-50">
                <td className="p-2.5 text-slate-500">{index + 1}</td>
                <td className="p-2.5 font-semibold text-slate-800">{item.nama}</td>
                <td className="p-2.5 text-center font-bold text-emerald-700">{item.hariHadir}</td>
                <td className="p-2.5 text-center">
                  {item.hariTidakHadir > 0 ? (
                    <button
                      type="button"
                      onClick={() => setDetail(item)}
                      className="inline-flex min-w-8 items-center justify-center rounded-lg bg-amber-50 px-2 py-1 font-bold text-amber-800 underline decoration-dotted underline-offset-2 hover:bg-amber-100"
                      title="Lihat rincian ketidakhadiran"
                    >
                      {item.hariTidakHadir}
                    </button>
                  ) : (
                    <span className="font-semibold text-slate-500">0</span>
                  )}
                </td>
                <td className={`p-2.5 text-center font-black tabular-nums ${warnaPersen(item.persen)}`}>
                  {formatPersen(item.persen)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
          onClick={() => setDetail(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white p-5 shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="judul-rincian-absen"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <p id="judul-rincian-absen" className="text-sm font-bold text-slate-800">
                  Rincian ketidakhadiran
                </p>
                <p className="text-base font-black text-slate-900">{detail.nama}</p>
                <p className="text-xs text-slate-500">
                  Kelas {kelas} · {labelPeriode} · {detail.hariTidakHadir} hari tidak hadir
                  {detail.sakit || detail.izin || detail.alpa
                    ? ` (Sakit ${detail.sakit}, Izin ${detail.izin}, Alpa ${detail.alpa})`
                    : ''}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Tutup"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {detail.rincian.length === 0 ? (
                <p className="text-sm text-slate-500">Tidak ada rincian ketidakhadiran.</p>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="sticky top-0 bg-slate-50 font-bold text-slate-600">
                    <tr>
                      <th className="p-2.5">Tanggal tidak masuk</th>
                      <th className="p-2.5">Status</th>
                      <th className="p-2.5">Keterangan / alasan</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.rincian.map((item) => (
                      <tr key={`${detail.key}-${item.tanggal}`}>
                        <td className="p-2.5 font-semibold text-slate-800">{formatTanggalId(item.tanggal)}</td>
                        <td className="p-2.5">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${warnaStatus(item.status)}`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-600">{item.keterangan || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setDetail(null)}
                className="rounded-lg bg-slate-800 px-4 py-2 text-xs font-bold text-white"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
