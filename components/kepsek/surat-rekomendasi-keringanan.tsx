'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { formatTanggalPanjang } from '@/lib/hari-kerja'
import { KEPALA_SEKOLAH } from '@/lib/kepala-sekolah'
import { formatWaktuKeringanan, rupiahKeringanan, teksPelunasanPengajuan, type PengajuanKeringanan } from '@/lib/pengajuan-keringanan'

const KOP = '/surat/kop-surat.jpg'
const STEMPEL = '/surat/stempel.png'
const TANDA_TANGAN = '/surat/tanda-tangan.png'
const SALAM_BUKA = "Assalamu'alaikum Warahmatullahi Wabarakatuh."
const SALAM_TUTUP = "Wassalamu'alaikum Warahmatullahi Wabarakatuh."

export function SuratRekomendasiKeringanan({
  pengajuan,
  onTutup,
}: {
  pengajuan: PengajuanKeringanan
  onTutup: () => void
}) {
  const [siap, setSiap] = useState(false)
  const tanggalSurat = formatTanggalPanjang(pengajuan.diputuskanPada ? new Date(pengajuan.diputuskanPada) : new Date())
  const tempat = pengajuan.unit && !/nogosari/i.test(pengajuan.unit) ? pengajuan.unit : 'Nogosari'

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
    document.title = ' '
    return () => {
      document.title = sebelumnya
    }
  }, [])

  if (!siap) return null

  return createPortal(
    <div className="overlay-surat-rekomendasi fixed inset-0 z-[120] overflow-auto bg-slate-200/90 p-4 print:bg-white print:p-0">
      <style>{`
        @page { size: 210mm 330mm; margin: 0; }
        .berkas-rekomendasi { font-family: "Times New Roman", Times, serif; color: #111; }
        .halaman-rekomendasi table { width: 100%; border-collapse: collapse; }
        .halaman-rekomendasi .meta td { vertical-align: top; padding: 1px 0; }
        .halaman-rekomendasi { background: #fff; }
        .pengesahan-rekomendasi {
          width: 76mm;
          margin: 7mm 2mm 0 auto;
          text-align: center;
          line-height: 1.15;
          position: relative;
        }
        .pengesahan-rekomendasi p { margin: 0; }
        .pengesahan-rekomendasi .ruang-ttd { position: relative; height: 30mm; }
        .pengesahan-rekomendasi .gambar-ttd,
        .pengesahan-rekomendasi .gambar-stempel {
          position: absolute;
          height: auto;
          max-width: none;
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        .pengesahan-rekomendasi .gambar-ttd {
          left: 50%;
          bottom: 0;
          width: 42mm;
          transform: translate(-50%, 0);
          z-index: 3;
        }
        .pengesahan-rekomendasi .gambar-stempel {
          left: 40%;
          bottom: 0;
          width: 26mm;
          transform: translate(-100%, 0);
          z-index: 2;
        }
        .pengesahan-rekomendasi .nama-kepsek,
        .pengesahan-rekomendasi .niy-kepsek { position: relative; z-index: 4; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; padding: 0 !important; height: auto !important; overflow: visible !important; }
          body > *:not(.overlay-surat-rekomendasi) { display: none !important; }
          .overlay-surat-rekomendasi { position: static !important; background: #fff !important; padding: 0 !important; overflow: visible !important; }
          .no-print { display: none !important; }
          .halaman-rekomendasi { box-shadow: none !important; margin: 0 !important; width: 210mm; min-height: 0 !important; padding: 12mm 15mm !important; }
        }
      `}</style>

      <div className="no-print fixed left-4 top-4 z-[130] flex gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-md ring-1 ring-slate-200"
        >
          <Printer className="size-3.5" /> Cetak / Unduh PDF
        </button>
        <button type="button" onClick={onTutup} className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-md">
          <X className="size-3.5" /> Tutup
        </button>
      </div>

      <article className="berkas-rekomendasi halaman-rekomendasi mx-auto min-h-[330mm] max-w-[210mm] bg-white px-[15mm] py-[15mm] text-[12pt] leading-[1.55] shadow-xl print:shadow-none">
        <header className="text-center">
          <img src={KOP} alt="Kop surat SD Islam Terpadu Al Madinah" className="mx-auto block w-full max-w-[180mm]" />
        </header>

        <table className="meta mt-6 w-full text-[12pt]">
          <tbody>
            <tr>
              <td className="w-[5.4rem]">Nomor</td>
              <td className="w-3">:</td>
              <td>{pengajuan.nomorSuratRekomendasi || '-'}</td>
            </tr>
            <tr>
              <td>Lampiran</td>
              <td>:</td>
              <td>-</td>
            </tr>
            <tr>
              <td>Perihal</td>
              <td>:</td>
              <td>
                <span className="font-bold underline">Persetujuan Keringanan / Penundaan Pembayaran</span>
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-6">
          <p>Kepada</p>
          <p>Yth. Wali Murid dari Ananda {pengajuan.namaSiswa}</p>
          <p>
            (Kelas {pengajuan.kelas || '-'}, NIS {pengajuan.nis})
          </p>
          <p>di tempat</p>
        </div>

        <p className="mt-5">{SALAM_BUKA}</p>
        <p className="mt-3 text-justify">Dengan hormat,</p>
        <p className="mt-3 text-justify">
          Menindaklanjuti surat pemberitahuan tunggakan nomor <strong>{pengajuan.nomorSurat}</strong> dan permohonan yang
          diajukan wali murid, Kepala Sekolah memberikan persetujuan keringanan / penundaan pelunasan bagi Ananda{' '}
          <strong>{pengajuan.namaSiswa}</strong> (Kelas {pengajuan.kelas || '-'}, NIS {pengajuan.nis}).
        </p>

        <table className="meta my-3 ml-6 w-[calc(100%-1.5rem)] text-[12pt]">
          <tbody>
            <tr>
              <td className="w-[9.2rem]">Akumulasi tunggakan</td>
              <td className="w-3">:</td>
              <td>{rupiahKeringanan(pengajuan.nominalTunggakan)}</td>
            </tr>
            <tr>
              <td>Kesanggupan pelunasan</td>
              <td>:</td>
              <td>{teksPelunasanPengajuan(pengajuan)}</td>
            </tr>
            <tr>
              <td>Target pelunasan</td>
              <td>:</td>
              <td>{formatWaktuKeringanan(pengajuan.tanggalRencanaLunas)}</td>
            </tr>
          </tbody>
        </table>

        <p className="text-justify">
          Persetujuan ini berlaku sepanjang komitmen di atas dipenuhi pada target waktu tersebut. Apabila sampai batas waktu
          itu pelunasan belum diterima, administrasi keuangan kembali mengikuti ketentuan sekolah.
        </p>
        <p className="mt-3 text-justify">
          Demikian surat rekomendasi ini dibuat untuk dipergunakan sebagaimana mestinya. Atas perhatian dan kerja sama
          Bapak/Ibu, kami ucapkan terima kasih.
        </p>
        <p className="mt-3">{SALAM_TUTUP}</p>

        <div className="pengesahan-rekomendasi">
          <p>
            {tempat}, {tanggalSurat}
          </p>
          <p>Kepala Sekolah</p>
          <div className="ruang-ttd">
            <img className="gambar-stempel" src={STEMPEL} alt="" />
            <img className="gambar-ttd" src={TANDA_TANGAN} alt="Tanda tangan Kepala Sekolah" />
          </div>
          <p className="nama-kepsek font-bold underline">{KEPALA_SEKOLAH.nama}</p>
          <p className="niy-kepsek">NIY. {KEPALA_SEKOLAH.niy}</p>
        </div>
      </article>
    </div>,
    document.body,
  )
}
