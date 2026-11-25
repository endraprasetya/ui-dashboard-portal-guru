'use client'

import { useState, type ReactNode } from 'react'
import { Download, Printer } from 'lucide-react'
import { diBawahKkm, kkmMapelKurmer, type MapelKurmer } from '@/lib/kkm-kurmer'
import {
  formatNilaiKurmer,
  MODE_LEGER_KURMER,
  type BarisLedgerKurmer,
  type FilterKurmer,
  type ModeLegerKurmer,
  type RekapMapelLedger,
} from '@/lib/rapor-kurmer'

const JUDUL_MODE: Record<ModeLegerKurmer, string> = {
  ASTS: 'Leger ASTS',
  ASAS: 'Leger ASAS',
  NA: 'Leger Nilai Akhir (NA / Semester)',
}

function unduhCsv(nama: string, isi: string) {
  const blob = new Blob([`\uFEFF${isi}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const tautan = document.createElement('a')
  tautan.href = url
  tautan.download = nama
  tautan.click()
  URL.revokeObjectURL(url)
}

function selCsv(nilai: string | number | null | undefined) {
  const teks = nilai == null ? '' : String(nilai)
  if (/[;"\n]/.test(teks)) return `"${teks.replace(/"/g, '""')}"`
  return teks
}

export function RaporKurmerLedger({
  filter,
  umum,
  diniyyah,
  baris,
  rekap,
  memuat,
  mode,
  onMode,
}: {
  filter: FilterKurmer
  umum: MapelKurmer[]
  diniyyah: MapelKurmer[]
  baris: BarisLedgerKurmer[]
  rekap: RekapMapelLedger[]
  memuat: boolean
  mode: ModeLegerKurmer
  onMode: (mode: ModeLegerKurmer) => void
}) {
  const [pesan, setPesan] = useState('')
  const kolom = umum.length + diniyyah.length + 8
  const petaRekap = new Map(rekap.map((item) => [item.mapel.kode, item]))

  const ekspor = () => {
    const kepala = [
      'No',
      'NIS',
      'NISN',
      'Nama Peserta Didik',
      ...umum.map((item) => item.nama),
      'JUMLAH',
      ...diniyyah.map((item) => item.nama),
      'JUMLAH',
      'TOTAL',
      'RANKING',
    ]
    const kkm = [
      '',
      '',
      'KKM',
      '',
      ...umum.map((item) => kkmMapelKurmer(item.kode, filter.kelas) ?? ''),
      '',
      ...diniyyah.map((item) => kkmMapelKurmer(item.kode, filter.kelas) ?? ''),
      '',
      '',
      '',
    ]
    const data = baris.map((item, index) => [
      index + 1,
      item.siswa.nis || '',
      item.siswa.nisn || '',
      item.siswa.nama_siswa,
      ...umum.map((mapel) => item.nilai[mapel.kode] ?? ''),
      item.jumlahUmum ?? '',
      ...diniyyah.map((mapel) => item.nilai[mapel.kode] ?? ''),
      item.jumlahDiniyyah ?? '',
      item.total ?? '',
      item.ranking,
    ])
    const isi = [kepala, kkm, ...data].map((barisCsv) => barisCsv.map(selCsv).join(';')).join('\n')
    const berkas = `leger-${mode}-${filter.kelas || 'kelas'}-${filter.tahunAjaran.replace('/', '-')}-s${filter.semester}.csv`
    unduhCsv(berkas, isi)
    setPesan('Berkas CSV leger diunduh. Excel dapat membuka pemisah titik koma.')
  }

  return (
    <div className="leger-kurmer space-y-4">
      <style>{`
        @media print {
          header, nav, .no-print, .print\\:hidden { display: none !important; }
          .leger-kurmer { color: #111; }
          .leger-scroll { overflow: visible !important; }
          .leger-table th, .leger-table td { font-size: 8pt; }
          .leger-table .sticky { position: static !important; }
          .di-bawah-kkm { background: #ffe4e6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <div className="no-print flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">
          {MODE_LEGER_KURMER.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => onMode(item)}
              className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
                mode === item ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {item === 'NA' ? 'Nilai Akhir' : `Leger ${item}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={ekspor}
            disabled={baris.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 disabled:opacity-50"
          >
            <Download className="size-3.5" /> Ekspor CSV
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white"
          >
            <Printer className="size-3.5" /> Cetak leger
          </button>
        </div>
      </div>
      {pesan ? <p className="no-print text-xs font-semibold text-emerald-700">{pesan}</p> : null}

      <section className="no-print grid gap-3 sm:grid-cols-2">
        <KartuRekapKelompok judul="Kelompok Umum" daftar={umum.map((mapel) => petaRekap.get(mapel.kode)!).filter(Boolean)} />
        <KartuRekapKelompok judul="Kelompok Diniyyah" daftar={diniyyah.map((mapel) => petaRekap.get(mapel.kode)!).filter(Boolean)} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-extrabold text-slate-900">
            {JUDUL_MODE[mode]} · Kelas {filter.kelas || '—'}
          </h3>
          <p className="text-[11px] text-slate-500">
            Tahun {filter.tahunAjaran} · Semester {filter.semester}. Ranking mengikuti jumlah nilai umum. PAI adalah
            rata-rata mapel diniyyah aktif, dibulatkan. Sel merah berarti nilai di bawah KKM.
          </p>
        </div>
        <div className="leger-scroll overflow-x-auto">
          <table className="leger-table min-w-max w-full border-separate border-spacing-0 text-left text-[11px]">
            <thead className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <ThLekat kiri="left-0" lebar="w-10" rowSpan={3}>
                  No
                </ThLekat>
                <ThLekat kiri="left-10" lebar="w-24" rowSpan={3}>
                  NIS
                </ThLekat>
                <ThLekat kiri="left-[8.5rem]" lebar="w-24" rowSpan={3}>
                  NISN
                </ThLekat>
                <ThLekat kiri="left-[14.5rem]" lebar="min-w-44" rowSpan={3}>
                  Nama Peserta Didik
                </ThLekat>
                <th colSpan={umum.length + 1} className="border-b border-l border-slate-200 bg-indigo-50 px-2 py-1 text-center text-indigo-800">
                  Umum
                </th>
                <th colSpan={diniyyah.length + 1} className="border-b border-l border-slate-200 bg-teal-50 px-2 py-1 text-center text-teal-800">
                  Diniyyah
                </th>
                <th colSpan={2} className="border-b border-l border-slate-200 bg-slate-100 px-2 py-1 text-center text-slate-700">
                  Rekap
                </th>
              </tr>
              <tr className="bg-slate-50">
                {umum.map((mapel) => (
                  <th key={mapel.kode} className="max-w-20 border-l border-slate-200 px-1 py-1 text-center leading-tight">
                    {mapel.nama}
                  </th>
                ))}
                <th className="border-l border-slate-200 px-2 py-1 text-center">Jumlah</th>
                {diniyyah.map((mapel) => (
                  <th key={mapel.kode} className="max-w-20 border-l border-slate-200 px-1 py-1 text-center leading-tight">
                    {mapel.nama}
                  </th>
                ))}
                <th className="border-l border-slate-200 px-2 py-1 text-center">Jumlah</th>
                <th className="border-l border-slate-200 px-2 py-1 text-center">Total</th>
                <th className="border-l border-slate-200 px-2 py-1 text-center">Ranking</th>
              </tr>
              <tr className="bg-amber-50 text-amber-900">
                {umum.map((mapel) => (
                  <th key={`kkm-${mapel.kode}`} className="border-l border-slate-200 px-1 py-1 text-center">
                    {kkmMapelKurmer(mapel.kode, filter.kelas) ?? '—'}
                  </th>
                ))}
                <th className="border-l border-slate-200 px-1 py-1 text-center">KKM</th>
                {diniyyah.map((mapel) => (
                  <th key={`kkm-${mapel.kode}`} className="border-l border-slate-200 px-1 py-1 text-center">
                    {kkmMapelKurmer(mapel.kode, filter.kelas) ?? '—'}
                  </th>
                ))}
                <th className="border-l border-slate-200" />
                <th className="border-l border-slate-200" />
                <th className="border-l border-slate-200" />
              </tr>
            </thead>
            <tbody>
              {memuat ? (
                <tr>
                  <td colSpan={kolom} className="px-4 py-10 text-center text-sm text-slate-500">
                    Menyusun leger kelas…
                  </td>
                </tr>
              ) : !filter.kelas ? (
                <tr>
                  <td colSpan={kolom} className="px-4 py-10 text-center text-sm text-slate-500">
                    Pilih kelas untuk menampilkan leger.
                  </td>
                </tr>
              ) : baris.length === 0 ? (
                <tr>
                  <td colSpan={kolom} className="px-4 py-10 text-center text-sm text-slate-500">
                    Belum ada siswa pada kelas {filter.kelas}.
                  </td>
                </tr>
              ) : (
                baris.map((item, index) => (
                  <tr key={item.siswa.id_siswa} className="hover:bg-slate-50/80">
                    <TdLekat kiri="left-0">{index + 1}</TdLekat>
                    <TdLekat kiri="left-10">{item.siswa.nis || '—'}</TdLekat>
                    <TdLekat kiri="left-[8.5rem]">{item.siswa.nisn || '—'}</TdLekat>
                    <TdLekat kiri="left-[14.5rem]" tebal>
                      {item.siswa.nama_siswa}
                    </TdLekat>
                    {umum.map((mapel) => (
                      <SelNilai
                        key={`${item.siswa.id_siswa}-${mapel.kode}`}
                        nilai={item.nilai[mapel.kode] ?? null}
                        kkm={kkmMapelKurmer(mapel.kode, filter.kelas)}
                      />
                    ))}
                    <td className="border-b border-l border-slate-100 px-2 py-1.5 text-center font-black tabular-nums">
                      {formatNilaiKurmer(item.jumlahUmum)}
                    </td>
                    {diniyyah.map((mapel) => (
                      <SelNilai
                        key={`${item.siswa.id_siswa}-${mapel.kode}`}
                        nilai={item.nilai[mapel.kode] ?? null}
                        kkm={kkmMapelKurmer(mapel.kode, filter.kelas)}
                      />
                    ))}
                    <td className="border-b border-l border-slate-100 px-2 py-1.5 text-center font-black tabular-nums">
                      {formatNilaiKurmer(item.jumlahDiniyyah)}
                    </td>
                    <td className="border-b border-l border-slate-200 px-2 py-1.5 text-center font-black tabular-nums text-indigo-800">
                      {formatNilaiKurmer(item.total)}
                    </td>
                    <td className="border-b border-l border-slate-200 px-2 py-1.5 text-center font-black tabular-nums">
                      {item.ranking}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function ThLekat({
  children,
  kiri,
  lebar,
  rowSpan,
}: {
  children: ReactNode
  kiri: string
  lebar: string
  rowSpan?: number
}) {
  return (
    <th rowSpan={rowSpan} className={`sticky ${kiri} z-20 ${lebar} border-b border-slate-200 bg-slate-50 px-2 py-2`}>
      {children}
    </th>
  )
}

function TdLekat({ children, kiri, tebal = false }: { children: ReactNode; kiri: string; tebal?: boolean }) {
  return (
    <td className={`sticky ${kiri} z-10 border-b border-slate-100 bg-white px-2 py-1.5 ${tebal ? 'font-bold text-slate-800' : 'text-slate-600'}`}>
      {children}
    </td>
  )
}

function SelNilai({ nilai, kkm }: { nilai: number | null; kkm: number | null }) {
  const rendah = diBawahKkm(nilai, kkm)
  return (
    <td
      className={`border-b border-l border-slate-100 px-1 py-1.5 text-center font-bold tabular-nums ${
        rendah ? 'di-bawah-kkm bg-rose-50 text-rose-700' : 'text-slate-800'
      }`}
    >
      {formatNilaiKurmer(nilai)}
    </td>
  )
}

function KartuRekapKelompok({ judul, daftar }: { judul: string; daftar: RekapMapelLedger[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h4 className="mb-2 text-sm font-extrabold text-slate-900">{judul}</h4>
      <div className="space-y-1.5">
        {daftar.map((item) => (
          <div key={item.mapel.kode} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-semibold text-slate-600">{item.mapel.nama}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              rata {formatNilaiKurmer(item.rata)} · {item.terisi} terisi
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
