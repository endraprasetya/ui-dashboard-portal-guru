'use client'

import { todayInputValue } from '@/lib/jurnal'

export function FilterTanggalKelas({
  tanggal,
  kelas,
  daftarKelas,
  onTanggal,
  onKelas,
  semuaKelas = true,
}: {
  tanggal: string
  kelas: string
  daftarKelas: string[]
  onTanggal: (v: string) => void
  onKelas: (v: string) => void
  semuaKelas?: boolean
}) {
  return (
    <div className="mb-3 flex flex-wrap items-end gap-3">
      <label className="text-xs font-bold text-slate-600">
        Tanggal
        <input
          type="date"
          value={tanggal}
          max={todayInputValue()}
          onChange={(e) => onTanggal(e.target.value)}
          className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
        />
      </label>
      <label className="text-xs font-bold text-slate-600">
        Kelas
        <select value={kelas} onChange={(e) => onKelas(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal">
          {semuaKelas && <option value="">Semua kelas</option>}
          {daftarKelas.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </label>
    </div>
  )
}

export function FilterGuru({
  guru,
  daftarGuru,
  onGuru,
}: {
  guru: string
  daftarGuru: string[]
  onGuru: (v: string) => void
}) {
  return (
    <label className="text-xs font-bold text-slate-600">
      Guru
      <select value={guru} onChange={(e) => onGuru(e.target.value)} className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal">
        <option value="">Semua guru</option>
        {daftarGuru.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
    </label>
  )
}
