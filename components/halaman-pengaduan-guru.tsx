'use client'

import { ArrowLeft, MessageCircleWarning } from 'lucide-react'
import { AduanDiteruskanGuru } from '@/components/aduan-diteruskan-guru'

export function HalamanPengaduanGuru({
  currentUser,
  fokusId,
  onKembali,
}: {
  currentUser: unknown
  fokusId?: string
  onKembali: () => void
}) {
  return (
    <div className="space-y-4">
      <MotionHeader onKembali={onKembali} />
      <AduanDiteruskanGuru currentUser={currentUser} fokusId={fokusId} selaluTampil ringkas={false} />
    </div>
  )
}

function MotionHeader({ onKembali }: { onKembali: () => void }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button
        type="button"
        onClick={onKembali}
        className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <ArrowLeft className="size-4" /> Kembali ke beranda
      </button>
      <div className="flex items-center gap-2 text-violet-950">
        <MessageCircleWarning className="size-5" />
        <div>
          <h2 className="text-lg font-black text-slate-900">Layanan Pengaduan Wali Murid</h2>
          <p className="text-xs text-slate-500">Aduan yang Kepala Sekolah teruskan untuk ditindaklanjuti wali kelas / waka.</p>
        </div>
      </div>
    </div>
  )
}