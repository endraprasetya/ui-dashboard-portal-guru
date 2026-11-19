'use client'

import { useState } from 'react'
import { ArrowLeft, X } from 'lucide-react'
import { kriteriaTargetKelas, KRITERIA_TARGET_HQ, type BarisKriteriaTarget } from '@/lib/kriteria-target-rapor-hq'

function kelasTerpilih(kelasSiswa: number) {
  return kelasSiswa >= 1 && kelasSiswa <= 6 ? kelasSiswa : null
}

function poinAwalKelas(tingkat: number) {
  const awal: Record<string, string> = {}
  for (const item of kriteriaTargetKelas(tingkat).baris) awal[item.id] = String(item.poin)
  return awal
}

export function ModalHitungTargetRapor({
  kelasSiswa,
  onTutup,
  onPakai,
}: {
  kelasSiswa: number
  onTutup: () => void
  onPakai: (poin: number, capaian: string, kelas: number) => void
}) {
  const awal = kelasTerpilih(kelasSiswa)
  const [kelas, setKelas] = useState<number | null>(awal)
  const [poinIsian, setPoinIsian] = useState<Record<string, string>>(() => (awal ? poinAwalKelas(awal) : {}))
  const kriteria = kelas ? kriteriaTargetKelas(kelas) : null

  const bukaKelas = (tingkat: number) => {
    setPoinIsian(poinAwalKelas(tingkat))
    setKelas(tingkat)
  }

  const pakai = (item: BarisKriteriaTarget) => {
    const mentah = Number(poinIsian[item.id])
    const poin = Number.isFinite(mentah) ? Math.min(100, Math.max(0, Math.round(mentah))) : item.poin
    onPakai(poin, item.capaian, kelas || 1)
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4">
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-700">Rapor HQ</p>
            <h3 className="text-base font-black text-slate-900">
              {kriteria ? kriteria.judul : 'Hitung Target'}
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {kriteria
                ? `Kriteria Kelas ${kriteria.kelas}. Pilih capaian santri, lalu sesuaikan poin target bila perlu. Poin yang dipakai masuk ke rumus ((2 × nilai rata-rata) + nilai target) / 3.`
                : 'Pilih jenjang kelas untuk melihat kriteria poin target hafalan.'}
            </p>
          </div>
          <button type="button" onClick={onTutup} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Tutup">
            <X className="size-4" />
          </button>
        </div>

        {!kriteria ? (
          <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
            {KRITERIA_TARGET_HQ.map((item) => {
              const milikSiswa = item.kelas === kelasSiswa
              return (
                <button
                  key={item.kelas}
                  type="button"
                  onClick={() => bukaKelas(item.kelas)}
                  className={`rounded-2xl border px-4 py-5 text-left transition hover:border-emerald-500 hover:bg-emerald-50 ${
                    milikSiswa ? 'border-emerald-600 bg-emerald-50' : 'border-slate-200 bg-white'
                  }`}
                >
                  <span className="block text-sm font-black text-slate-900">Kelas {item.kelas}</span>
                  <span className="mt-1 block text-[11px] font-semibold text-slate-500">{item.judul.replace('Target kelas ', '')}</span>
                  {milikSiswa ? <span className="mt-2 block text-[10px] font-bold text-emerald-700">Kelas santri ini</span> : null}
                </button>
              )
            })}
          </div>
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto p-5">
            <button
              type="button"
              onClick={() => setKelas(null)}
              className="mb-3 inline-flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="size-3.5" /> Semua kelas
            </button>
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-emerald-800 text-xs uppercase text-white">
                  <th className="px-3 py-2">Capaian hafalan</th>
                  <th className="px-3 py-2">Poin standar</th>
                  <th className="px-3 py-2">Poin target</th>
                  <th className="px-3 py-2" />
                </tr>
              </thead>
              <tbody>
                {kriteria.baris.map((item) => (
                  <tr key={item.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{item.capaian}</td>
                    <td className="px-3 py-2 text-slate-500">{item.poin}</td>
                    <td className="px-3 py-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        value={poinIsian[item.id] ?? String(item.poin)}
                        onChange={(event) => setPoinIsian((saatIni) => ({ ...saatIni, [item.id]: event.target.value }))}
                        aria-label={`Poin target untuk ${item.capaian}`}
                        className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm font-bold"
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <button
                        type="button"
                        onClick={() => pakai(item)}
                        className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                      >
                        Pakai
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
