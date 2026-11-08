'use client'

import { ChevronDown, ChevronUp, Target } from 'lucide-react'
import { useState } from 'react'

export function ToggleTargetTahfidz({
  aktif,
  onUbah,
}: {
  aktif: boolean
  onUbah: (v: boolean) => void
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/80 px-4 py-3">
      <h3 className="text-sm font-extrabold text-emerald-900">Target Tahfidz</h3>
      <button
        type="button"
        role="switch"
        aria-checked={aktif}
        onClick={() => onUbah(!aktif)}
        className={`relative h-7 w-12 shrink-0 rounded-full transition ${aktif ? 'bg-emerald-600' : 'bg-slate-300'}`}
      >
        <span
          className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition ${aktif ? 'left-[1.35rem]' : 'left-0.5'}`}
        />
      </button>
    </div>
  )
}

export function PanelStandarTargetTahfidz({ ringkas }: { ringkas?: string }) {
  const [buka, setBuka] = useState(false)
  return (
    <div className="rounded-xl border border-emerald-200 bg-white">
      <button
        type="button"
        onClick={() => setBuka((v) => !v)}
        className="flex w-full items-center justify-between rounded-xl px-4 py-2.5 text-left text-xs font-bold text-emerald-800 hover:bg-emerald-50/80"
      >
        <span className="flex items-center gap-2">
          <Target className="size-4 text-emerald-600" /> Acuan standar target hafalan
        </span>
        {buka ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
      </button>
      {ringkas && <p className="border-t border-emerald-100 px-4 py-2 text-[11px] text-slate-600">{ringkas}</p>}
      {buka && (
        <div className="space-y-2 border-t border-emerald-100 p-4 text-xs text-slate-700">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <p>
              <strong>Kelas 1:</strong> Surah An Naas s/d Al Insyiqaq
            </p>
            <p>
              <strong>Kelas 2:</strong> Juz 30 & Juz 29 (Al Mulk & Al Qolam)
            </p>
            <p>
              <strong>Kelas 3:</strong> Juz 29 (Al Haqqoh s/d Al Mursalat)
            </p>
            <p>
              <strong>Kelas 4:</strong> Juz 28 (Al Mujadillah s/d Al Munafiqun)
            </p>
            <p>
              <strong>Kelas 5:</strong> Juz 28 & Juz 27 (At Taghobun s/d An Najm)
            </p>
            <p>
              <strong>Kelas 6:</strong> Al Qomar s/d Al Hadid
            </p>
          </div>
          <p className="border-t border-emerald-100 pt-2 text-center font-bold text-emerald-700">Target standar kelulusan SD: 4 Juz</p>
        </div>
      )}
    </div>
  )
}
