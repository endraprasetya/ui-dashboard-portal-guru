import { BadgeCheck } from 'lucide-react'
import type { JenisCatatanPemeriksaHq } from '@/lib/rapor-hq-kirim'

export function BadgeJenisCatatanHq({ jenis }: { jenis: JenisCatatanPemeriksaHq }) {
  if (jenis !== 'revisi' && jenis !== 'konfirmasi') return null
  const siap = jenis === 'konfirmasi'
  return (
    <span
      className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold ${
        siap ? 'border border-emerald-300 bg-emerald-100 text-emerald-800' : 'border border-amber-300 bg-amber-100 text-amber-900'
      }`}
    >
      {siap ? 'Siap cetak' : 'Revisi'}
    </span>
  )
}

export function BadgeLolosPemeriksaan({
  lolos,
  jenis = '',
}: {
  lolos: boolean
  jenis?: JenisCatatanPemeriksaHq
}) {
  if (!lolos) {
    return (
      <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
        Belum diperiksa · menunggu pemeriksaan
      </span>
    )
  }
  if (jenis === 'revisi') {
    return (
      <span className="inline-flex rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
        Sudah diperiksa · Revisi / perlu perbaikan
      </span>
    )
  }
  if (jenis === 'konfirmasi') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-300 bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
        <BadgeCheck className="size-3" aria-hidden /> Sudah diperiksa · Lolos pemeriksaan
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
      <BadgeCheck className="size-3" aria-hidden /> Sudah diperiksa
    </span>
  )
}
