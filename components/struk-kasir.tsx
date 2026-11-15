'use client'

import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import {
  identitasSekolahUnit,
  labelAkunKas,
  labelRincianItem,
  nisTampilSiswa,
  rupiahKas,
  type BarisAkun,
  type TransaksiKas,
} from '@/lib/kasir'

function tanggalStruk(nilai: string) {
  const bagian = String(nilai || '').slice(0, 10).split('-')
  if (bagian.length !== 3) return nilai
  return `${bagian[2]}/${bagian[1]}/${bagian[0]}`
}

export function StrukKasir({
  transaksi,
  namaKasir,
  daftarAkun = [],
  onTutup,
}: {
  transaksi: TransaksiKas
  namaKasir?: string
  daftarAkun?: BarisAkun[]
  onTutup: () => void
}) {
  const sekolah = identitasSekolahUnit(transaksi.unit)
  const items = transaksi.items.length > 0 ? transaksi.items : [{ kode_akun: transaksi.kode_akun, nominal: transaksi.nominal }]
  const nis = transaksi.nis || nisTampilSiswa({ id_siswa: transaksi.id_siswa || '', nis: transaksi.nis || '', nama_siswa: transaksi.nama_siswa || '' })
  const kasir = namaKasir || transaksi.dicatat_oleh || 'Kasir'

  useEffect(() => {
    const sebelumnya = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = sebelumnya
    }
  }, [])

  return createPortal(
    <div className="overlay-struk-kasir fixed inset-0 z-[130] overflow-auto bg-slate-900/50 p-4 print:bg-white print:p-0">
      <style>{`
        @page { size: 80mm auto; margin: 4mm 3mm; }
        .kertas-struk {
          width: 76mm;
          margin: 0 auto;
          background: #fff;
          color: #111;
          font-family: ui-monospace, "Courier New", Courier, monospace;
          font-size: 11px;
          line-height: 1.35;
        }
        .kertas-struk h1, .kertas-struk h2, .kertas-struk p { margin: 0; }
        .kertas-struk table { width: 100%; border-collapse: collapse; }
        .kertas-struk .garis { border-top: 1px dashed #111; margin: 6px 0; }
        .kertas-struk .kanan { text-align: right; }
        .kertas-struk .tengah { text-align: center; }
        @media print {
          html, body { background: #fff !important; margin: 0 !important; }
          body > *:not(.overlay-struk-kasir) { display: none !important; }
          .overlay-struk-kasir {
            position: static !important;
            background: #fff !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .aksi-struk { display: none !important; }
        }
      `}</style>

      <div className="aksi-struk mx-auto mb-3 flex max-w-sm justify-end gap-2 print:hidden">
        <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-3 py-2 text-xs font-bold text-white">
          <Printer className="size-3.5" /> Cetak
        </button>
        <button type="button" onClick={onTutup} className="inline-flex items-center gap-1 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700">
          <X className="size-3.5" /> Tutup
        </button>
      </div>

      <article className="kertas-struk rounded-lg p-3 shadow-lg print:rounded-none print:shadow-none">
        <header className="tengah">
          <p className="text-[10px] font-bold uppercase tracking-wide">{sekolah.yayasan}</p>
          <h1 className="text-sm font-black">{sekolah.sekolah}</h1>
          <p className="text-[10px]">Unit {sekolah.unit} · {sekolah.kota}</p>
          <p className="mt-1 text-[11px] font-bold">BUKTI PEMBAYARAN</p>
        </header>
        <div className="garis" />
        <table>
          <tbody>
            <tr><td>No. Pembayaran</td><td className="kanan font-bold">{transaksi.nomor_bukti}</td></tr>
            <tr><td>Tanggal</td><td className="kanan">{tanggalStruk(transaksi.tanggal)}</td></tr>
            <tr><td>Kasir</td><td className="kanan">{kasir}</td></tr>
            <tr><td>Kas/Bank</td><td className="kanan">{labelAkunKas(transaksi.akun_kas_bank)}</td></tr>
          </tbody>
        </table>
        <div className="garis" />
        <p className="font-bold">Siswa</p>
        {transaksi.nama_siswa ? (
          <>
            <p>NIS: {nis || '-'}</p>
            <p>{transaksi.nama_siswa}</p>
          </>
        ) : (
          <p>Umum / tidak terkait siswa</p>
        )}
        <div className="garis" />
        <table>
          <thead>
            <tr>
              <th className="text-left">Rincian</th>
              <th className="kanan">Nominal</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, indeks) => (
              <tr key={`${item.kode_akun}-${item.nominal}-${indeks}`}>
                <td>{labelRincianItem(item, daftarAkun)}</td>
                <td className="kanan">{rupiahKas(item.nominal)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="garis" />
        <p className="flex justify-between font-black">
          <span>TOTAL</span>
          <span>{rupiahKas(transaksi.nominal)}</span>
        </p>
        {transaksi.uraian && transaksi.uraian !== '-' ? (
          <>
            <div className="garis" />
            <p className="text-[10px]">{transaksi.uraian}</p>
          </>
        ) : null}
        <div className="garis" />
        <p className="tengah text-[10px]">Bukti ini sah sebagai kuitansi pembayaran.</p>
        <p className="tengah text-[10px]">Simpan struk ini sebagai arsip wali murid.</p>
        <div className="mt-3 flex justify-between text-[10px]">
          <div className="tengah w-[46%]">
            <p>Penerima</p>
            <p className="mt-8">(&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;)</p>
          </div>
          <div className="tengah w-[46%]">
            <p>Kasir</p>
            <p className="mt-8">({kasir})</p>
          </div>
        </div>
        <p className="tengah mt-3 text-[10px]">Barakallahu fiikum</p>
      </article>
    </div>,
    document.body,
  )
}

export function TombolCetakStruk({
  onKlik,
}: {
  onKlik: () => void
}) {
  return (
    <button type="button" onClick={onKlik} className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-bold text-emerald-900">
      <Printer className="size-3.5" /> Cetak Struk
    </button>
  )
}
