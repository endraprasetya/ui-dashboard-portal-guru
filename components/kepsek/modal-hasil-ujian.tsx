'use client'

import { useMemo, useState } from 'react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import { TombolLihatNilaiUjian } from '@/components/qiroah-lihat-nilai'
import type { RekapLulus } from '@/lib/kepala-sekolah'
import { statusUjianFilter } from '@/lib/rekapan-qiroah'
import { rekapLulusKepsekKeTampilan } from '@/lib/ujian-nilai-tampilan'
import { todayInputValue } from '@/lib/jurnal'

const BATAS = 7

type FilterStatus = 'semua' | 'lulus' | 'mengulang'

export function ModalHasilUjianKepsek({
  baris,
  unit,
  onTutup,
}: {
  baris: RekapLulus[]
  unit: string
  onTutup: () => void
}) {
  const [tanggal, setTanggal] = useState('')
  const [status, setStatus] = useState<FilterStatus>('semua')
  const [lengkap, setLengkap] = useState(false)

  const tampil = useMemo(() => {
    return baris.filter((row) => {
      const cocokTanggal = !tanggal || String(row.tanggal_ujian || '').slice(0, 10) === tanggal
      const cocokStatus = statusUjianFilter(
        {
          keputusan: row.keputusan,
        },
        status,
      )
      return cocokTanggal && cocokStatus
    })
  }, [baris, tanggal, status])

  const tabel = lengkap ? tampil : tampil.slice(0, BATAS)

  return (
    <ModalKerangka
      judul="Rekapitulasi ujian kenaikan jilid"
      keterangan={`Unit ${unit} · ${tampil.length} hasil ujian tercatat`}
      onTutup={onTutup}
      lebar="max-w-5xl"
    >
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-600">
          Tanggal ujian
          <input
            type="date"
            value={tanggal}
            max={todayInputValue()}
            onChange={(e) => setTanggal(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Status
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as FilterStatus)}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
          >
            <option value="semua">Semua</option>
            <option value="lulus">Lulus</option>
            <option value="mengulang">Mengulang</option>
          </select>
        </label>
        {tanggal && (
          <button type="button" onClick={() => setTanggal('')} className="text-xs font-bold text-emerald-800 underline">
            Reset tanggal
          </button>
        )}
      </div>
      {tampil.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Tidak ada hasil ujian untuk filter ini.</p>
      ) : (
        <>
          <TabelHasil tabel={tabel} />
          {tampil.length > BATAS && (
            <button
              type="button"
              onClick={() => setLengkap((v) => !v)}
              className="mt-3 w-full rounded-xl border border-slate-200 py-2 text-xs font-bold text-emerald-900 hover:bg-slate-50"
            >
              {lengkap ? 'Tampilkan lebih ringkas' : `Lihat selengkapnya (${tampil.length} peserta)`}
            </button>
          )}
        </>
      )}
    </ModalKerangka>
  )
}

function TabelHasil({ tabel }: { tabel: RekapLulus[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="border-b p-2">Tanggal</th>
            <th className="border-b p-2">Siswa</th>
            <th className="border-b p-2">Kelas</th>
            <th className="border-b p-2">Jilid</th>
            <th className="border-b p-2">Nilai</th>
            <th className="border-b p-2">Predikat</th>
            <th className="border-b p-2">Keputusan</th>
            <th className="border-b p-2 text-center">Aksi</th>
          </tr>
        </thead>
        <tbody>
          {tabel.map((row) => (
            <tr key={row.id_ujian || `${row.id_siswa}-${row.tanggal_ujian}`}>
              <td className="border-b p-2 tabular-nums">{String(row.tanggal_ujian || '').slice(0, 10) || '—'}</td>
              <td className="border-b p-2 font-bold">{row.nama}</td>
              <td className="border-b p-2">{row.kelas}</td>
              <td className="border-b p-2">
                {row.jilid_asal} → {row.jilid_tujuan || '—'}
              </td>
              <td className="border-b p-2 tabular-nums">{row.nilai_akhir || '—'}</td>
              <td className="border-b p-2">{row.predikat}</td>
              <td
                className={`border-b p-2 font-bold ${String(row.keputusan || '').toLowerCase() === 'lulus' ? 'text-emerald-700' : 'text-amber-800'}`}
              >
                {row.keputusan}
              </td>
              <td className="border-b p-2 text-center">
                <TombolLihatNilaiUjian data={rekapLulusKepsekKeTampilan(row)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
