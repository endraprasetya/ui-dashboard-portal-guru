'use client'

import { rincianTugasRumah, tugasRumahSudahDikerjakan } from '@/lib/tahfidz'

export function SelTugasRumah({
  record,
  setoranBerikutnya = null,
}: {
  record: any
  setoranBerikutnya?: any | null
}) {
  const tugas = rincianTugasRumah(record)
  if (!tugas.ada) {
    return <span className="text-slate-400">Tidak ada tugas</span>
  }

  const sudah = tugasRumahSudahDikerjakan(record, setoranBerikutnya)

  return (
    <div className="space-y-1">
      {tugas.ziyadah ? (
        <p className="leading-4 text-slate-800">
          <span className="mr-1 rounded bg-sky-100 px-1 py-px text-[9px] font-black uppercase tracking-wide text-sky-800">
            Z
          </span>
          {tugas.ziyadah}
        </p>
      ) : null}
      {tugas.murojaah ? (
        <p className="leading-4 text-slate-800">
          <span className="mr-1 rounded bg-emerald-100 px-1 py-px text-[9px] font-black uppercase tracking-wide text-emerald-800">
            M
          </span>
          {tugas.murojaah}
        </p>
      ) : null}
      {tugas.catatan.map((item) => (
        <p key={item} className="text-[11px] leading-4 text-slate-500">
          {item}
        </p>
      ))}
      <span
        className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
          sudah ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
        }`}
      >
        {sudah ? 'Sudah Dikerjakan' : 'Belum Dikerjakan'}
      </span>
    </div>
  )
}
