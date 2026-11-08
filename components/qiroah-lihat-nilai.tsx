'use client'

import { useState } from 'react'
import { Eye, X } from 'lucide-react'
import type { HasilUjianCetak } from '@/components/cetak-ujian-qiroah'
import { lulusUjian } from '@/components/cetak-ujian-qiroah'

function formatTanggal(value?: string) {
  const iso = String(value || '').slice(0, 10)
  if (!iso) return '—'
  const date = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value || '—'
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function ModalDetailNilaiUjianQiroah({ data, onTutup }: { data: HasilUjianCetak; onTutup: () => void }) {
  const tampilTajwid = data.tajwid != null
  const lulus = lulusUjian(data.keputusan)

  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-slate-900/50 p-4" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-[#143d32] px-4 py-3 text-white">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wide text-emerald-100">Hasil ujian kenaikan jilid</p>
            <h2 className="text-base font-black">{data.nama}</h2>
            <p className="text-xs text-emerald-50/90">
              {data.kelas} · {formatTanggal(data.tanggal)}
            </p>
          </div>
          <button type="button" onClick={onTutup} className="rounded-lg p-1 hover:bg-white/10" aria-label="Tutup">
            <X className="size-4" />
          </button>
        </div>
        <div className="space-y-4 p-4 text-sm">
          <dl className="grid grid-cols-2 gap-2 text-xs">
            <BarisInfo label="Jilid" value={`${data.jilidAsal} → ${data.jilidTujuan || '—'}`} />
            <BarisInfo label="Penguji" value={data.penguji} />
            <BarisInfo label="Guru pengampu" value={data.guruPengampu || '—'} />
            <BarisInfo label="Nilai akhir" value={String(data.nilaiAkhir || '—')} bold />
            <BarisInfo label="Predikat" value={data.predikat || '—'} />
            <BarisInfo
              label="Keputusan"
              value={data.keputusan || '—'}
              bold
              warna={lulus ? 'text-emerald-700' : 'text-amber-800'}
            />
          </dl>
          <div>
            <p className="text-[11px] font-extrabold uppercase text-slate-500">Komponen penilaian</p>
            <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Skor label="Kelancaran" nilai={data.kelancaran} />
              <Skor label="Makhraj" nilai={data.makhraj} />
              <Skor label="Harakat" nilai={data.harakat} />
              {tampilTajwid ? <Skor label="Tajwid" nilai={data.tajwid ?? 0} /> : null}
              <Skor label="Adab" nilai={data.adab} />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-[11px] font-extrabold uppercase text-slate-500">Catatan penguji</p>
            <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-700">{data.catatan?.trim() || 'Tidak ada catatan.'}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function BarisInfo({
  label,
  value,
  bold,
  warna,
}: {
  label: string
  value: string
  bold?: boolean
  warna?: string
}) {
  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-2 py-1.5">
      <dt className="text-[10px] font-bold text-slate-500">{label}</dt>
      <dd className={`mt-0.5 ${bold ? 'font-extrabold' : 'font-medium'} ${warna || 'text-slate-800'}`}>{value}</dd>
    </div>
  )
}

function Skor({ label, nilai }: { label: string; nilai: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-2 py-2 text-center">
      <p className="text-[10px] font-bold text-slate-500">{label}</p>
      <p className="text-lg font-black text-slate-900">{Number.isFinite(nilai) ? nilai : '—'}</p>
    </div>
  )
}

export function TombolLihatNilaiUjian({
  data,
  className = '',
}: {
  data: HasilUjianCetak | null
  className?: string
}) {
  const [buka, setBuka] = useState(false)
  const adaNilai =
    (Number.isFinite(data?.nilaiAkhir) && Number(data!.nilaiAkhir) > 0) ||
    Number(data?.kelancaran || 0) > 0 ||
    Boolean(data?.predikat && data.predikat !== '-')
  if (!data || !adaNilai) return <span className="text-xs text-slate-400">—</span>
  return (
    <>
      <button
        type="button"
        onClick={() => setBuka(true)}
        className={`inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-2 py-1 text-[11px] font-bold text-white hover:bg-emerald-900 ${className}`}
      >
        <Eye className="size-3" /> Lihat Nilai
      </button>
      {buka && <ModalDetailNilaiUjianQiroah data={data} onTutup={() => setBuka(false)} />}
    </>
  )
}
