'use client'

import Link from 'next/link'
import { Printer, Save } from 'lucide-react'
import {
  formatNilaiKurmer,
  susunBarisMuatanCetak,
  type BarisMuatanCetak,
  type DataCetakKurmer,
} from '@/lib/rapor-kurmer'

function garis(value: string, panjang = 22) {
  const teks = value.trim()
  return teks || '.'.repeat(panjang)
}

function BarisIdentitas({ label, nilai }: { label: string; nilai: string }) {
  return (
    <tr>
      <td className="w-40 py-0.5 align-top">{label}</td>
      <td className="py-0.5 align-top">: {nilai || '-'}</td>
    </tr>
  )
}

export const GAYA_CETAK_RAPOR_KURMER = `
  @page { size: F4 portrait; margin: 8mm; }
  .lembar-rapor-kurmer {
    font-family: "Times New Roman", Times, serif;
    color: #111;
    box-sizing: border-box;
  }
  .lembar-rapor-kurmer table { width: 100%; border-collapse: collapse; }
  .lembar-rapor-kurmer .tabel-nilai th,
  .lembar-rapor-kurmer .tabel-nilai td { border: 1px solid #111; padding: 1px 3px; line-height: 1.15; vertical-align: middle; }
  .lembar-rapor-kurmer .tabel-nilai thead th { background: #e8eaf6; font-weight: 700; text-align: center; font-size: 8.5pt; }
  .lembar-rapor-kurmer .tabel-nilai .baris-judul td {
    background: #f3f4f6;
    font-weight: 700;
    text-align: left;
    padding: 2px 4px;
    font-size: 9pt;
  }
  .lembar-rapor-kurmer .tabel-nilai .baris-jumlah td {
    font-weight: 700;
    background: #fafafa;
  }
  .lembar-rapor-kurmer .tabel-nilai .indent-muatan { padding-left: 14px; font-size: 8.5pt; }
  .lembar-rapor-kurmer .blok-identitas td { padding: 0; line-height: 1.2; }
  .lembar-rapor-kurmer .kotak-catatan td { vertical-align: top; font-size: 8.5pt; padding: 3px 5px; min-height: 12mm; }
  .lembar-rapor-kurmer .ttd-atas td { border: none !important; width: 50%; text-align: center; vertical-align: top; font-size: 9pt; }
  .lembar-rapor-kurmer .ttd-bawah td { border: none !important; text-align: center; vertical-align: top; font-size: 9pt; }
  .lembar-rapor-kurmer .ruang-ttd { height: 13mm; }
  .lembar-rapor-kurmer .ruang-ttd-kecil { height: 11mm; }
  @media print {
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      background: #fff !important;
      width: 210mm;
      min-height: 0 !important;
      height: auto !important;
      overflow: visible !important;
    }
    body * { visibility: hidden; }
    body.cetak-rapor-kurmer-saja .lembar-rapor-kurmer,
    body.cetak-rapor-kurmer-saja .lembar-rapor-kurmer * { visibility: visible; }
    body.cetak-rapor-kurmer-saja .lembar-rapor-kurmer {
      position: absolute;
      left: 0;
      top: 0;
      width: 100%;
    }
    .no-print, .print\\:hidden { display: none !important; }
    header, nav, footer, [data-portal-guru] { display: none !important; }
    .lembar-rapor-kurmer {
      box-shadow: none !important;
      margin: 0 auto !important;
      padding: 0 !important;
      min-height: 0 !important;
      max-width: none !important;
      width: 100% !important;
      font-size: 8.75pt;
      line-height: 1.12;
      page-break-after: avoid;
      page-break-inside: avoid;
      break-inside: avoid-page;
    }
    .lembar-rapor-kurmer .kop-rapor { padding-bottom: 2px; margin-bottom: 2px; }
    .lembar-rapor-kurmer .kop-rapor p { margin: 0; line-height: 1.1; }
    .lembar-rapor-kurmer .judul-utama { margin: 2px 0 1px; font-size: 10.5pt; }
    .lembar-rapor-kurmer .subjudul { margin: 0; font-size: 8.5pt; }
    .lembar-rapor-kurmer .tabel-nilai { font-size: 8pt; }
    .lembar-rapor-kurmer .tabel-nilai th,
    .lembar-rapor-kurmer .tabel-nilai td { padding: 0.5px 2px; }
    .lembar-rapor-kurmer section { page-break-inside: avoid; break-inside: avoid; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
  @media screen {
    .lembar-rapor-kurmer {
      min-height: 330mm;
      max-width: 210mm;
    }
  }
`

export function LembarRaporKurmer({ data }: { data: DataCetakKurmer }) {
  const { siswa, periode, catatan, statistik } = data
  const barisMuatan = susunBarisMuatanCetak(data.umum, data.diniyyah)
  const tempatTanggal = `${data.lokasi || 'Nogosari'}, ${new Date().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })}`

  return (
    <article className="lembar-rapor-kurmer mx-auto min-h-[330mm] max-w-[210mm] bg-white px-5 py-4 text-[10.5pt] leading-snug shadow-xl print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="kop-rapor border-b-4 border-double border-black pb-1 text-center">
        <p className="text-[9pt] font-bold tracking-wide">YAYASAN AL MADINAH</p>
        <p className="text-[11.5pt] font-bold leading-tight">SD ISLAM TERPADU AL MADINAH</p>
        <p className="text-[8.5pt]">{siswa.unit ? `Unit ${siswa.unit}` : 'Kurikulum Merdeka'}</p>
      </header>

      <div className="mt-1.5 text-center">
        <h1 className="judul-utama text-[11.5pt] font-bold underline">LAPORAN HASIL BELAJAR (RAPOR)</h1>
        <p className="subjudul text-[9pt]">
          Semester {periode.labelSemester} · Tahun Ajaran {periode.tahunAjaran} · {data.filter.jenisAsesmen}
        </p>
      </div>

      <section className="mt-1.5">
        <table className="blok-identitas text-[9.5pt]">
          <tbody>
            <BarisIdentitas label="Nama peserta didik" nilai={siswa.nama_siswa} />
            <BarisIdentitas label="NIS" nilai={siswa.nis} />
            <BarisIdentitas label="Kelas / Fase" nilai={`${siswa.kelas} / Fase ${periode.fase}`} />
          </tbody>
        </table>
      </section>

      <TabelMuatanGabungan baris={barisMuatan} jumlah={statistik.total} />

      <section className="mt-1.5">
        <table className="tabel-nilai kotak-catatan text-[9pt]">
          <thead>
            <tr>
              <th className="text-left">Catatan Wali Kelas</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="align-top">
                {catatan.catatan_wali || '……………………………………………………………………………………'}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      <table className="ttd-atas mt-2 w-full text-[9pt] print:mt-1">
        <tbody>
          <tr>
            <td>Orang Tua / Wali Murid</td>
            <td>
              {tempatTanggal}
              <br />
              Guru Kelas
            </td>
          </tr>
          <tr>
            <td className="ruang-ttd" />
            <td className="ruang-ttd" />
          </tr>
          <tr>
            <td>( ................................. )</td>
            <td>
              <span className="font-bold underline">{garis(catatan.nama_wali)}</span>
              <br />
              NIY. {garis(catatan.niy_wali || '', 14)}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="ttd-bawah mt-1 w-full">
        <tbody>
          <tr>
            <td>Mengetahui,</td>
          </tr>
          <tr>
            <td>Kepala Sekolah</td>
          </tr>
          <tr>
            <td className="ruang-ttd-kecil" />
          </tr>
          <tr>
            <td>
              <span className="font-bold underline">{garis(catatan.nama_kepsek || data.kepsek.nama)}</span>
              <br />
              NIY. {garis(data.kepsek.niy, 14)}
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  )
}

function TabelMuatanGabungan({ baris, jumlah }: { baris: BarisMuatanCetak[]; jumlah: number | null }) {
  const colNilai = 5
  return (
    <section className="mt-1.5 print:mt-1">
      <table className="tabel-nilai w-full text-[9pt]">
        <thead>
          <tr>
            <th rowSpan={2} className="w-7">
              No
            </th>
            <th rowSpan={2} className="min-w-0 text-left">
              Muatan Pelajaran
            </th>
            <th colSpan={colNilai} className="border-b border-black">
              Nilai (NH · ASTS · ASAS · NA)
            </th>
          </tr>
          <tr>
            <th className="w-9">NH</th>
            <th className="w-9">ASTS</th>
            <th className="w-9">ASAS</th>
            <th className="w-9">NA</th>
            <th className="w-10">Pred.</th>
          </tr>
        </thead>
        <tbody>
          {baris.map((barisItem, index) => {
            if (barisItem.jenis === 'judul') {
              return (
                <tr key={`judul-${index}`} className="baris-judul">
                  <td colSpan={7}>{barisItem.teks}</td>
                </tr>
              )
            }
            const { data, nomor, indent } = barisItem
            const label = indent ? `– ${data.mapel.nama}` : data.mapel.nama
            return (
              <tr key={`${data.mapel.kode}-${index}`}>
                <td className="text-center">{nomor ?? ''}</td>
                <td className={indent ? 'indent-muatan text-left' : 'text-left'}>{label}</td>
                <td className="text-center tabular-nums">{formatNilaiKurmer(data.nh)}</td>
                <td className="text-center tabular-nums">{formatNilaiKurmer(data.asts)}</td>
                <td className="text-center tabular-nums">{formatNilaiKurmer(data.asas)}</td>
                <td className="text-center font-bold tabular-nums">{formatNilaiKurmer(data.na)}</td>
                <td className="text-center">{data.predikat}</td>
              </tr>
            )
          })}
          <tr className="baris-jumlah">
            <td colSpan={2} className="text-right pr-2">
              Jumlah
            </td>
            <td colSpan={4} />
            <td className="text-center font-bold tabular-nums">{formatNilaiKurmer(jumlah)}</td>
            <td />
          </tr>
        </tbody>
      </table>
    </section>
  )
}

export function RaporKurmerCetakPanel({
  siswaOptions,
  idSiswa,
  onPilihSiswa,
  data,
  memuat,
  catatan,
  namaWali,
  niyWali,
  namaKepsek,
  menyimpan,
  status,
  onCatatan,
  onNamaWali,
  onNiyWali,
  onNamaKepsek,
  onSimpanCatatan,
}: {
  siswaOptions: { id_siswa: string; nama_siswa: string; nis: string }[]
  idSiswa: string
  onPilihSiswa: (id: string) => void
  data: DataCetakKurmer | null
  memuat: boolean
  catatan: string
  namaWali: string
  niyWali: string
  namaKepsek: string
  menyimpan: boolean
  status: string
  onCatatan: (teks: string) => void
  onNamaWali: (teks: string) => void
  onNiyWali: (teks: string) => void
  onNamaKepsek: (teks: string) => void
  onSimpanCatatan: () => void
}) {
  const tautanCetak =
    idSiswa && data
      ? `/rapor-kurmer/${encodeURIComponent(idSiswa)}?kelas=${encodeURIComponent(data.filter.kelas)}&asesmen=${data.filter.jenisAsesmen}&tahun=${encodeURIComponent(data.filter.tahunAjaran)}&semester=${data.filter.semester}`
      : ''

  return (
    <div className="space-y-4">
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm print:hidden">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-56 flex-1 text-xs font-bold text-slate-600">
            Pilih siswa
            <select
              value={idSiswa}
              onChange={(event) => onPilihSiswa(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            >
              <option value="">Pilih peserta didik</option>
              {siswaOptions.map((item) => (
                <option key={item.id_siswa} value={item.id_siswa}>
                  {item.nama_siswa} · NIS {item.nis || '—'}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Printer className="size-3.5" /> Cetak / PDF
          </button>
          {tautanCetak ? (
            <Link
              href={tautanCetak}
              className="inline-flex items-center rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
            >
              Buka lembar penuh
            </Link>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-xs font-bold text-slate-600 md:col-span-2">
            Catatan wali kelas
            <textarea
              value={catatan}
              onChange={(event) => onCatatan(event.target.value)}
              rows={3}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-medium"
              placeholder="Tuliskan catatan perkembangan, karakter, atau saran untuk orang tua."
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Nama guru kelas
            <input
              value={namaWali}
              onChange={(event) => onNamaWali(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            NIY guru kelas (cetak)
            <input
              value={niyWali}
              onChange={(event) => onNiyWali(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
              placeholder="Opsional · hanya di lembar cetak"
            />
          </label>
          <label className="text-xs font-bold text-slate-600 md:col-span-2">
            Nama kepala sekolah
            <input
              value={namaKepsek}
              onChange={(event) => onNamaKepsek(event.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm font-semibold"
            />
          </label>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onSimpanCatatan}
            disabled={!idSiswa || menyimpan}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-bold text-white disabled:opacity-50"
          >
            <Save className="size-3.5" /> {menyimpan ? 'Menyimpan…' : 'Simpan catatan'}
          </button>
          {status ? <p className="text-xs font-semibold text-emerald-700">{status}</p> : null}
        </div>
      </section>

      {memuat ? <p className="print:hidden py-8 text-center text-sm text-slate-500">Menyusun pratinjau rapor…</p> : null}
      {!memuat && idSiswa && !data ? (
        <p className="print:hidden py-8 text-center text-sm text-slate-500">Data rapor siswa belum dapat disusun.</p>
      ) : null}
      {data ? (
        <>
          <style>{GAYA_CETAK_RAPOR_KURMER}</style>
          <LembarRaporKurmer data={data} />
        </>
      ) : null}
    </div>
  )
}
