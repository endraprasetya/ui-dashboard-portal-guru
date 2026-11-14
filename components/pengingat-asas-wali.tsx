'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { BATAS_PENGINGAT_ASAS_WIB, pengingatAsasAktif, SYARAT_UJIAN_ASAS } from '@/lib/portal-wali'

const HURUF = ['a', 'b', 'c', 'd', 'e', 'f'] as const

export function PengingatAsasWali() {
  const [tampil, setTampil] = useState(() => pengingatAsasAktif())

  useEffect(() => {
    const segarkan = () => setTampil(pengingatAsasAktif())
    segarkan()
    const sisa = Date.parse(BATAS_PENGINGAT_ASAS_WIB) - Date.now()
    if (sisa <= 0) return
    const waktu = window.setTimeout(segarkan, Math.min(sisa + 500, 2_000_000_000))
    return () => window.clearTimeout(waktu)
  }, [])

  if (!tampil) return null

  return (
    <section className="rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white">
          <AlertTriangle className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Pengingat penting</p>
          <h3 className="text-sm font-extrabold text-amber-950">Syarat administrasi mengikuti ujian ASAS</h3>
          <ol className="mt-3 space-y-1.5 text-xs font-medium text-slate-800">
            {SYARAT_UJIAN_ASAS.map((syarat, indeks) => (
              <li key={syarat} className="flex gap-2">
                <span className="w-4 shrink-0 font-bold text-amber-900">{HURUF[indeks]}.</span>
                <span>{syarat}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  )
}
