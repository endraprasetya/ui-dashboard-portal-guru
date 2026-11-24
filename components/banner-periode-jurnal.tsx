'use client'

import { useEffect, useState } from 'react'
import { modePeriodeSekolah, tanggalLokal, type ModePeriodeSekolah } from '@/lib/periode-sekolah'

export function BannerPeriodeJurnal({ tanggal }: { tanggal?: string }) {
  const [iso, setIso] = useState<string | null>(tanggal ?? null)

  useEffect(() => {
    setIso(tanggal || tanggalLokal())
  }, [tanggal])

  if (!iso) return null
  const mode: ModePeriodeSekolah = modePeriodeSekolah(iso)
  if (mode === 'efektif') return null

  if (mode === 'asas') {
    return (
      <div className="no-print rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p className="font-extrabold">Ujian ASAS I (23 November – 17 Desember 2026)</p>
        <p className="mt-1 text-xs leading-relaxed">
          Sedang berlangsung Ujian ASAS I. Jurnal pembelajaran disesuaikan dengan jadwal ujian dan ditandai UJIAN
          ASAS. Absensi harian murid tetap berjalan.
        </p>
      </div>
    )
  }

  return (
    <div className="no-print rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
      <p className="font-extrabold">Libur Semester 1 (21 Desember 2026 – 3 Januari 2027)</p>
      <p className="mt-1 text-xs leading-relaxed">
        Sedang berlangsung Libur Semester 1. Kegiatan belajar dan jurnal rutin sementara libur.
      </p>
    </div>
  )
}
