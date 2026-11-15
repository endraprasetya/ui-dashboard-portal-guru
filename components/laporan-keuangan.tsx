'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Landmark, Wallet } from 'lucide-react'
import { rupiahKas } from '@/lib/kasir'
import { todayInputValue } from '@/lib/jurnal'
import { susunLaporanKeuangan, type ArusKas, type NeracaKas, type RealisasiAnggaran } from '@/lib/laporan-kas'

type TabLaporan = 'arus' | 'realisasi' | 'neraca'

export function LaporanKeuangan({
  unit,
  judul = 'Laporan keuangan unit',
  segar = 0,
}: {
  unit?: string
  judul?: string
  segar?: number
}) {
  const [tab, setTab] = useState<TabLaporan>('arus')
  const [periode, setPeriode] = useState(todayInputValue().slice(0, 7))
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [arus, setArus] = useState<ArusKas | null>(null)
  const [realisasi, setRealisasi] = useState<RealisasiAnggaran | null>(null)
  const [neraca, setNeraca] = useState<NeracaKas | null>(null)

  useEffect(() => {
    let batal = false
    setMemuat(true)
    setGalat('')
    susunLaporanKeuangan(unit, periode)
      .then((hasil) => {
        if (batal) return
        setArus(hasil.arus)
        setRealisasi(hasil.realisasi)
        setNeraca(hasil.neraca)
      })
      .catch((error: Error) => {
        if (!batal) setGalat(error.message || 'Laporan belum dapat disusun.')
      })
      .finally(() => {
        if (!batal) setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [unit, periode, segar])

  const tombol = (id: TabLaporan, label: string) => (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`inline-flex items-center gap-1 rounded-xl px-3 py-2 text-xs font-bold ${tab === id ? 'bg-emerald-700 text-white' : 'border border-slate-200 bg-white text-slate-600'}`}
    >
      {id === 'arus' ? <Wallet className="size-3.5" /> : id === 'realisasi' ? <BookOpen className="size-3.5" /> : <Landmark className="size-3.5" />}
      {label}
    </button>
  )

  return (
    <section id="laporan-keuangan" className="space-y-4 rounded-2xl border border-emerald-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Laporan keuangan</p>
          <h2 className="text-sm font-extrabold text-slate-900">{judul}</h2>
          <p className="text-[11px] text-slate-500">Disusun dari transaksi kas yang sudah divalidasi Bendahara, terfilter per unit.</p>
        </div>
        <label className="text-[11px] font-bold text-slate-600">
          Periode
          <input type="month" value={periode} onChange={(e) => setPeriode(e.target.value)} className="mt-1 block rounded-xl border border-slate-300 p-2 text-sm font-semibold" />
        </label>
      </div>
      <div className="flex flex-wrap gap-2">
        {tombol('arus', 'Arus kas')}
        {tombol('realisasi', 'Realisasi anggaran')}
        {tombol('neraca', 'Neraca')}
      </div>
      {memuat ? <p className="text-sm text-slate-500">Menyusun laporan...</p> : null}
      {galat ? <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{galat}</p> : null}
      {!memuat && !galat && tab === 'arus' && arus ? <TabelArus data={arus} /> : null}
      {!memuat && !galat && tab === 'realisasi' && realisasi ? <TabelRealisasi data={realisasi} /> : null}
      {!memuat && !galat && tab === 'neraca' && neraca ? <TabelNeraca data={neraca} /> : null}
    </section>
  )
}

function TabelArus({ data }: { data: ArusKas }) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-[11px] text-slate-500">{data.unit} · {data.periode}</p>
      <table className="w-full min-w-[520px] border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="border-b p-2">Akun kas/bank</th>
            <th className="border-b p-2 text-end">Kas masuk</th>
            <th className="border-b p-2 text-end">Kas keluar</th>
            <th className="border-b p-2 text-end">Neto</th>
          </tr>
        </thead>
        <tbody>
          {data.kas.map((item) => (
            <tr key={item.kode}>
              <td className="border-b p-2 font-semibold">{item.kode} · {item.nama}</td>
              <td className="border-b p-2 text-end">{rupiahKas(item.masuk)}</td>
              <td className="border-b p-2 text-end">{rupiahKas(item.keluar)}</td>
              <td className="border-b p-2 text-end font-bold">{rupiahKas(item.neto)}</td>
            </tr>
          ))}
          <tr>
            <td className="p-2 font-black">Total</td>
            <td className="p-2 text-end font-black">{rupiahKas(data.totalMasuk)}</td>
            <td className="p-2 text-end font-black">{rupiahKas(data.totalKeluar)}</td>
            <td className="p-2 text-end font-black">{rupiahKas(data.neto)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}

function TabelRealisasi({ data }: { data: RealisasiAnggaran }) {
  const baris = (judul: string, daftar: RealisasiAnggaran['pendapatan'], total: number, anggaran: number, jenis: 'masuk' | 'keluar') => (
    <>
      <tr className="bg-slate-50"><td colSpan={4} className="p-2 font-black">{judul}</td></tr>
      {daftar.length === 0 ? (
        <tr><td colSpan={4} className="border-b p-2 text-slate-500">Belum ada realisasi.</td></tr>
      ) : daftar.map((item) => (
        <tr key={item.kode_akun}>
          <td className="border-b p-2">{item.kode_akun} · {item.nama_akun}</td>
          <td className="border-b p-2 text-end">{rupiahKas(item.anggaran)}</td>
          <td className="border-b p-2 text-end">{rupiahKas(jenis === 'masuk' ? item.masuk : item.keluar)}</td>
          <td className="border-b p-2 text-end">{rupiahKas((jenis === 'masuk' ? item.masuk : item.keluar) - item.anggaran)}</td>
        </tr>
      ))}
      <tr>
        <td className="p-2 font-bold">Jumlah {judul.toLowerCase()}</td>
        <td className="p-2 text-end font-bold">{rupiahKas(anggaran)}</td>
        <td className="p-2 text-end font-bold">{rupiahKas(total)}</td>
        <td className="p-2 text-end font-bold">{rupiahKas(total - anggaran)}</td>
      </tr>
    </>
  )
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-[11px] text-slate-500">{data.unit} · {data.periode} · pendapatan (1xxx/4xxx) vs belanja (2xxx/5xxx)</p>
      <table className="w-full min-w-[640px] border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="border-b p-2">Pos akun</th>
            <th className="border-b p-2 text-end">Anggaran</th>
            <th className="border-b p-2 text-end">Realisasi</th>
            <th className="border-b p-2 text-end">Selisih</th>
          </tr>
        </thead>
        <tbody>
          {baris('Pendapatan', data.pendapatan, data.totalPendapatan, data.totalAnggaranPendapatan, 'masuk')}
          {baris('Belanja / pengeluaran', data.belanja, data.totalBelanja, data.totalAnggaranBelanja, 'keluar')}
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">Anggaran terisi jika tabel_anggaran tersedia. Jika belum, kolom anggaran bernilai 0.</p>
    </div>
  )
}

function TabelNeraca({ data }: { data: NeracaKas }) {
  return (
    <div className="overflow-x-auto">
      <p className="mb-2 text-[11px] text-slate-500">{data.unit} · {data.periode}</p>
      <table className="w-full min-w-[420px] border-collapse text-left text-xs">
        <thead>
          <tr className="bg-slate-50 text-slate-600">
            <th className="border-b p-2">Aset kas/bank</th>
            <th className="border-b p-2 text-end">Saldo</th>
          </tr>
        </thead>
        <tbody>
          {data.aset.map((item) => (
            <tr key={item.kode}>
              <td className="border-b p-2 font-semibold">{item.kode} · {item.nama}</td>
              <td className="border-b p-2 text-end">{rupiahKas(item.saldo)}</td>
            </tr>
          ))}
          <tr>
            <td className="p-2 font-black">Total aset lancar (kas)</td>
            <td className="p-2 text-end font-black">{rupiahKas(data.totalAset)}</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-2 text-[11px] text-slate-500">Saldo = kas masuk dikurangi kas keluar pada akun 3101 / 3102 / 3103 untuk unit ini.</p>
    </div>
  )
}
