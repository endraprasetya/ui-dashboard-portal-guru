import { Trophy } from 'lucide-react'
import type { BarisPeringkatKelas } from '@/lib/tertib-saldo'

const MEDALI = ['🥇', '🥈', '🥉'] as const
const WARNA = [
  'border-amber-200 bg-amber-50',
  'border-slate-200 bg-slate-50',
  'border-orange-200 bg-orange-50',
] as const

export function TertibPeringkatKelas({
  kelas,
  peringkat,
  idAnanda,
  namaBulan,
}: {
  kelas: string
  peringkat: BarisPeringkatKelas[]
  idAnanda?: string
  namaBulan: string
}) {
  return (
    <section className="rounded-xl border border-amber-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wide text-amber-800">Papan peringkat</p>
          <h2 className="flex items-center gap-1.5 text-sm font-extrabold text-slate-900">
            <Trophy className="size-4 text-amber-600" /> 3 besar poin tertinggi · Kelas {kelas}
          </h2>
        </div>
      </div>
      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        Dihitung real-time dari sisa saldo bulan {namaBulan} (200 + kebaikan − pelanggaran).
      </p>

      {peringkat.length === 0 ? (
        <p className="py-4 text-center text-xs text-slate-400">Belum ada data peringkat untuk kelas ini.</p>
      ) : (
        <ol className="space-y-2">
          {peringkat.map((row) => {
            const ananda = row.id === idAnanda
            return (
              <li
                key={row.id}
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${WARNA[row.peringkat - 1] || 'border-slate-100 bg-white'} ${
                  ananda ? 'ring-2 ring-emerald-400' : ''
                }`}
              >
                <span className="text-lg leading-none" aria-hidden>
                  {MEDALI[row.peringkat - 1] || `${row.peringkat}.`}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-slate-900">
                    {row.nama}
                    {ananda ? (
                      <span className="ml-1.5 rounded-full bg-emerald-600 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">
                        Ananda
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    +{row.positif} kebaikan · −{row.negatif} pelanggaran
                  </p>
                </div>
                <p className="shrink-0 text-right">
                  <span className="block text-lg font-black tabular-nums text-slate-900">{row.sisa}</span>
                  <span className="text-[9px] font-semibold uppercase text-slate-400">sisa poin</span>
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}
