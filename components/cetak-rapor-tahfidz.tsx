'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { fetchCetakRaporTahfidz, type DataCetakRaporTahfidz } from '@/lib/cetak-rapor-tahfidz'
import { formatAngkaRapor } from '@/lib/rapor-tahfidz-nilai'

function garis(value: string, panjang = 22) {
  const teks = value.trim()
  return teks || '.'.repeat(panjang)
}

export const GAYA_CETAK_RAPOR_TAHFIDZ = `
  @page { size: 210mm 330mm; margin: 10mm 12mm; }
  .lembar-rapor { font-family: "Times New Roman", Times, serif; color: #000; }
  .lembar-rapor table { width: 100%; border-collapse: collapse; }
  .lembar-rapor .identitas td { padding: 1px 4px; vertical-align: middle; }
  .lembar-rapor .tabel-nilai th,
  .lembar-rapor .tabel-nilai td { border: 1px solid #000; padding: 3px 5px; vertical-align: middle; }
  .lembar-rapor .tabel-nilai thead th { background: #d9d9d9; font-weight: 700; text-align: center; }
  .lembar-rapor .tabel-catatan th,
  .lembar-rapor .tabel-catatan td { border: 1px solid #000; padding: 6px 8px; vertical-align: top; }
  .banner-biru { background: #1e40af !important; color: #fff !important; font-weight: 700; text-align: center; }
  .kotak-merah { background: #ef4444 !important; color: #fff !important; font-weight: 700; text-align: center; }
  .kotak-hijau { background: #22c55e !important; color: #000 !important; font-weight: 700; text-align: center; font-size: 18pt; }
  .nama-arab { font-family: var(--font-amiri), "Times New Roman", serif; font-size: 13pt; }
  .ttd-rapor td { border: none !important; text-align: center; vertical-align: top; width: 33.33%; }
  .ttd-rapor .ruang { height: 22mm; }
  @media print {
    body { background: #fff !important; }
    .lembar-rapor { box-shadow: none !important; margin: 0 !important; page-break-after: always; }
    .lembar-rapor:last-child { page-break-after: auto; }
    * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  }
`

export function CetakRaporTahfidzHalaman({ idSiswa, asesmen }: { idSiswa: string; asesmen?: string }) {
  const [data, setData] = useState<DataCetakRaporTahfidz | null>(null)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'kosong'>('memuat')
  const [siapKlien, setSiapKlien] = useState(false)

  useEffect(() => {
    setSiapKlien(true)
  }, [])

  useEffect(() => {
    if (!siapKlien) return
    let batal = false
    setStatus('memuat')
    fetchCetakRaporTahfidz(idSiswa, asesmen).then((hasil) => {
      if (batal) return
      setData(hasil)
      setStatus(hasil ? 'siap' : 'kosong')
    })
    return () => {
      batal = true
    }
  }, [idSiswa, asesmen, siapKlien])

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <style>{GAYA_CETAK_RAPOR_TAHFIDZ}</style>

      <div className="print:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-300 bg-[#143d32] px-4 py-3 text-white">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Pratinjau rapor tahfidz</p>
          <p className="text-sm font-extrabold">Kertas F4 · {asesmen || 'asesmen terbaru'}</p>
        </div>
        <div className="flex gap-2">
          <Link href="/" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold">
            <ArrowLeft className="size-3.5" /> Kembali
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            disabled={status !== 'siap'}
            className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 disabled:opacity-50"
          >
            <Printer className="size-3.5" /> Cetak Rapor
          </button>
        </div>
      </div>

      {status === 'memuat' && <p className="print:hidden py-16 text-center text-sm text-slate-600">Memuat rapor tahfidz…</p>}

      {status === 'kosong' && (
        <div className="print:hidden mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-base font-extrabold text-slate-800">Data siswa tidak ditemukan</p>
          <p className="mt-2 text-sm text-slate-500">
            ID <span className="font-mono">{idSiswa}</span> tidak ada di data siswa.
          </p>
        </div>
      )}

      {status === 'siap' && data && <LembarRaporTahfidz data={data} />}
    </div>
  )
}

export function LembarRaporTahfidz({ data }: { data: DataCetakRaporTahfidz }) {
  const { siswa } = data
  const namaSekolah = siswa.unit
    ? `SD ISLAM TERPADU AL MADINAH ${siswa.unit.toUpperCase()}`
    : 'SD ISLAM TERPADU AL MADINAH'
  const nisNisn = [siswa.nis, siswa.nisn].filter(Boolean).join('/') || '-'
  const tempatTanggal = `${data.lokasi}, ${data.tanggalCetak}`

  return (
    <article className="lembar-rapor mx-auto min-h-[330mm] max-w-[210mm] bg-white px-7 py-6 text-[11pt] leading-snug shadow-xl print:min-h-0 print:max-w-none print:px-0 print:py-0 print:shadow-none">
      <header className="text-center">
        <h1 className="text-[14pt] font-bold tracking-wide">RAPOR TAHFIZHUL QUR&apos;AN</h1>
        <p className="text-[14pt] font-bold">{data.judulAsesmen}</p>
        <p className="text-[14pt] font-bold">{namaSekolah}</p>
        <p className="text-[14pt] font-bold">{data.judulTahunAjaran}</p>
      </header>

      <table className="identitas mt-4 text-[11pt]">
        <tbody>
          <tr>
            <td className="w-[70px]">Nama</td>
            <td>: {siswa.nama || '-'}</td>
            <td className="w-[92px]">No. Absen</td>
            <td>: {siswa.noAbsen || '-'}</td>
          </tr>
          <tr>
            <td>Kelas</td>
            <td>: {siswa.kelasTampil || siswa.kelas || '-'}</td>
            <td>NIS/NISN</td>
            <td>: {nisNisn}</td>
          </tr>
        </tbody>
      </table>

      <table className="tabel-nilai mt-3 text-[10.5pt]">
        <thead>
          <tr>
            <th rowSpan={2} className="w-10">
              Juz
            </th>
            <th rowSpan={2} className="w-14">
              No. Surat
            </th>
            <th rowSpan={2}>Nama Surat</th>
            <th rowSpan={2} className="w-[88px]">
              السورة
            </th>
            <th colSpan={2}>Kelancaran</th>
            <th rowSpan={2} className="w-14">
              Tajwid
            </th>
            <th rowSpan={2} className="w-12">
              Adab
            </th>
            <th rowSpan={2} className="w-12">
              NA
            </th>
          </tr>
          <tr>
            <th className="w-[72px]">Kesalahan</th>
            <th className="w-14">Nilai</th>
          </tr>
        </thead>
        <tbody>
          {data.detail.length === 0 ? (
            <tr>
              <td colSpan={9} className="py-3 text-center">
                Nilai ujian belum diisi.
              </td>
            </tr>
          ) : (
            data.detail.map((row) => (
              <tr key={`${row.nomorSurat}-${row.namaSurat}`}>
                <td className="text-center">{row.juz || '-'}</td>
                <td className="text-center">{row.nomorSurat || '-'}</td>
                <td>
                  {row.namaSurat}
                  {row.rentangAyat ? ` (${row.rentangAyat})` : ''}
                </td>
                <td className="nama-arab text-right" dir="rtl">
                  {row.namaArab || '-'}
                </td>
                <td className="text-center">{row.kesalahanKelancaran}</td>
                <td className="text-center">{formatAngkaRapor(row.nilaiKelancaran)}</td>
                <td className="text-center">{formatAngkaRapor(row.nilaiTajwid)}</td>
                <td className="text-center">{formatAngkaRapor(row.nilaiAdab)}</td>
                <td className="text-center font-bold">{formatAngkaRapor(row.nilaiSurat)}</td>
              </tr>
            ))
          )}
          <tr>
            <td colSpan={3} className="banner-biru">
              NILAI RATA-RATA :
            </td>
            <td className="kotak-merah">{formatAngkaRapor(data.nilaiRataRata)}</td>
            <td colSpan={3} className="banner-biru">
              NILAI TARGET :
            </td>
            <td colSpan={2} className="kotak-merah">
              {formatAngkaRapor(data.nilaiTarget)}
            </td>
          </tr>
          <tr>
            <td colSpan={7} className="text-center font-bold">
              NILAI RAPOR : ((2 x Nilai Rata-Rata) + Nilai Target) / 3
            </td>
            <td colSpan={2} className="kotak-hijau">
              {formatAngkaRapor(data.nilaiRapor)}
            </td>
          </tr>
        </tbody>
      </table>

      <table className="tabel-catatan mt-4 text-[11pt]">
        <tbody>
          <tr>
            <th className="w-[210px] bg-[#d9d9d9] text-left font-normal">Catatan Kompetensi HQ :</th>
            <td>{data.capaianKompetensi || '-'}</td>
          </tr>
          <tr>
            <th className="text-left font-normal">Capaian Target Hafalan :</th>
            <td>{data.capaianTarget || '-'}</td>
          </tr>
          <tr>
            <th className="text-left font-normal">Motivasi :</th>
            <td>{data.motivasi || '-'}</td>
          </tr>
        </tbody>
      </table>

      <table className="ttd-rapor mt-8 text-[10.5pt]">
        <tbody>
          <tr>
            <td />
            <td />
            <td>{tempatTanggal}</td>
          </tr>
          <tr>
            <td>Orang Tua / Wali Siswa</td>
            <td>Ustadz Pembimbing / Wali Kelas</td>
            <td>Kepala Sekolah</td>
          </tr>
          <tr>
            <td className="ruang" />
            <td className="ruang" />
            <td className="ruang" />
          </tr>
          <tr>
            <td>
              <span className="font-bold underline">{'.'.repeat(22)}</span>
            </td>
            <td>
              <span className="font-bold underline">{garis(siswa.pembimbing)}</span>
            </td>
            <td>
              <span className="font-bold underline">{garis(data.kepsek.nama)}</span>
              {data.kepsek.niy ? (
                <>
                  <br />
                  NIY. {data.kepsek.niy}
                </>
              ) : null}
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  )
}
