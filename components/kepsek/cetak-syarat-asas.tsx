'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { labelTapel } from '@/lib/ampss-urai'
import { saringSiswaSyaratAsas, type RekapSyaratAsas, type StatusSyaratAsas } from '@/lib/syarat-asas'

export type JenisCetakSyaratAsas = 'lunas' | 'belum'

function waktuLokal(iso: string) {
  const tanggal = new Date(iso)
  if (Number.isNaN(tanggal.getTime())) return ''
  return tanggal.toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })
}

function tanggalCetak(nilai = new Date()) {
  return nilai.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

function cetakBersih() {
  const judul = document.title
  document.title = '\u00a0'
  const pulihkan = () => {
    document.title = judul
    window.removeEventListener('afterprint', pulihkan)
  }
  window.addEventListener('afterprint', pulihkan)
  window.print()
}

const GAYA_CETAK = `
  @page { size: A4 portrait; margin: 0; }
  .berkas-syarat-asas { font-family: "Times New Roman", Times, serif; color: #111; }
  .berkas-syarat-asas table { width: 100%; border-collapse: collapse; }
  .berkas-syarat-asas .meta td { border: none; padding: 1px 0; font-size: 10.5pt; vertical-align: top; }
  .berkas-syarat-asas .daftar th,
  .berkas-syarat-asas .daftar td { border: 1px solid #111; padding: 5px 6px; font-size: 10.5pt; vertical-align: top; }
  .berkas-syarat-asas .daftar thead th { background: #f3f4f6; font-weight: 700; text-align: center; }
  .berkas-syarat-asas .nomor { width: 10mm; text-align: center; }
  .berkas-syarat-asas .kelas { width: 22mm; text-align: center; }
  .berkas-syarat-asas .status { width: 38mm; text-align: center; }
  @media print {
    html, body {
      background: #fff !important;
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      overflow: visible !important;
    }
    body > *:not(.overlay-syarat-asas) { display: none !important; }
    .overlay-syarat-asas {
      position: static !important;
      inset: auto !important;
      background: #fff !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    .no-print { display: none !important; }
    .berkas-syarat-asas { max-width: none; margin: 0; box-shadow: none !important; }
    .halaman-syarat-asas {
      box-shadow: none !important;
      margin: 0 !important;
      max-width: none;
      width: auto;
      min-height: 0 !important;
      padding: 12mm 12mm 14mm 12mm !important;
    }
    thead { display: table-header-group; }
    tr { break-inside: avoid; page-break-inside: avoid; }
  }
`

export function BarisAksiSyaratAsas({
  kelas,
  kelasPilihan,
  onKelas,
  onCetak,
  memuat,
  galat,
}: {
  kelas: string
  kelasPilihan: string[]
  onKelas: (nilai: string) => void
  onCetak: (jenis: JenisCetakSyaratAsas) => void
  memuat?: boolean
  galat?: string
}) {
  return (
    <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
      <p className="text-[11px] font-extrabold uppercase tracking-wide text-emerald-950">
        Cetak rekap syarat administrasi ujian ASAS
      </p>
      <p className="mt-1 text-[11px] leading-4 text-emerald-900/80">
        Tidak mengubah data tagihan. Buku dan TKA tidak dihitung pada rekap ini.
      </p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <label className="text-[11px] font-bold text-emerald-950">
          Filter cetak
          <select
            value={kelas}
            onChange={(event) => onKelas(event.target.value)}
            className="mt-1 block rounded-lg border border-emerald-200 bg-white px-2 py-1.5 font-semibold"
          >
            <option value="semua">Semua kelas</option>
            {kelasPilihan.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          disabled={memuat}
          onClick={() => onCetak('lunas')}
          className="inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-emerald-900 disabled:opacity-60"
        >
          <Printer className="size-3" /> Cetak Daftar Lunas Syarat ASAS
        </button>
        <button
          type="button"
          disabled={memuat}
          onClick={() => onCetak('belum')}
          className="inline-flex items-center gap-1 rounded-lg border border-amber-700 bg-white px-3 py-1.5 text-[11px] font-bold text-amber-950 hover:bg-amber-50 disabled:opacity-60"
        >
          <Printer className="size-3" /> Cetak Daftar Belum Lunas Syarat ASAS
        </button>
      </div>
      {memuat ? <p className="mt-2 text-[11px] font-semibold text-emerald-800">Menyiapkan rekap syarat ASAS...</p> : null}
      {galat ? <p className="mt-2 text-[11px] font-semibold text-red-700">{galat}</p> : null}
    </div>
  )
}

export function PratinjauCetakSyaratAsas({
  data,
  jenis,
  kelas,
  unit,
  onTutup,
}: {
  data: RekapSyaratAsas
  jenis: JenisCetakSyaratAsas
  kelas: string
  unit: string
  onTutup: () => void
}) {
  const lunas = jenis === 'lunas'
  const daftar = useMemo(
    () => saringSiswaSyaratAsas(data.siswa, { lunas, kelas }),
    [data.siswa, lunas, kelas],
  )
  const judul = lunas ? 'Daftar Lunas Syarat ASAS' : 'Daftar Belum Lunas Syarat ASAS'
  const status: StatusSyaratAsas = lunas ? 'Lunas Syarat ASAS' : 'Belum Lunas Syarat ASAS'
  const labelKelas = !kelas || kelas === 'semua' ? 'Semua kelas' : `Kelas ${kelas}`
  const tapel = labelTapel(data.tapel)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    setSiap(true)
  }, [])

  useEffect(() => {
    const sebelumnya = document.title
    document.title = '\u00a0'
    return () => {
      document.title = sebelumnya
    }
  }, [])

  useEffect(() => {
    const tutup = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTutup()
    }
    window.addEventListener('keydown', tutup)
    return () => window.removeEventListener('keydown', tutup)
  }, [onTutup])

  if (!siap) return null

  return createPortal(
    <div className="overlay-syarat-asas fixed inset-0 z-[130] overflow-auto bg-slate-200/90 p-4 print:bg-white print:p-0">
      <style>{GAYA_CETAK}</style>
      <div className="no-print mx-auto mb-3 flex max-w-[210mm] flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-bold text-slate-800">Pratinjau cetak · {judul}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cetakBersih}
            className="inline-flex items-center gap-1 rounded-lg bg-[#143d32] px-3 py-1.5 text-xs font-bold text-white"
          >
            <Printer className="size-3.5" /> Cetak / PDF
          </button>
          <button
            type="button"
            onClick={onTutup}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-700"
          >
            <X className="size-3.5" /> Tutup
          </button>
        </div>
      </div>

      <article className="berkas-syarat-asas halaman-syarat-asas mx-auto max-w-[210mm] bg-white p-[12mm] shadow-md">
        <header className="border-b border-black pb-2 text-center">
          <p className="text-[11pt] font-bold uppercase tracking-wide">SD Islam Terpadu Al Madinah</p>
          <h1 className="mt-1 text-[14pt] font-bold leading-snug">{judul}</h1>
          <p className="mt-1 text-[11pt]">Rekap kelayakan administrasi mengikuti ujian ASAS</p>
        </header>
        <table className="meta mt-3 text-[10.5pt]">
          <tbody>
            <tr>
              <td className="w-[38mm] font-bold">Unit / sekolah</td>
              <td>: {data.sekolah}{unit ? ` (${unit})` : ''}</td>
            </tr>
            <tr>
              <td className="font-bold">Kelas</td>
              <td>: {labelKelas}</td>
            </tr>
            <tr>
              <td className="font-bold">Tahun pelajaran</td>
              <td>: {tapel || data.tapel || '—'}</td>
            </tr>
            <tr>
              <td className="font-bold">Periode syarat</td>
              <td>: SPP &amp; catering s.d. {data.labelBatas}</td>
            </tr>
            <tr>
              <td className="font-bold">Tanggal cetak</td>
              <td>: {tanggalCetak()}</td>
            </tr>
            <tr>
              <td className="font-bold">Jumlah siswa</td>
              <td>: {daftar.length} siswa · status {status}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2 text-[9.5pt] leading-snug">
          Data tagihan umum tidak diubah. Item Buku dan TKA dikecualikan dari penilaian syarat ASAS.
          {data.diambilPada ? ` Sumber AMPSS per ${waktuLokal(data.diambilPada)}.` : ''}
        </p>

        <table className="daftar mt-3">
          <thead>
            <tr>
              <th className="nomor">No</th>
              <th>Nama Siswa</th>
              <th className="kelas">Kelas</th>
              <th className="status">Status Syarat ASAS</th>
              <th>Keterangan / Item Belum Lunas</th>
            </tr>
          </thead>
          <tbody>
            {daftar.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-4 text-center">
                  Tidak ada siswa pada saringan ini.
                </td>
              </tr>
            ) : (
              daftar.map((baris, indeks) => (
                <tr key={baris.nis}>
                  <td className="nomor">{indeks + 1}</td>
                  <td>{baris.nama}</td>
                  <td className="kelas">{baris.kelas}</td>
                  <td className="status">{baris.status}</td>
                  <td>{baris.keterangan}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </article>
    </div>,
    document.body,
  )
}
