'use client'

import { useCallback, useEffect, useState } from 'react'
import { Clock3, RefreshCw, Users } from 'lucide-react'
import type { BarisAbsensiSidia, RekapAbsensiSidia } from '@/lib/sidia-absensi'

const kelasStatus: Record<string, string> = {
  Masuk: 'bg-emerald-100 text-emerald-900',
  Izin: 'bg-amber-100 text-amber-900',
  'Tidak Masuk': 'bg-rose-100 text-rose-900',
}

const kelasKetepatan: Record<string, string> = {
  Terlambat: 'text-amber-800 font-bold',
  'Awal Waktu': 'text-sky-800 font-bold',
  'Tepat Waktu': 'text-emerald-800 font-bold',
  '—': 'text-slate-500',
}

function formatDiambil(iso?: string) {
  if (!iso) return '—'
  const ms = Date.parse(iso)
  if (!Number.isFinite(ms)) return '—'
  return new Intl.DateTimeFormat('id-ID', {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(ms)
}

function TautanFoto({ url, label }: { url?: string; label: string }) {
  if (!url) return <span className="text-slate-400">—</span>
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block font-bold text-indigo-800 underline decoration-indigo-300 underline-offset-2"
    >
      {label}
    </a>
  )
}

function KartuBarisSidia({ item }: { item: BarisAbsensiSidia }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold leading-snug text-slate-900">{item.namaGuru}</p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            {item.kelompok} · {item.tanggal}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${kelasStatus[item.status] || 'bg-slate-100'}`}>
          {item.status}
        </span>
      </div>
      <p className={`mt-2 text-xs ${kelasKetepatan[item.ketepatan] || 'text-slate-600'}`}>
        Ketepatan: <strong>{item.ketepatan}</strong>
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg border border-emerald-200 bg-white px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-800">Jam masuk</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">{item.jamMasuk || '—'}</p>
          <p className="mt-1.5">
            <TautanFoto url={item.fotoUrl} label="Lihat foto masuk" />
          </p>
        </div>
        <div className="rounded-lg border border-indigo-200 bg-white px-2.5 py-2">
          <p className="text-[10px] font-bold uppercase tracking-wide text-indigo-800">Jam pulang</p>
          <p className="mt-0.5 font-mono text-sm font-bold text-slate-900">{item.jamPulang || '—'}</p>
          <p className="mt-1.5">
            <TautanFoto url={item.fotoPulangUrl} label="Lihat foto pulang" />
          </p>
        </div>
      </div>
      {item.keterangan && item.keterangan !== '—' ? (
        <p className="mt-2 text-[11px] leading-relaxed text-slate-600">{item.keterangan}</p>
      ) : null}
    </article>
  )
}

function BarisTabelSidia({ item }: { item: BarisAbsensiSidia }) {
  return (
    <tr className="border-b border-slate-100">
      <td className="sticky left-0 z-[1] bg-white p-2 whitespace-nowrap shadow-[2px_0_4px_-2px_rgba(0,0,0,0.08)]">
        {item.tanggal}
      </td>
      <td className="p-2 font-semibold whitespace-nowrap">{item.kelompok}</td>
      <td className="p-2 min-w-[11rem] font-bold text-slate-900">{item.namaGuru}</td>
      <td className="p-2 whitespace-nowrap">
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelasStatus[item.status] || 'bg-slate-100'}`}>
          {item.status}
        </span>
      </td>
      <td className={`p-2 whitespace-nowrap ${kelasKetepatan[item.ketepatan] || ''}`}>{item.ketepatan}</td>
      <td className="p-2 font-mono text-[11px] whitespace-nowrap">{item.jamMasuk || '—'}</td>
      <td className="p-2 font-mono text-[11px] whitespace-nowrap">{item.jamPulang || '—'}</td>
      <td className="p-2 max-w-[12rem] text-slate-600">{item.keterangan}</td>
      <td className="p-2 whitespace-nowrap">
        <TautanFoto url={item.fotoUrl} label="Lihat" />
      </td>
      <td className="p-2 whitespace-nowrap">
        <TautanFoto url={item.fotoPulangUrl} label="Lihat" />
      </td>
    </tr>
  )
}

export function MonitoringSidiaAbsensiReguler({ tanggal }: { tanggal: string }) {
  const [tanggalPilih, setTanggalPilih] = useState(tanggal.slice(0, 10))
  const [data, setData] = useState<RekapAbsensiSidia | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [filter, setFilter] = useState<'Semua' | 'Putra' | 'Putri'>('Semua')

  useEffect(() => {
    setTanggalPilih(tanggal.slice(0, 10))
  }, [tanggal])

  const muat = useCallback(async (diam = false) => {
    if (!diam) setMemuat(true)
    setGalat('')
    try {
      const res = await fetch(`/api/kepsek/sidia-absensi?tanggal=${encodeURIComponent(tanggalPilih)}`, {
        cache: 'no-store',
      })
      const json = (await res.json()) as RekapAbsensiSidia | { pesan?: string }
      if (!res.ok) {
        throw new Error(('pesan' in json && json.pesan) || 'Data SIDIA belum dapat dimuat.')
      }
      setData(json as RekapAbsensiSidia)
    } catch (error) {
      setData(null)
      setGalat(error instanceof Error ? error.message : 'Data SIDIA belum dapat dimuat.')
    } finally {
      setMemuat(false)
    }
  }, [tanggalPilih])

  useEffect(() => {
    muat()
    const pengulangan = window.setInterval(() => muat(true), 5 * 60 * 1000)
    return () => window.clearInterval(pengulangan)
  }, [muat, tanggalPilih])

  const baris =
    data?.baris.filter((item) => filter === 'Semua' || item.kelompok === filter) ?? ([] as BarisAbsensiSidia[])

  return (
    <section className="no-print rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-indigo-900">
            <Users className="size-5 shrink-0" />
            <h2 className="text-sm font-extrabold leading-snug">Absensi Guru Tetap / Reguler (SIDIA)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Sinkron SITQAM · <strong>{tanggalPilih}</strong>
            {data?.diambilPada ? <> · diperbarui {formatDiambil(data.diambilPada)} WIB</> : null}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col text-xs font-bold text-slate-600">
            Tanggal
            <input
              type="date"
              value={tanggalPilih}
              onChange={(e) => setTanggalPilih(e.target.value)}
              className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold"
            />
          </label>
          <label className="flex flex-col text-xs font-bold text-slate-600">
            Kelompok
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as typeof filter)}
              className="mt-1 rounded-lg border border-slate-200 px-2 py-2 text-xs font-semibold"
            >
              <option value="Semua">Semua</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => muat()}
            disabled={memuat}
            className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${memuat ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
        </div>
      </div>

      {data ? (
        <div className="mb-3 grid grid-cols-2 gap-2 text-xs sm:grid-cols-3 lg:grid-cols-6">
          <p className="rounded-xl bg-slate-50 px-3 py-2">
            Total <strong className="text-slate-900">{data.ringkas.total}</strong>
          </p>
          <p className="rounded-xl bg-emerald-50 px-3 py-2">
            Masuk <strong className="text-emerald-900">{data.ringkas.masuk}</strong>
          </p>
          <p className="rounded-xl bg-indigo-50 px-3 py-2 col-span-2 sm:col-span-1">
            Sudah pulang{' '}
            <strong className="text-indigo-900">
              {data.baris.filter((b) => b.jamPulang).length}
            </strong>
          </p>
          <p className="rounded-xl bg-amber-50 px-3 py-2">
            Izin <strong className="text-amber-900">{data.ringkas.izin}</strong>
          </p>
          <p className="rounded-xl bg-orange-50 px-3 py-2">
            Terlambat <strong className="text-orange-900">{data.ringkas.terlambat}</strong>
          </p>
          <p className="col-span-2 rounded-xl bg-teal-50 px-3 py-2 sm:col-span-1">
            Tepat / awal{' '}
            <strong className="text-teal-900">
              {data.ringkas.tepatWaktu}/{data.ringkas.awalWaktu}
            </strong>
          </p>
        </div>
      ) : null}

      {memuat ? <p className="text-sm text-slate-500">Mengambil data absensi SIDIA...</p> : null}
      {!memuat && galat ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p>
      ) : null}
      {!memuat && !galat && data?.catatan?.length ? (
        <ul className="mb-2 space-y-1 text-xs text-amber-800">
          {data.catatan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}

      {!memuat && !galat && baris.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Belum ada data presensi SIDIA untuk tanggal ini.</p>
      ) : null}

      {!memuat && !galat && baris.length > 0 ? (
        <>
          <div className="space-y-2 lg:hidden">
            {baris.map((item) => (
              <KartuBarisSidia key={`${item.kelompok}-${item.namaGuru}`} item={item} />
            ))}
          </div>

          <div className="relative hidden lg:block">
            <div
              className="-mx-1 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-1 [scrollbar-width:thin]"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              <table className="w-full min-w-[64rem] border-collapse text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 text-slate-600">
                    <th className="sticky left-0 z-[2] border-b bg-slate-50 p-2">Tanggal</th>
                    <th className="border-b p-2">Kelompok</th>
                    <th className="border-b p-2">Nama guru</th>
                    <th className="border-b p-2">Status</th>
                    <th className="border-b p-2">Ketepatan</th>
                    <th className="border-b p-2">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" /> Masuk
                      </span>
                    </th>
                    <th className="border-b p-2">
                      <span className="inline-flex items-center gap-1">
                        <Clock3 className="size-3.5" /> Pulang
                      </span>
                    </th>
                    <th className="border-b p-2">Keterangan</th>
                    <th className="border-b p-2">Foto masuk</th>
                    <th className="border-b p-2">Foto pulang</th>
                  </tr>
                </thead>
                <tbody>
                  {baris.map((item) => (
                    <BarisTabelSidia key={`t-${item.kelompok}-${item.namaGuru}`} item={item} />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </section>
  )
}