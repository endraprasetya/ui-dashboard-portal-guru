'use client'

import { useEffect, useMemo, useState } from 'react'
import { ClipboardCheck, Loader2 } from 'lucide-react'
import { muatAbsensiCepatHariIni, type RekapAbsensiCepatHariIni } from '@/lib/absensi-cepat-dashboard'

const WARNA_HADIR = '#22c55e'
const WARNA_TIDAK_HADIR = '#ef4444'

function DonutAbsensi({
  hadir,
  tidakHadir,
  total,
  size = 96,
}: {
  hadir: number
  tidakHadir: number
  total: number
  size?: number
}) {
  const stroke = 10
  const radius = (size - stroke) / 2
  const cx = size / 2
  const cy = size / 2
  const lingkar = 2 * Math.PI * radius

  const segmen = useMemo(() => {
    if (total <= 0) return []
    const hadirPct = hadir / total
    const tidakPct = tidakHadir / total
    const out: { color: string; length: number; offset: number }[] = []
    let offset = 0
    if (hadir > 0) {
      out.push({ color: WARNA_HADIR, length: lingkar * hadirPct, offset })
      offset += lingkar * hadirPct
    }
    if (tidakHadir > 0) {
      out.push({ color: WARNA_TIDAK_HADIR, length: lingkar * tidakPct, offset })
    }
    return out
  }, [hadir, tidakHadir, total, lingkar])

  if (total <= 0) {
    return (
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full bg-slate-100"
        style={{ width: size, height: size }}
      >
        <span className="text-[10px] font-semibold text-slate-400">—</span>
      </div>
    )
  }

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={stroke}
        />
        {segmen.map((bagian, index) => (
          <circle
            key={index}
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={bagian.color}
            strokeWidth={stroke}
            strokeDasharray={`${bagian.length} ${lingkar - bagian.length}`}
            strokeDashoffset={-bagian.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        aria-hidden
      >
        <strong className="text-lg text-slate-900">{hadir}</strong>
        <span className="text-[10px] text-slate-500">dari {total}</span>
      </div>
    </div>
  )
}

function persen(bagian: number, total: number) {
  if (total <= 0) return 0
  return Math.round((bagian / total) * 1000) / 10
}

export function AbsensiCepatKelas({
  currentUser,
  onBukaAbsensi,
  penyegar = '',
}: {
  currentUser?: any
  onBukaAbsensi: () => void
  /** Ubah nilai saat kembali ke dashboard agar data absensi di-fetch ulang */
  penyegar?: string
}) {
  const [memuat, setMemuat] = useState(true)
  const [rekap, setRekap] = useState<RekapAbsensiCepatHariIni | null>(null)

  useEffect(() => {
    if (!currentUser) {
      setRekap(null)
      setMemuat(false)
      return
    }
    let batal = false
    setMemuat(true)
    muatAbsensiCepatHariIni(currentUser).then((hasil) => {
      if (batal) return
      setRekap(hasil)
      setMemuat(false)
    })
    return () => {
      batal = true
    }
  }, [currentUser, penyegar])

  const total = rekap?.totalSiswa ?? 0
  const hadir = rekap?.hadir ?? 0
  const tidakHadir = rekap?.tidakHadir ?? 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Absensi Cepat Kelas</h3>
          {rekap?.labelKelas && !memuat && (
            <p className="mt-0.5 text-[11px] font-medium text-slate-500">{rekap.labelKelas}</p>
          )}
        </div>
        <ClipboardCheck className="size-5 text-emerald-600" />
      </div>

      {memuat ? (
        <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
          <Loader2 className="size-5 animate-spin text-emerald-600" />
          Memuat data absensi hari ini…
        </div>
      ) : !rekap?.adaData ? (
        <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">Belum ada data absensi hari ini</p>
          <p className="mt-1 text-xs text-slate-500">
            {rekap && rekap.totalSiswa > 0
              ? 'Isi jurnal pembelajaran / absensi kelas binaan untuk melihat ringkasan di sini.'
              : 'Belum ada siswa binaan terdaftar pada akun Anda.'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <DonutAbsensi hadir={hadir} tidakHadir={tidakHadir} total={total} size={104} />
          <div className="min-w-0 flex-1 space-y-2 text-xs">
            <p className="font-semibold text-slate-600">
              Rekap{' '}
              {new Date(`${rekap.tanggal}T12:00:00`).toLocaleDateString('id-ID', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>
            <div className="space-y-1.5">
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: WARNA_HADIR }} />
                <span>
                  Hadir: <strong>{hadir}</strong> siswa
                  <span className="text-slate-500"> ({persen(hadir, total)}%)</span>
                </span>
              </p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ background: WARNA_TIDAK_HADIR }} />
                <span>
                  Tidak hadir: <strong>{tidakHadir}</strong> siswa
                  <span className="text-slate-500"> ({persen(tidakHadir, total)}%)</span>
                </span>
              </p>
              {tidakHadir > 0 && (
                <p className="pl-4 text-[11px] leading-relaxed text-slate-500">
                  Rincian: Sakit {rekap.sakit}, Izin {rekap.izin}, Alpa {rekap.alpa}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onBukaAbsensi}
        className="w-full rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
      >
        Buka Absensi Santri
      </button>
    </div>
  )
}
