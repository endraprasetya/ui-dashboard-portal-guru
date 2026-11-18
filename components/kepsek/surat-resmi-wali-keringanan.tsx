'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { formatTanggalPanjang } from '@/lib/hari-kerja'
import {
  formatWaktuKeringanan,
  isiSuratResmiUtama,
  KLAUSUL_SURAT_RESMI_WALI,
  rupiahKeringanan,
  tanggalSuratResmiWali,
  type PengajuanKeringanan,
} from '@/lib/pengajuan-keringanan'

const KOP = '/surat/kop-surat.jpg'

export function SuratResmiWaliKeringanan({
  pengajuan,
  onTutup,
}: {
  pengajuan: PengajuanKeringanan
  onTutup: () => void
}) {
  const [siap, setSiap] = useState(false)
  const tanggalAcuan = tanggalSuratResmiWali(pengajuan)
  const tanggalSurat = formatTanggalPanjang(tanggalAcuan ? new Date(tanggalAcuan) : new Date())
  const tempat = pengajuan.unit && !/nogosari/i.test(pengajuan.unit) ? pengajuan.unit : 'Nogosari'
  const isi = isiSuratResmiUtama(pengajuan)

  useEffect(() => {
    setSiap(true)
  }, [])

  useEffect(() => {
    const tutup = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTutup()
    }
    window.addEventListener('keydown', tutup)
    return () => window.removeEventListener('keydown', tutup)
  }, [onTutup])

  useEffect(() => {
    const sebelumnya = document.title
    document.title = 'Surat Pernyataan Wali Murid'
    return () => {
      document.title = sebelumnya
    }
  }, [])

  if (!siap) return null

  return createPortal(
    <div className="overlay-surat-resmi-wali fixed inset-0 z-[125] overflow-auto bg-slate-200/90 p-4 print:bg-white print:p-0">
      <style>{`
        @page { size: 210mm 330mm; margin: 0; }
        .berkas-resmi-wali { font-family: "Times New Roman", Times, serif; color: #111; }
        .halaman-resmi-wali table { width: 100%; border-collapse: collapse; }
        .halaman-resmi-wali .meta td,
        .halaman-resmi-wali .identitas td { vertical-align: top; padding: 3px 0; }
        .halaman-resmi-wali .identitas td.baris-label { width: 9.5rem; font-weight: 600; }
        .halaman-resmi-wali .identitas td.baris-pisah { width: 0.75rem; }
        .halaman-resmi-wali { background: #fff; }
        .isi-surat-resmi { white-space: pre-wrap; text-align: justify; }
        .klausul-resmi {
          border: 1px solid #333;
          padding: 8px 10px;
          margin-top: 12px;
          font-style: italic;
          text-align: justify;
        }
        .ttd-wali { margin-top: 14mm; width: 58mm; text-align: center; margin-left: auto; margin-right: 8mm; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
          body > *:not(.overlay-surat-resmi-wali) { display: none !important; }
          .overlay-surat-resmi-wali { position: static !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
          .no-print { display: none !important; }
          .halaman-resmi-wali { box-shadow: none !important; margin: 0 !important; width: 210mm; min-height: 0 !important; padding: 12mm 15mm !important; }
        }
      `}</style>

      <div className="no-print fixed left-4 top-4 z-[130] flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-md ring-1 ring-slate-200"
        >
          <Printer className="size-3.5" /> Cetak / Print
        </button>
        <button
          type="button"
          onClick={onTutup}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-md"
        >
          <X className="size-3.5" /> Tutup
        </button>
      </div>

      <article className="berkas-resmi-wali halaman-resmi-wali mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[15mm] py-[15mm] text-[12pt] leading-[1.55] shadow-xl print:shadow-none">
        <header className="text-center">
          <img src={KOP} alt="Kop surat SD Islam Terpadu Al Madinah" className="mx-auto block w-full max-w-[180mm]" />
        </header>

        <div className="mt-6 text-center">
          <h1 className="text-[13pt] font-bold uppercase tracking-wide underline">Surat Pernyataan Wali Murid</h1>
          <p className="mt-1 text-[11pt] font-semibold">Permohonan Keringanan / Penundaan Pembayaran</p>
        </div>

        <p className="mt-6 text-justify">
          Yang bertanda tangan di bawah ini, wali murid dari ananda berikut, dengan ini menyampaikan permohonan keringanan atau
          penundaan pembayaran kepada pihak sekolah.
        </p>

        <table className="identitas meta mt-4 ml-2 text-[12pt]">
          <tbody>
            <tr>
              <td className="baris-label">Nama siswa</td>
              <td className="baris-pisah">:</td>
              <td className="font-bold">{pengajuan.namaSiswa}</td>
            </tr>
            <tr>
              <td className="baris-label">NIS / Kelas</td>
              <td className="baris-pisah">:</td>
              <td>
                {pengajuan.nis}
                {pengajuan.kelas ? ` · Kelas ${pengajuan.kelas}` : ''}
              </td>
            </tr>
            <tr>
              <td className="baris-label">Unit sekolah</td>
              <td className="baris-pisah">:</td>
              <td>{pengajuan.unit || '—'}</td>
            </tr>
            <tr>
              <td className="baris-label">Nomor surat tunggakan</td>
              <td className="baris-pisah">:</td>
              <td>{pengajuan.nomorSurat || '—'}</td>
            </tr>
            <tr>
              <td className="baris-label">Akumulasi tunggakan</td>
              <td className="baris-pisah">:</td>
              <td className="font-bold">{rupiahKeringanan(pengajuan.nominalTunggakan)}</td>
            </tr>
            <tr>
              <td className="baris-label">Target pelunasan</td>
              <td className="baris-pisah">:</td>
              <td>{formatWaktuKeringanan(pengajuan.tanggalRencanaLunas)}</td>
            </tr>
            {pengajuan.suratResmiDikirimPada ? (
              <tr>
                <td className="baris-label">Surat diajukan</td>
                <td className="baris-pisah">:</td>
                <td>{formatWaktuKeringanan(pengajuan.suratResmiDikirimPada)}</td>
              </tr>
            ) : null}
          </tbody>
        </table>

        <div className="mt-5">
          <p className="font-bold">Isi pernyataan:</p>
          <p className="isi-surat-resmi mt-2">{isi}</p>
        </div>

        <div className="klausul-resmi">
          <p className="m-0 font-bold not-italic">Klausul pernyataan:</p>
          <p className="m-0 mt-1">{KLAUSUL_SURAT_RESMI_WALI}</p>
        </div>

        <p className="ttd-wali">
          {tempat}, {tanggalSurat}
          <span className="mt-10 block">Wali Murid,</span>
          <span className="mt-14 block border-b border-black" />
          <span className="mt-1 block text-[11pt]">(materai dan tanda tangan)</span>
        </p>
      </article>
    </div>,
    document.body,
  )
}