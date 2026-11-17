'use client'

import { adaTugasRumahQiroah, tugasRumahQiroahSudahDikerjakan } from '@/lib/qiroah'

export function SelTugasRumahQiroah({
  record,
  setoranBerikutnya = null,
}: {
  record: { tugas_rumah?: unknown; status_setoran?: unknown }
  setoranBerikutnya?: { jilid?: unknown; halaman?: unknown } | null
}) {
  if (!adaTugasRumahQiroah(record?.tugas_rumah)) {
    return <span className="text-slate-400">Tidak ada tugas</span>
  }

  const sudah = tugasRumahQiroahSudahDikerjakan(record, setoranBerikutnya)

  return (
    <div className="space-y-1">
      <p className="leading-4 text-slate-800">{String(record.tugas_rumah)}</p>
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
