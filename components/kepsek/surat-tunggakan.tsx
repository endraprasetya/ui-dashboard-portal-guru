'use client'

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { labelTapel } from '@/lib/ampss-urai'
import {
  angkaNomorSurat,
  formatHariTanggal,
  formatTanggalPanjang,
  nomorSuratTunggakan,
  tambahHariKerja,
} from '@/lib/hari-kerja'
import { KEPALA_SEKOLAH } from '@/lib/kepala-sekolah'
import type { DetailTunggakan, SiswaTunggakan } from '@/lib/keuangan-tipe'

const TEMPAT_TEMU = 'Ruang Kepala Sekolah SDIP Al Madinah Putra Jengglong'
const JAM_TEMU = '09.00 - 10.00 WIB'
const KOP = '/surat/kop-surat.jpg'
const TTD_STEMPEL = '/surat/ttd-stempel.jpg'
const SALAM_BUKA = "Assalamu'alaikum Warahmatullahi Wabarakatuh."
const SALAM_TUTUP = "Wassalamu'alaikum Warahmatullahi Wabarakatuh."

function rupiah(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai)
}

export function SuratTunggakan({
  siswa,
  onTutup,
}: {
  siswa: Pick<SiswaTunggakan, 'nis' | 'nama' | 'kelas' | 'tunggakan'>
  onTutup: () => void
}) {
  const [siapPortal, setSiapPortal] = useState(false)
  const [nomor, setNomor] = useState('')
  const [siapCetak, setSiapCetak] = useState(false)
  const [detail, setDetail] = useState<DetailTunggakan | null>(null)
  const [galat, setGalat] = useState('')
  const inputNomor = useRef<HTMLInputElement>(null)
  const saatBuka = useMemo(() => new Date(), [])
  const tanggalSurat = formatTanggalPanjang(saatBuka)
  const tanggalTemu = formatHariTanggal(tambahHariKerja(saatBuka, 2))
  const angkaNomor = angkaNomorSurat(nomor)
  const nomorPakai = angkaNomor ? nomorSuratTunggakan(angkaNomor, saatBuka) : ''
  const contohCetak = nomorSuratTunggakan('616', saatBuka)
  const total = detail?.tunggakan ?? siswa.tunggakan
  const rincian = detail?.rincian || []
  const adaLampiran = rincian.length > 0

  useEffect(() => {
    setSiapPortal(true)
  }, [])

  useEffect(() => {
    if (!siapPortal || siapCetak) return
    inputNomor.current?.focus()
  }, [siapPortal, siapCetak])

  useEffect(() => {
    if (!siapCetak) return
    const sebelumnya = document.title
    document.title = ' '
    return () => {
      document.title = sebelumnya
    }
  }, [siapCetak])

  useEffect(() => {
    const tutup = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onTutup()
    }
    window.addEventListener('keydown', tutup)
    return () => window.removeEventListener('keydown', tutup)
  }, [onTutup])

  useEffect(() => {
    let batal = false
    fetch(`/api/kepsek/keuangan/${encodeURIComponent(siswa.nis)}`)
      .then(async (respon) => {
        const json = await respon.json()
        if (!respon.ok) throw new Error(json.pesan || 'Rincian tagihan belum dapat dimuat.')
        if (!batal) setDetail(json as DetailTunggakan)
      })
      .catch((error: Error) => {
        if (!batal) setGalat(error.message || 'Rincian tagihan belum dapat dilampirkan.')
      })
    return () => {
      batal = true
    }
  }, [siswa.nis])

  const lanjutCetak = (event: FormEvent) => {
    event.preventDefault()
    if (!angkaNomor) {
      inputNomor.current?.focus()
      return
    }
    setSiapCetak(true)
  }

  if (!siapPortal) return null

  if (!siapCetak) {
    return createPortal(
      <div className="fixed inset-0 z-[120] grid place-items-center bg-slate-900/50 p-4" onClick={onTutup}>
        <form
          role="dialog"
          aria-modal="true"
          aria-labelledby="judul-nomor-surat"
          className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
          onClick={(event) => event.stopPropagation()}
          onSubmit={lanjutCetak}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="judul-nomor-surat" className="text-sm font-extrabold text-slate-900">Nomor Surat</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Ananda {siswa.nama} · Kelas {siswa.kelas || '-'} · NIS {siswa.nis}
              </p>
            </div>
            <button type="button" onClick={onTutup} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">
              <X className="size-4" />
            </button>
          </div>
          <label className="mt-4 block text-xs font-bold text-slate-700">
            Angka nomor surat
            <input
              ref={inputNomor}
              value={nomor}
              onChange={(event) => setNomor(angkaNomorSurat(event.target.value))}
              placeholder="616"
              inputMode="numeric"
              pattern="[0-9]+"
              autoComplete="off"
              required
              className="mt-1.5 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm font-semibold tracking-wide text-slate-900 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20"
            />
          </label>
          <p className="mt-1.5 text-[11px] text-slate-500">
            Cukup isi angkanya. Yang tercetak:{' '}
            <span className="font-semibold text-slate-700">{nomorPakai || contohCetak}</span>
          </p>
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onTutup} className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              Batal
            </button>
            <button
              type="submit"
              disabled={!angkaNomor}
              className="rounded-xl bg-[#143d32] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#1b4d40] disabled:opacity-40"
            >
              Lanjut
            </button>
          </div>
        </form>
      </div>,
      document.body,
    )
  }

  return createPortal(
    <div className="overlay-surat-tunggakan fixed inset-0 z-[120] overflow-auto bg-slate-200/90 p-4 print:bg-white print:p-0">
      <style>{`
        @page { size: F4 portrait; margin: 0; }
        .berkas-surat { font-family: "Times New Roman", Times, serif; color: #111; }
        .halaman-surat table { width: 100%; border-collapse: collapse; }
        .halaman-surat .meta td { vertical-align: top; padding: 1px 0; }
        .halaman-surat .rincian th,
        .halaman-surat .rincian td { border: 1px solid #111; padding: 4px 6px; font-size: 10.5pt; }
        .halaman-surat { background: #fff; isolation: isolate; }
        .pengesahan-surat {
          width: 54mm;
          margin: 7mm 14mm 0 auto;
          text-align: center;
          line-height: 1.1;
          position: relative;
          isolation: isolate;
          background: #fff;
        }
        .pengesahan-surat p { margin: 0; }
        .pengesahan-surat .area-ttd { position: relative; }
        .pengesahan-surat .baris-jabatan { margin-bottom: 9mm; }
        .pengesahan-surat .baris-tempat,
        .pengesahan-surat .baris-jabatan { position: relative; z-index: 1; }
        .pengesahan-surat .gambar-ttd {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 44mm;
          height: auto;
          transform: translate(-50%, -64%);
          z-index: 2;
          pointer-events: none;
          mix-blend-mode: multiply;
        }
        .pengesahan-surat .nama-kepsek,
        .pengesahan-surat .niy-kepsek { position: relative; z-index: 3; }
        .halaman-inti { break-after: page; page-break-after: always; }
        .halaman-lampiran { break-before: page; page-break-before: always; }
        .halaman-surat:last-child { break-after: auto; page-break-after: auto; }
        @media print {
          html, body {
            background: #fff !important;
            margin: 0 !important;
            padding: 0 !important;
            height: auto !important;
            overflow: visible !important;
          }
          body > *:not(.overlay-surat-tunggakan) { display: none !important; }
          .overlay-surat-tunggakan {
            position: static !important;
            inset: auto !important;
            background: #fff !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          .berkas-surat { max-width: none; margin: 0; }
          .halaman-surat {
            box-shadow: none !important;
            margin: 0 auto !important;
            max-width: none;
            width: 210mm;
            min-height: 330mm !important;
            padding: 15mm !important;
            box-sizing: border-box;
          }
        }
      `}</style>

      <div className="no-print fixed left-4 top-4 z-[130] flex gap-2">
        <button
          type="button"
          onClick={() => {
            const sebelumnya = document.title
            document.title = ' '
            window.print()
            document.title = sebelumnya
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-white px-3 py-2 text-xs font-bold text-slate-900 shadow-md ring-1 ring-slate-200"
        >
          <Printer className="size-3.5" /> Cetak / Unduh PDF
        </button>
        <button
          type="button"
          onClick={onTutup}
          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-white shadow-md"
        >
          <X className="size-3.5" /> Tutup
        </button>
      </div>

      <div className="berkas-surat mx-auto max-w-[210mm] space-y-6 print:space-y-0">
        <article className={`halaman-surat mx-auto min-h-[330mm] max-w-[210mm] bg-white px-[15mm] py-[15mm] text-[12pt] leading-[1.55] shadow-xl print:shadow-none ${adaLampiran ? 'halaman-inti' : ''}`}>
          <header className="text-center">
            <img src={KOP} alt="Kop surat SD Islam Terpadu Al Madinah Nogosari" className="mx-auto block w-full max-w-[180mm]" />
          </header>

          <table className="meta mt-6 w-full text-[12pt]">
            <tbody>
              <tr>
                <td className="w-[5.4rem]">Nomor</td>
                <td className="w-3">:</td>
                <td>{nomorPakai}</td>
              </tr>
              <tr>
                <td>Lampiran</td>
                <td>:</td>
                <td>{adaLampiran ? '1 (satu) lembar' : '-'}</td>
              </tr>
              <tr>
                <td>Perihal</td>
                <td>:</td>
                <td>
                  <span className="font-bold underline">Pemberitahuan Tunggakan Pembayaran</span>
                </td>
              </tr>
            </tbody>
          </table>

          <div className="mt-6">
            <p>Kepada</p>
            <p>Yth. Wali Murid dari Ananda {siswa.nama}</p>
            <p>
              (Kelas {siswa.kelas || '-'}, NIS {siswa.nis})
            </p>
            <p>di tempat</p>
          </div>

          <p className="mt-5">{SALAM_BUKA}</p>
          <p className="mt-3 text-justify">Dengan hormat,</p>
          <p className="mt-3 text-justify">
            Berdasarkan catatan administrasi keuangan sekolah hingga bulan berjalan, kami sampaikan bahwa Ananda{' '}
            <strong>{siswa.nama}</strong> (Kelas {siswa.kelas || '-'}, NIS {siswa.nis}) memiliki akumulasi tunggakan sebesar{' '}
            <strong>{rupiah(total)}</strong> (rincian terlampir).
          </p>
          <p className="mt-3 text-justify">
            Oleh karena itu, kami memohon kehadiran Bapak/Ibu wali murid pada:
          </p>

          <table className="meta my-3 ml-6 w-[calc(100%-1.5rem)] text-[12pt]">
            <tbody>
              <tr>
                <td className="w-[7.5rem]">Hari/Tanggal</td>
                <td className="w-3">:</td>
                <td>{tanggalTemu}</td>
              </tr>
              <tr>
                <td>Waktu</td>
                <td>:</td>
                <td>{JAM_TEMU}</td>
              </tr>
              <tr>
                <td>Tempat</td>
                <td>:</td>
                <td>{TEMPAT_TEMU}</td>
              </tr>
              <tr>
                <td>Keperluan</td>
                <td>:</td>
                <td>Koordinasi penyelesaian administrasi keuangan</td>
              </tr>
            </tbody>
          </table>

          <p className="text-justify">
            Demikian surat pemberitahuan ini kami sampaikan. Atas perhatian dan kerja sama Bapak/Ibu, kami ucapkan terima kasih.
          </p>
          <p className="mt-3">{SALAM_TUTUP}</p>

          <div className="pengesahan-surat">
            <p className="baris-tempat">Nogosari, {tanggalSurat}</p>
            <div className="area-ttd">
              <p className="baris-jabatan">Kepala Sekolah</p>
              <p className="nama-kepsek font-bold underline">{KEPALA_SEKOLAH.nama}</p>
              <img className="gambar-ttd" src={TTD_STEMPEL} alt="Stempel resmi dan tanda tangan Kepala Sekolah" />
            </div>
            <p className="niy-kepsek">NIY. {KEPALA_SEKOLAH.niy}</p>
          </div>
        </article>

        {adaLampiran && (
          <article className="halaman-surat halaman-lampiran mx-auto min-h-[330mm] max-w-[210mm] bg-white px-[15mm] py-[15mm] text-[12pt] leading-[1.55] shadow-xl print:shadow-none">
            <p className="text-center text-[13pt] font-bold underline">Lampiran Rincian Tunggakan</p>
            <p className="mt-1 text-center text-[11pt]">
              Ananda {siswa.nama} · Kelas {siswa.kelas || '-'} · NIS {siswa.nis}
            </p>
            <p className="mt-1 text-center text-[10.5pt]">Nomor surat {nomorPakai}</p>
            <table className="rincian mt-5">
              <thead>
                <tr>
                  <th className="w-8">No</th>
                  <th>Tahun</th>
                  <th>Tagihan</th>
                  <th className="w-36">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {rincian.map((item, indeks) => (
                  <tr key={`${item.tapel}-${item.kode}-${item.jumlah}-${indeks}`}>
                    <td className="text-center">{indeks + 1}</td>
                    <td>{labelTapel(item.tapel)}</td>
                    <td>
                      {item.item}
                      {item.tagihanAwal != null && item.terbayar != null ? (
                        <span className="block text-[9.5pt]">
                          Tagihan {rupiah(item.tagihanAwal)} · terbayar {rupiah(item.terbayar)}
                        </span>
                      ) : null}
                    </td>
                    <td className="text-right">{rupiah(item.jumlah)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <th colSpan={3} className="text-right">Total tunggakan</th>
                  <th className="text-right">{rupiah(total)}</th>
                </tr>
              </tfoot>
            </table>
          </article>
        )}

        {galat && <p className="no-print mt-4 text-sm text-amber-800">{galat}</p>}
      </div>
    </div>,
    document.body,
  )
}
