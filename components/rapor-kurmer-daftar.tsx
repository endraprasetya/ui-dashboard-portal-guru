'use client'

import { useEffect, useState } from 'react'
import { Minus, Plus, Save } from 'lucide-react'
import {
  formatNilaiKurmer,
  JUMLAH_TP_MAX,
  JUMLAH_TP_MIN,
  nilaiAkhirKurmer,
  parseNilaiKurmer,
  predikatKurmer,
  type BarisNilaiKurmer,
  type FilterKurmer,
  type SiswaKurmer,
} from '@/lib/rapor-kurmer'

function InputNilai({
  value,
  onChange,
  ariaLabel,
  ditekankan,
}: {
  value: number | null
  onChange: (nilai: number | null) => void
  ariaLabel: string
  ditekankan?: boolean
}) {
  const [teks, setTeks] = useState(value == null ? '' : String(value))

  useEffect(() => {
    setTeks(value == null ? '' : String(value))
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={ariaLabel}
      value={teks}
      onChange={(event) => {
        const raw = event.target.value.replace(',', '.')
        if (raw && !/^\d{0,3}(\.\d{0,1})?$/.test(raw)) return
        if (Number(raw) > 100) return
        setTeks(raw)
        onChange(parseNilaiKurmer(raw))
      }}
      className={`w-14 rounded-md border px-1 py-1 text-center text-xs font-semibold tabular-nums ${
        ditekankan ? 'border-indigo-400 bg-indigo-50' : 'border-slate-200 bg-white'
      }`}
    />
  )
}

export function RaporKurmerDaftar({
  siswa,
  baris,
  filter,
  jumlahTp,
  memuat,
  menyimpan,
  status,
  galat,
  onJumlahTp,
  onUbah,
  onSimpan,
}: {
  siswa: SiswaKurmer[]
  baris: BarisNilaiKurmer[]
  filter: FilterKurmer
  jumlahTp: number
  memuat: boolean
  menyimpan: boolean
  status: string
  galat: boolean
  onJumlahTp: (n: number) => void
  onUbah: (idSiswa: string, patch: Partial<Pick<BarisNilaiKurmer, 'tp' | 'asts' | 'asas'>>) => void
  onSimpan: () => void
}) {
  const petaSiswa = new Map(siswa.map((item) => [item.id_siswa, item]))

  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Daftar Nilai &amp; Tujuan Pembelajaran</h3>
          <p className="text-[11px] text-slate-500">
            NH = rata-rata TP terisi · NA {filter.jenisAsesmen} dihitung otomatis · disimpan ke Supabase (realtime)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
            <span className="px-1 text-[11px] font-bold text-slate-500">Jumlah TP</span>
            <button
              type="button"
              aria-label="Kurangi TP"
              disabled={jumlahTp <= JUMLAH_TP_MIN}
              onClick={() => onJumlahTp(jumlahTp - 1)}
              className="rounded-lg p-1 text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-6 text-center text-xs font-black text-slate-800">{jumlahTp}</span>
            <button
              type="button"
              aria-label="Tambah TP"
              disabled={jumlahTp >= JUMLAH_TP_MAX}
              onClick={() => onJumlahTp(jumlahTp + 1)}
              className="rounded-lg p-1 text-slate-600 hover:bg-white disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={onSimpan}
            disabled={menyimpan || !filter.kelas || !filter.kodeMapel || siswa.length === 0}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <Save className="size-3.5" /> {menyimpan ? 'Menyimpan…' : 'Simpan Nilai'}
          </button>
        </div>
      </div>

      {status ? (
        <p className={`border-b px-4 py-2 text-xs font-semibold ${galat ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-emerald-100 bg-emerald-50 text-emerald-800'}`}>
          {status}
        </p>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-max w-full text-left text-xs">
          <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="sticky left-0 z-10 bg-slate-50 px-3 py-2">No</th>
              <th className="sticky left-8 z-10 min-w-44 bg-slate-50 px-3 py-2">NIS / Nama Peserta Didik</th>
              {Array.from({ length: jumlahTp }, (_, i) => (
                <th key={`tp-${i}`} className="px-1 py-2 text-center">
                  TP{i + 1}
                </th>
              ))}
              <th className="px-2 py-2 text-center">NH</th>
              <th className={`px-2 py-2 text-center ${filter.jenisAsesmen === 'ASTS' ? 'text-indigo-700' : ''}`}>ASTS</th>
              <th className={`px-2 py-2 text-center ${filter.jenisAsesmen === 'ASAS' ? 'text-indigo-700' : ''}`}>ASAS</th>
              <th className="px-2 py-2 text-center">NA</th>
              <th className="px-2 py-2 text-center">Predikat</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {memuat ? (
              <tr>
                <td colSpan={jumlahTp + 6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Memuat daftar siswa kelas {filter.kelas || '…'} dari database…
                </td>
              </tr>
            ) : !filter.kelas || !filter.kodeMapel ? (
              <tr>
                <td colSpan={jumlahTp + 6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Pilih kelas dan mata pelajaran untuk menampilkan lembar daftar nilai.
                </td>
              </tr>
            ) : siswa.length === 0 ? (
              <tr>
                <td colSpan={jumlahTp + 6} className="px-4 py-10 text-center text-sm text-slate-500">
                  Belum ada siswa pada kelas {filter.kelas}.
                </td>
              </tr>
            ) : (
              baris.map((row, index) => {
                const profil = petaSiswa.get(row.id_siswa)
                const na = nilaiAkhirKurmer(row.nh, row.asts, row.asas, filter.jenisAsesmen)
                return (
                  <tr key={row.id_siswa} className="hover:bg-indigo-50/40">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-center tabular-nums text-slate-500">
                      {index + 1}
                    </td>
                    <td className="sticky left-8 z-10 min-w-44 bg-white px-3 py-1.5">
                      <p className="font-bold text-slate-800">{profil?.nama_siswa || row.id_siswa}</p>
                      <p className="text-[10px] text-slate-500">NIS {profil?.nis || '—'}</p>
                    </td>
                    {row.tp.map((nilai, tpIndex) => (
                      <td key={`${row.id_siswa}-tp-${tpIndex}`} className="px-1 py-1">
                        <InputNilai
                          value={nilai}
                          ariaLabel={`TP${tpIndex + 1} ${profil?.nama_siswa || ''}`}
                          onChange={(berikutnya) => {
                            const tp = [...row.tp]
                            tp[tpIndex] = berikutnya
                            onUbah(row.id_siswa, { tp })
                          }}
                        />
                      </td>
                    ))}
                    <td className="px-2 py-1.5 text-center font-black tabular-nums text-slate-800">
                      {formatNilaiKurmer(row.nh)}
                    </td>
                    <td className="px-1 py-1">
                      <InputNilai
                        value={row.asts}
                        ariaLabel={`ASTS ${profil?.nama_siswa || ''}`}
                        ditekankan={filter.jenisAsesmen === 'ASTS'}
                        onChange={(asts) => onUbah(row.id_siswa, { asts })}
                      />
                    </td>
                    <td className="px-1 py-1">
                      <InputNilai
                        value={row.asas}
                        ariaLabel={`ASAS ${profil?.nama_siswa || ''}`}
                        ditekankan={filter.jenisAsesmen === 'ASAS'}
                        onChange={(asas) => onUbah(row.id_siswa, { asas })}
                      />
                    </td>
                    <td className="px-2 py-1.5 text-center font-black tabular-nums text-indigo-700">
                      {formatNilaiKurmer(na)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold text-slate-600">{predikatKurmer(na)}</td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
