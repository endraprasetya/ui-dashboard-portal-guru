import { BadgeCheck } from 'lucide-react'

export function BadgeLolosPemeriksaan({ lolos }: { lolos: boolean }) {
  if (lolos) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
        <BadgeCheck className="size-3" aria-hidden /> Sudah diperiksa · Lolos pemeriksaan
      </span>
    )
  }
  return (
    <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
      Belum diperiksa · menunggu pemeriksaan
    </span>
  )
}
