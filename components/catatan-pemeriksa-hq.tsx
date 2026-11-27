'use client'

import { BadgeCheck, RotateCcw } from 'lucide-react'
import { PLACEHOLDER_CATATAN_PEMERIKSA_HQ, type JenisCatatanPemeriksaHq } from '@/lib/rapor-hq-kirim'

export function CatatanPemeriksaHq({
  nilai,
  onUbah,
  menyimpan,
  onSimpanRevisi,
  onKonfirmasiSiapCetak,
  labelAria,
  ringkas = '',
  jenisTersimpan = '',
  aksen = 'violet',
}: {
  nilai: string
  onUbah: (nilai: string) => void
  menyimpan: boolean
  onSimpanRevisi: () => void
  onKonfirmasiSiapCetak: () => void
  labelAria: string
  ringkas?: string
  jenisTersimpan?: JenisCatatanPemeriksaHq
  aksen?: 'violet' | 'hijau'
}) {
  const revisi = aksen === 'hijau' ? 'bg-amber-700 hover:bg-amber-800' : 'bg-amber-700 hover:bg-amber-800'
  const konfirmasi = aksen === 'hijau' ? 'bg-emerald-800 hover:bg-[#0f2e26]' : 'bg-emerald-700 hover:bg-emerald-800'
  const warnaRingkas = jenisTersimpan === 'konfirmasi' ? 'text-emerald-800' : 'text-amber-800'
  return (
    <div>
      <textarea
        value={nilai}
        onChange={(event) => onUbah(event.target.value)}
        rows={3}
        placeholder={PLACEHOLDER_CATATAN_PEMERIKSA_HQ}
        aria-label={labelAria}
        className="w-full min-w-[16rem] rounded-lg border border-slate-300 px-3 py-2 text-sm font-normal"
      />
      {ringkas ? <p className={`mt-1 text-[11px] font-semibold leading-snug ${warnaRingkas}`}>{ringkas}</p> : null}
      <div className="mt-2 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={menyimpan}
          onClick={onSimpanRevisi}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${revisi}`}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          {menyimpan ? 'Menyimpan…' : 'Simpan catatan revisi'}
        </button>
        <button
          type="button"
          disabled={menyimpan}
          onClick={onKonfirmasiSiapCetak}
          className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${konfirmasi}`}
        >
          <BadgeCheck className="size-3.5" aria-hidden />
          {menyimpan ? 'Menyimpan…' : 'Konfirmasi siap cetak'}
        </button>
      </div>
    </div>
  )
}