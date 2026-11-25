'use client'

import { PLACEHOLDER_CATATAN_PEMERIKSA_HQ, type JenisCatatanPemeriksaHq } from '@/lib/rapor-hq-kirim'

export function CatatanPemeriksaHq({
  nilai,
  onUbah,
  menyimpan,
  onSimpan,
  labelAria,
  ringkas = '',
  jenisTersimpan = '',
  aksen = 'violet',
}: {
  nilai: string
  onUbah: (nilai: string) => void
  menyimpan: boolean
  onSimpan: () => void
  labelAria: string
  ringkas?: string
  jenisTersimpan?: JenisCatatanPemeriksaHq
  aksen?: 'violet' | 'hijau'
}) {
  const tombol = aksen === 'hijau' ? 'bg-[#143d32] hover:bg-[#0f2e26]' : 'bg-violet-700 hover:bg-violet-800'
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
      <button
        type="button"
        disabled={menyimpan}
        onClick={onSimpan}
        className={`mt-2 rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${tombol}`}
      >
        {menyimpan ? 'Menyimpan…' : 'Simpan'}
      </button>
    </div>
  )
}
