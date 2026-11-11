'use client'

import { useMemo, useState } from 'react'
import { ChevronRight, ClipboardList } from 'lucide-react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import { labelTapel } from '@/lib/ampss-urai'
import type { BarisRekapan, StatusTagihan } from '@/lib/keuangan-tipe'

const UKURAN_HALAMAN = 20

const kelasKartu =
  'cursor-pointer rounded-2xl border p-4 text-left shadow-sm transition hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

function rupiah(nilai: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(nilai)
}

function LencanaTagihan({ status }: { status: StatusTagihan }) {
  const kelas = status === 'Lunas' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}>{status}</span>
}

export function KartuRekapanTagihan({ baris, periode }: { baris: BarisRekapan[]; periode: string }) {
  const [buka, setBuka] = useState(false)
  const belum = baris.filter((item) => item.status === 'Belum')
  const nominal = belum.reduce((jumlah, item) => jumlah + item.nominal, 0)

  return (
    <>
      <button type="button" onClick={() => setBuka(true)} className={`${kelasKartu} border-sky-200 bg-sky-50`}>
        <span className="flex items-center justify-between gap-2 text-sky-950">
          <span className="inline-flex items-center gap-1 text-xs font-extrabold uppercase">
            <ClipboardList className="size-3.5" /> Rekapan Tagihan
          </span>
          <ChevronRight className="size-4 text-sky-700/70" />
        </span>
        <span className="mt-2 block text-xl font-black text-slate-900">{belum.length} belum</span>
        <span className="mt-1 block text-xs font-medium text-slate-600">
          {periode}. Sisa {rupiah(nominal)}. Filter per siswa, kelas, dan bulan.
        </span>
      </button>
      {buka && <ModalRekapanTagihan baris={baris} periode={periode} onTutup={() => setBuka(false)} />}
    </>
  )
}

function ModalRekapanTagihan({ baris, periode, onTutup }: { baris: BarisRekapan[]; periode: string; onTutup: () => void }) {
  const [kelas, setKelas] = useState('semua')
  const [bulan, setBulan] = useState('semua')
  const [status, setStatus] = useState<'semua' | StatusTagihan>('semua')
  const [cari, setCari] = useState('')
  const [halaman, setHalaman] = useState(0)

  const kelasPilihan = useMemo(() => {
    return [...new Set(baris.map((item) => item.kelas))].sort((a, b) => a.localeCompare(b, 'id', { numeric: true }))
  }, [baris])

  const bulanPilihan = useMemo(() => {
    const peta = new Map<string, string>()
    for (const item of baris) {
      if (item.bulan) peta.set(item.kunciBulan, item.bulan)
    }
    return [...peta.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [baris])

  const tersaring = useMemo(() => {
    const kata = cari.trim().toLowerCase()
    return baris.filter((item) => {
      if (kelas !== 'semua' && item.kelas !== kelas) return false
      if (bulan !== 'semua' && item.kunciBulan !== bulan) return false
      if (status !== 'semua' && item.status !== status) return false
      if (!kata) return true
      return item.nama.toLowerCase().includes(kata) || item.nis.includes(kata)
    })
  }, [baris, kelas, bulan, status, cari])

  const halamanMaks = Math.max(0, Math.ceil(tersaring.length / UKURAN_HALAMAN) - 1)
  const halamanAman = Math.min(halaman, halamanMaks)
  const tampil = tersaring.slice(halamanAman * UKURAN_HALAMAN, halamanAman * UKURAN_HALAMAN + UKURAN_HALAMAN)
  const sisa = tersaring.filter((item) => item.status === 'Belum').reduce((jumlah, item) => jumlah + item.nominal, 0)
  const jumlahBelum = tersaring.filter((item) => item.status === 'Belum').length
  const jumlahLunas = tersaring.length - jumlahBelum

  const ubah = (pembaruan: () => void) => {
    pembaruan()
    setHalaman(0)
  }

  return (
    <ModalKerangka
      judul="Rekapan Tagihan"
      keterangan={`${periode}. Syahriah dan katering setelah bulan berjalan tidak dihitung. PSB, buku, dan ASAS tampil pada semua bulan.`}
      onTutup={onTutup}
      lebar="max-w-6xl"
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold">
            Kelas
            <select value={kelas} onChange={(event) => ubah(() => setKelas(event.target.value))} className="mt-1 block rounded-lg border px-2 py-1.5 font-semibold">
              <option value="semua">Semua kelas</option>
              {kelasPilihan.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Bulan
            <select value={bulan} onChange={(event) => ubah(() => setBulan(event.target.value))} className="mt-1 block rounded-lg border px-2 py-1.5 font-semibold">
              <option value="semua">Semua bulan berjalan</option>
              {bulanPilihan.map(([kunci, label]) => (
                <option key={kunci} value={kunci}>{label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold">
            Status
            <select
              value={status}
              onChange={(event) => ubah(() => setStatus(event.target.value as 'semua' | StatusTagihan))}
              className="mt-1 block rounded-lg border px-2 py-1.5 font-semibold"
            >
              <option value="semua">Semua status</option>
              <option value="Belum">Belum</option>
              <option value="Lunas">Lunas</option>
            </select>
          </label>
          <label className="min-w-[200px] flex-1 text-xs font-bold">
            Siswa
            <input
              value={cari}
              onChange={(event) => ubah(() => setCari(event.target.value))}
              placeholder="Nama atau NIS"
              className="mt-1 block w-full rounded-lg border px-2 py-1.5 font-semibold"
            />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 text-slate-600">
                <th className="border-b p-2">Siswa</th>
                <th className="border-b p-2">Kelas</th>
                <th className="border-b p-2">Bulan</th>
                <th className="border-b p-2">Jenis</th>
                <th className="border-b p-2">Tagihan</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2 text-end">Harus dibayar</th>
              </tr>
            </thead>
            <tbody>
              {tampil.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-slate-400">Tidak ada tagihan pada saringan ini.</td>
                </tr>
              ) : tampil.map((item, indeks) => (
                <tr key={`${item.nis}-${item.tapel}-${item.kode}-${item.status}-${indeks}`}>
                  <td className="border-b p-2">
                    <p className="font-bold">{item.nama}</p>
                    <p className="text-[11px] text-slate-500">NIS {item.nis}</p>
                  </td>
                  <td className="border-b p-2">{item.kelas}</td>
                  <td className="border-b p-2">{item.bulan || labelTapel(item.tapel)}</td>
                  <td className="border-b p-2">{item.jenis}</td>
                  <td className="border-b p-2">{item.item}</td>
                  <td className="border-b p-2"><LencanaTagihan status={item.status} /></td>
                  <td className="border-b p-2 text-end font-bold">{rupiah(item.nominal)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={6} className="p-2 font-extrabold">
                  {jumlahBelum} belum · {jumlahLunas} lunas
                </td>
                <td className="p-2 text-end font-extrabold text-amber-900">{rupiah(sisa)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div className="flex items-center justify-between gap-2 text-xs">
          <p className="text-slate-500">{tersaring.length} baris</p>
          <div className="flex items-center gap-2">
            <button type="button" disabled={halamanAman === 0} onClick={() => setHalaman((nilai) => Math.max(0, nilai - 1))} className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40">
              Sebelumnya
            </button>
            <span className="font-bold">{halamanAman + 1} / {halamanMaks + 1}</span>
            <button type="button" disabled={halamanAman >= halamanMaks} onClick={() => setHalaman((nilai) => nilai + 1)} className="rounded-lg border px-2 py-1 font-bold disabled:opacity-40">
              Berikutnya
            </button>
          </div>
        </div>
      </div>
    </ModalKerangka>
  )
}
