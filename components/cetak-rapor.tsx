'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'
import { fetchRaporSiswa, type DataRapor } from '@/lib/rapor'

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

export function CetakRaporHalaman({ idSiswa }: { idSiswa: string }) {
  const [data, setData] = useState<DataRapor | null>(null)
  const [status, setStatus] = useState<'memuat' | 'siap' | 'kosong'>('memuat')
  const [siapKlien, setSiapKlien] = useState(false)

  useEffect(() => {
    setSiapKlien(true)
  }, [])

  useEffect(() => {
    if (!siapKlien) return
    let batal = false
    setStatus('memuat')
    fetchRaporSiswa(idSiswa).then((hasil) => {
      if (batal) return
      setData(hasil)
      setStatus(hasil ? 'siap' : 'kosong')
    })
    return () => {
      batal = true
    }
  }, [idSiswa, siapKlien])

  return (
    <div className="min-h-screen bg-slate-200 print:bg-white">
      <style>{`
        @page { size: 210mm 330mm; margin: 12mm 14mm; }
        .lembar-rapor { font-family: "Times New Roman", Times, serif; color: #111; }
        .lembar-rapor table { width: 100%; border-collapse: collapse; }
        .lembar-rapor .tabel-nilai th,
        .lembar-rapor .tabel-nilai td { border: 1px solid #111; padding: 5px 7px; }
        .ttd-rapor td { border: none !important; width: 50%; text-align: center; vertical-align: top; }
        .ttd-rapor .ruang { height: 26mm; }
        @media print {
          body { background: #fff !important; }
          .lembar-rapor { box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>

      <div className="print:hidden sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-slate-300 bg-[#143d32] px-4 py-3 text-white">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Cetak rapor</p>
          <p className="text-sm font-extrabold">Tahfidz &amp; Qiroah · kertas F4</p>
        </div>
        <div className="flex gap-2">
          <Link href="/report" className="inline-flex items-center gap-1 rounded-lg bg-white/15 px-3 py-2 text-xs font-bold">
            <ArrowLeft className="size-3.5" /> Pilih siswa
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

      {status === 'memuat' && (
        <p className="print:hidden py-16 text-center text-sm text-slate-600">Memuat data rapor siswa…</p>
      )}

      {status === 'kosong' && (
        <div className="print:hidden mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-base font-extrabold text-slate-800">Data siswa tidak ditemukan</p>
          <p className="mt-2 text-sm text-slate-500">
            ID <span className="font-mono">{idSiswa}</span> tidak ada di tabel <code>siswa</code>. Periksa kembali tautan
            rapor.
          </p>
          <Link href="/report" className="mt-4 inline-flex rounded-lg bg-[#143d32] px-4 py-2 text-xs font-bold text-white">
            Kembali ke daftar siswa
          </Link>
        </div>
      )}

      {status === 'siap' && data && <LembarRapor data={data} />}
    </div>
  )
}

function LembarRapor({ data }: { data: DataRapor }) {
  const { siswa } = data
  const tempatTanggal = `${data.lokasi}, ${data.tanggalCetak}`

  return (
    <article className="lembar-rapor mx-auto min-h-[330mm] max-w-[210mm] bg-white px-8 py-7 text-[12pt] leading-relaxed shadow-xl print:min-h-0 print:max-w-none print:shadow-none">
      <header className="border-b-4 border-double border-black pb-2 text-center">
        <p className="text-[10pt] font-bold tracking-wide">YAYASAN AL MADINAH</p>
        <p className="text-[13pt] font-bold">SD ISLAM TERPADU AL MADINAH</p>
        <p className="text-[10pt]">{siswa.unit ? `Unit ${siswa.unit}` : 'Program Tahfidzul Qur’an & Qiroatul Qur’an'}</p>
      </header>

      <div className="mt-4 text-center">
        <h1 className="text-[14pt] font-bold underline">RAPOR HAFALAN &amp; BACAAN AL-QUR’AN</h1>
        <p className="text-[11pt]">
          Semester {data.semester} · Tahun Ajaran {data.tahunAjaran}
        </p>
      </div>

      <section className="mt-5">
        <table className="text-[12pt]">
          <tbody>
            <BarisIdentitas label="Nama siswa" nilai={siswa.nama} />
            <BarisIdentitas label="NIS / NISN" nilai={[siswa.nis, siswa.nisn].filter(Boolean).join(' / ')} />
            <BarisIdentitas label="Kelas" nilai={siswa.kelas} />
            <BarisIdentitas label="Unit" nilai={siswa.unit} />
            <BarisIdentitas label="Semester" nilai={`${data.semester} ${data.tahunAjaran}`} />
            <BarisIdentitas label="Ustadz pembimbing" nilai={siswa.pembimbing} />
          </tbody>
        </table>
      </section>

      <section className="mt-5">
        <h2 className="mb-1 text-[12pt] font-bold">A. Capaian Tahfidzul Qur’an</h2>
        <p className="mb-2 text-[10.5pt]">
          Ziyadah terakhir: <strong>{data.ziyadahTerakhir || '-'}</strong>
          {' · '}
          Murojaah terakhir: <strong>{data.murojaahTerakhir || '-'}</strong>
        </p>
        <table className="tabel-nilai text-[11pt]">
          <thead>
            <tr>
              <th className="w-10">No</th>
              <th className="w-24">Juz / kelompok</th>
              <th>Capaian terakhir</th>
              <th className="w-20">Setoran</th>
              <th>Catatan ustadz</th>
            </tr>
          </thead>
          <tbody>
            {data.tahfidz.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center">
                  Belum ada setoran tahfidz.
                </td>
              </tr>
            ) : (
              data.tahfidz.map((row, index) => (
                <tr key={row.juz}>
                  <td className="text-center">{index + 1}</td>
                  <td className="text-center">{row.juz}</td>
                  <td>{row.capaian || '-'}</td>
                  <td className="text-center">{row.jumlah}</td>
                  <td>{row.catatan || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
        {data.catatanTahfidz && (
          <p className="mt-2 text-[10.5pt]">
            <strong>Catatan pembimbing:</strong> {data.catatanTahfidz}
          </p>
        )}
      </section>

      <section className="mt-5">
        <h2 className="mb-1 text-[12pt] font-bold">B. Capaian Qiroatul Qur’an</h2>
        <table className="tabel-nilai text-[11pt]">
          <thead>
            <tr>
              <th>Capaian terakhir</th>
              <th className="w-36">Target kelas</th>
              <th className="w-28">Status target</th>
              <th className="w-20">Setoran</th>
              <th>Catatan ustadz</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{data.qiroah.capaian}</td>
              <td className="text-center">{data.qiroah.target}</td>
              <td className="text-center">{data.qiroah.memenuhi ? 'Tercapai' : 'Belum tercapai'}</td>
              <td className="text-center">{data.qiroah.jumlah}</td>
              <td>{data.qiroah.catatan || '-'}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="mt-5">
        <h2 className="mb-1 text-[12pt] font-bold">C. Hasil ujian kenaikan jilid</h2>
        <table className="tabel-nilai text-[11pt]">
          <thead>
            <tr>
              <th className="w-10">No</th>
              <th>Tanggal</th>
              <th>Jilid asal</th>
              <th>Jilid tujuan</th>
              <th className="w-16">Nilai</th>
              <th>Predikat</th>
              <th>Keputusan</th>
            </tr>
          </thead>
          <tbody>
            {data.ujian.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center">
                  Belum ada hasil ujian kenaikan jilid.
                </td>
              </tr>
            ) : (
              data.ujian.map((row, index) => (
                <tr key={`${row.tanggal}-${row.jilidAsal}-${index}`}>
                  <td className="text-center">{index + 1}</td>
                  <td>{row.tanggal}</td>
                  <td>{row.jilidAsal || '-'}</td>
                  <td>{row.jilidTujuan || '-'}</td>
                  <td className="text-center">{row.nilai || '-'}</td>
                  <td className="text-center">{row.predikat || '-'}</td>
                  <td className="text-center">{row.keputusan || '-'}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>

      <table className="ttd-rapor mt-10 text-[11pt]">
        <tbody>
          <tr>
            <td>Mengetahui,</td>
            <td>{tempatTanggal}</td>
          </tr>
          <tr>
            <td>Ustadz Pembimbing</td>
            <td>Kepala Sekolah</td>
          </tr>
          <tr>
            <td className="ruang" />
            <td className="ruang" />
          </tr>
          <tr>
            <td>
              <span className="font-bold underline">{garis(siswa.pembimbing)}</span>
              <br />
              NIY. {garis(siswa.pembimbingNiy, 14)}
            </td>
            <td>
              <span className="font-bold underline">{garis(data.kepsek.nama)}</span>
              <br />
              NIY. {garis(data.kepsek.niy, 14)}
            </td>
          </tr>
        </tbody>
      </table>
    </article>
  )
}
