'use client'

import {
  DAFTAR_MAPEL_KURMER,
  formatNilaiKurmer,
  MAPEL_DINIYYAH_KURMER,
  MAPEL_UMUM_KURMER,
  type BarisLedgerKurmer,
  type FilterKurmer,
  type RekapMapelLedger,
} from '@/lib/rapor-kurmer'

function selNilai(n: number | null) {
  return n == null ? 'text-slate-300' : n >= 90 ? 'text-emerald-700' : n < 70 ? 'text-rose-600' : 'text-slate-800'
}

export function RaporKurmerLedger({
  filter,
  baris,
  rekap,
  memuat,
}: {
  filter: FilterKurmer
  baris: BarisLedgerKurmer[]
  rekap: RekapMapelLedger[]
  memuat: boolean
}) {
  const petaRekap = new Map(rekap.map((item) => [item.mapel.kode, item]))

  return (
    <div className="space-y-4">
      <section className="grid gap-3 sm:grid-cols-2">
        <KartuRekapKelompok judul="Kelompok Umum" daftar={MAPEL_UMUM_KURMER.map((mapel) => petaRekap.get(mapel.kode)!).filter(Boolean)} />
        <KartuRekapKelompok judul="Kelompok Diniyyah" daftar={MAPEL_DINIYYAH_KURMER.map((mapel) => petaRekap.get(mapel.kode)!).filter(Boolean)} />
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-4 py-3">
          <h3 className="text-sm font-extrabold text-slate-900">Ledger Nilai Kelas {filter.kelas || '—'}</h3>
          <p className="text-[11px] text-slate-500">
            Rekap NA {filter.jenisAsesmen} seluruh muatan pelajaran · Total, rata-rata, tertinggi, dan terendah per siswa
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-max w-full text-left text-[11px]">
            <thead className="bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th rowSpan={2} className="sticky left-0 z-10 bg-slate-50 px-3 py-2">
                  No
                </th>
                <th rowSpan={2} className="sticky left-8 z-10 min-w-40 bg-slate-50 px-3 py-2">
                  NIS / Nama
                </th>
                <th colSpan={MAPEL_UMUM_KURMER.length} className="border-l border-slate-200 px-2 py-1 text-center text-indigo-700">
                  Umum
                </th>
                <th colSpan={MAPEL_DINIYYAH_KURMER.length} className="border-l border-slate-200 px-2 py-1 text-center text-teal-700">
                  Diniyyah
                </th>
                <th colSpan={4} className="border-l border-slate-200 px-2 py-1 text-center text-slate-700">
                  Rekap
                </th>
              </tr>
              <tr>
                {DAFTAR_MAPEL_KURMER.map((mapel) => (
                  <th key={mapel.kode} className="max-w-16 border-l border-slate-100 px-1 py-2 text-center leading-tight">
                    {mapel.nama}
                  </th>
                ))}
                <th className="border-l border-slate-200 px-2 py-2 text-center">Total</th>
                <th className="px-2 py-2 text-center">Rata-rata</th>
                <th className="px-2 py-2 text-center">Tertinggi</th>
                <th className="px-2 py-2 text-center">Terendah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {memuat ? (
                <tr>
                  <td colSpan={DAFTAR_MAPEL_KURMER.length + 6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Menyusun ledger kelas…
                  </td>
                </tr>
              ) : !filter.kelas ? (
                <tr>
                  <td colSpan={DAFTAR_MAPEL_KURMER.length + 6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Pilih kelas untuk menampilkan ledger nilai.
                  </td>
                </tr>
              ) : baris.length === 0 ? (
                <tr>
                  <td colSpan={DAFTAR_MAPEL_KURMER.length + 6} className="px-4 py-10 text-center text-sm text-slate-500">
                    Belum ada siswa pada kelas {filter.kelas}.
                  </td>
                </tr>
              ) : (
                baris.map((item, index) => (
                  <tr key={item.siswa.id_siswa} className="hover:bg-slate-50/80">
                    <td className="sticky left-0 z-10 bg-white px-3 py-1.5 text-center tabular-nums text-slate-500">
                      {index + 1}
                    </td>
                    <td className="sticky left-8 z-10 min-w-40 bg-white px-3 py-1.5">
                      <p className="font-bold text-slate-800">{item.siswa.nama_siswa}</p>
                      <p className="text-[10px] text-slate-500">NIS {item.siswa.nis || '—'}</p>
                    </td>
                    {DAFTAR_MAPEL_KURMER.map((mapel) => (
                      <td
                        key={`${item.siswa.id_siswa}-${mapel.kode}`}
                        className={`border-l border-slate-50 px-1 py-1.5 text-center font-bold tabular-nums ${selNilai(item.nilai[mapel.kode] ?? null)}`}
                      >
                        {formatNilaiKurmer(item.nilai[mapel.kode] ?? null)}
                      </td>
                    ))}
                    <td className="border-l border-slate-200 px-2 py-1.5 text-center font-black tabular-nums text-slate-800">
                      {formatNilaiKurmer(item.statistik.total)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-black tabular-nums text-indigo-700">
                      {formatNilaiKurmer(item.statistik.rata)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold tabular-nums text-emerald-700">
                      {formatNilaiKurmer(item.statistik.tertinggi)}
                    </td>
                    <td className="px-2 py-1.5 text-center font-bold tabular-nums text-rose-600">
                      {formatNilaiKurmer(item.statistik.terendah)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {baris.length > 0 ? (
              <tfoot className="bg-slate-50 text-[11px] font-bold">
                <tr>
                  <td colSpan={2} className="sticky left-0 z-10 bg-slate-50 px-3 py-2">
                    Rekap kelas
                  </td>
                  {rekap.map((item) => (
                    <td key={`rekap-${item.mapel.kode}`} className="border-l border-slate-100 px-1 py-2 text-center tabular-nums">
                      <span className="block text-slate-800">{formatNilaiKurmer(item.rata)}</span>
                      <span className="block text-[9px] font-semibold text-slate-400">
                        {formatNilaiKurmer(item.terendah)}–{formatNilaiKurmer(item.tertinggi)}
                      </span>
                    </td>
                  ))}
                  <td colSpan={4} className="border-l border-slate-200 px-2 py-2 text-slate-500">
                    Rata · min–maks per mapel
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </div>
      </section>
    </div>
  )
}

function KartuRekapKelompok({ judul, daftar }: { judul: string; daftar: RekapMapelLedger[] }) {
  const terisi = daftar.filter((item) => item.terisi > 0)
  const rataKelompok =
    terisi.length > 0 ? terisi.reduce((jumlah, item) => jumlah + (item.rata || 0), 0) / terisi.length : null

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between">
        <h4 className="text-sm font-extrabold text-slate-900">{judul}</h4>
        <p className="text-xs font-bold text-indigo-700">Rata {formatNilaiKurmer(rataKelompok == null ? null : Math.round(rataKelompok * 10) / 10)}</p>
      </div>
      <div className="space-y-1.5">
        {daftar.map((item) => (
          <div key={item.mapel.kode} className="flex items-center justify-between gap-2 text-[11px]">
            <span className="truncate font-semibold text-slate-600">{item.mapel.nama}</span>
            <span className="shrink-0 tabular-nums text-slate-500">
              {formatNilaiKurmer(item.rata)} · max {formatNilaiKurmer(item.tertinggi)} · min {formatNilaiKurmer(item.terendah)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
