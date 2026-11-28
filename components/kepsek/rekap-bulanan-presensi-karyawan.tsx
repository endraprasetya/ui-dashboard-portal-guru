'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Download, Printer, RefreshCw, X } from 'lucide-react'
import type { BarisBulanSidia, KelompokSidia, RekapBulananSidia, SelBulanSidia } from '@/lib/sidia-absensi'
import { todayInputValue } from '@/lib/jurnal'

const HARI_SINGKAT = ['Ah', 'Sn', 'Sl', 'Rb', 'Km', 'Jm', 'Sb']

function bulanAwal() {
  return todayInputValue().slice(0, 7)
}

function potongJam(jam?: string) {
  if (!jam) return ''
  const [jamAngka, menit] = jam.split(':')
  if (!jamAngka || menit == null || menit === '') return jam
  return `${jamAngka.padStart(2, '0')}.${menit.slice(0, 2).padStart(2, '0')}`
}

function isiSel(sel?: SelBulanSidia) {
  if (!sel) return { atas: '', bawah: '', judul: 'Tidak ada presensi' }
  if (sel.status === 'Izin') return { atas: 'Izin', bawah: '', judul: 'Izin' }
  if (sel.status === 'Tidak Masuk') return { atas: 'TK', bawah: '', judul: 'Tidak masuk' }
  const masuk = potongJam(sel.jamMasuk)
  const pulang = potongJam(sel.jamPulang)
  const ketepatan = sel.ketepatan && sel.ketepatan !== '—' ? sel.ketepatan : ''
  return {
    atas: masuk || (sel.status === 'Masuk' ? 'H' : ''),
    bawah: pulang,
    judul: [sel.status, ketepatan, masuk && `masuk ${masuk}`, pulang && `pulang ${pulang}`].filter(Boolean).join(' · '),
  }
}

function teksEkspor(sel?: SelBulanSidia) {
  const isi = isiSel(sel)
  if (isi.atas && isi.bawah) return `${isi.atas} / ${isi.bawah}`
  return isi.atas || isi.bawah
}

function kelasSel(sel: SelBulanSidia | undefined, libur: boolean) {
  if (!sel) return libur ? 'bg-rose-50/80 text-slate-300' : 'text-slate-300'
  if (sel.status === 'Izin') return 'bg-sky-50 text-sky-900'
  if (sel.status === 'Tidak Masuk') return 'bg-rose-50 text-rose-800'
  if (sel.ketepatan === 'Terlambat') return 'bg-amber-50 text-amber-950'
  if (sel.status === 'Masuk') return 'bg-emerald-50 text-emerald-900'
  return ''
}

function kutip(nilai: string) {
  return `"${nilai.replace(/"/g, '""')}"`
}

function unduhBerkas(nama: string, blob: Blob) {
  const url = URL.createObjectURL(blob)
  const tautan = document.createElement('a')
  tautan.href = url
  tautan.download = nama
  tautan.click()
  URL.revokeObjectURL(url)
}

function kelompokTampil(baris: BarisBulanSidia[], unit: 'Semua' | KelompokSidia, lembaga: string) {
  const sumber = baris.filter((item) => {
    if (unit !== 'Semua' && item.kelompok !== unit) return false
    if (lembaga !== 'Semua' && item.lembaga !== lembaga) return false
    return true
  })
  const grup = new Map<string, BarisBulanSidia[]>()
  for (const item of sumber) {
    const kunci = item.lembaga || item.kelompok
    const daftar = grup.get(kunci) || []
    daftar.push(item)
    grup.set(kunci, daftar)
  }
  return [...grup.entries()]
}

export function RekapBulananPresensiKaryawan({ dalamModal = false }: { dalamModal?: boolean }) {
  const [bulan, setBulan] = useState(bulanAwal)
  const [unit, setUnit] = useState<'Semua' | KelompokSidia>('Semua')
  const [lembaga, setLembaga] = useState('Semua')
  const [data, setData] = useState<RekapBulananSidia | null>(null)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')

  const muat = useCallback(async () => {
    const [tahunTeks, bulanTeks] = bulan.split('-')
    const tahun = Number(tahunTeks)
    const angkaBulan = Number(bulanTeks)
    if (!tahun || !angkaBulan) return
    setMemuat(true)
    setGalat('')
    try {
      const res = await fetch(
        `/api/kepsek/sidia-absensi?mode=bulanan&tahun=${tahun}&bulan=${angkaBulan}`,
        { cache: 'no-store' },
      )
      const json = (await res.json()) as RekapBulananSidia | { pesan?: string }
      if (!res.ok) throw new Error(('pesan' in json && json.pesan) || 'Rekap bulanan belum dapat dimuat.')
      setData(json as RekapBulananSidia)
    } catch (error) {
      setData(null)
      setGalat(error instanceof Error ? error.message : 'Rekap bulanan belum dapat dimuat.')
    } finally {
      setMemuat(false)
    }
  }, [bulan])

  useEffect(() => {
    void muat()
  }, [muat])

  const pilihanLembaga = useMemo(() => {
    const daftar = (data?.baris || []).filter((item) => unit === 'Semua' || item.kelompok === unit)
    return [...new Set(daftar.map((item) => item.lembaga).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id'))
  }, [data, unit])

  useEffect(() => {
    if (lembaga !== 'Semua' && !pilihanLembaga.includes(lembaga)) setLembaga('Semua')
  }, [lembaga, pilihanLembaga])

  const grup = useMemo(
    () => kelompokTampil(data?.baris || [], unit, lembaga),
    [data, unit, lembaga],
  )
  const jumlahHari = data?.jumlahHari || 31
  const [tahunAngka, bulanAngka] = bulan.split('-').map(Number)
  const hari = Array.from({ length: jumlahHari }, (_, indeks) => indeks + 1)
  const namaBerkas = `rekap-presensi-karyawan-${bulan}`

  const barisEkspor = useMemo(() => {
    const hasil: { no: number; lembaga: string; nama: string; item: BarisBulanSidia }[] = []
    let no = 0
    for (const [namaLembaga, daftar] of grup) {
      for (const item of daftar) {
        no += 1
        hasil.push({ no, lembaga: namaLembaga, nama: item.namaGuru, item })
      }
    }
    return hasil
  }, [grup])

  const eksporCsv = () => {
    const kepala = ['No', 'Unit/Lembaga', 'Nama Karyawan', ...hari.map((tanggal) => String(tanggal).padStart(2, '0'))]
    const isi = [
      kepala.map(kutip).join(','),
      ...barisEkspor.map((baris) =>
        [
          String(baris.no),
          kutip(baris.lembaga),
          kutip(baris.nama),
          ...hari.map((tanggal) => kutip(teksEkspor(baris.item.hari[String(tanggal).padStart(2, '0')]))),
        ].join(','),
      ),
    ].join('\r\n')
    unduhBerkas(`${namaBerkas}.csv`, new Blob([`\uFEFF${isi}`], { type: 'text/csv;charset=utf-8' }))
  }

  const eksporExcel = () => {
    const kepala = ['No', 'Unit/Lembaga', 'Nama Karyawan', ...hari.map((tanggal) => String(tanggal).padStart(2, '0'))]
    const sel = (nilai: string) => `<td>${nilai.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</td>`
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body><table border="1"><thead><tr>${kepala
      .map((kolom) => `<th>${kolom}</th>`)
      .join('')}</tr></thead><tbody>${barisEkspor
      .map(
        (baris) =>
          `<tr><td>${baris.no}</td>${sel(baris.lembaga)}${sel(baris.nama)}${hari
            .map((tanggal) => sel(teksEkspor(baris.item.hari[String(tanggal).padStart(2, '0')])))
            .join('')}</tr>`,
      )
      .join('')}</tbody></table></body></html>`
    unduhBerkas(`${namaBerkas}.xls`, new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8' }))
  }

  const cetak = () => {
    const gaya = document.createElement('style')
    gaya.setAttribute('data-cetak-presensi', '1')
    gaya.textContent = '@page { size: A4 landscape; margin: 8mm; }'
    document.head.appendChild(gaya)
    document.body.classList.add('cetak-rekap-presensi')
    const selesai = () => {
      document.body.classList.remove('cetak-rekap-presensi')
      gaya.remove()
      window.removeEventListener('afterprint', selesai)
    }
    window.addEventListener('afterprint', selesai)
    window.print()
  }

  return (
    <section
      className={`rekap-presensi-karyawan ${
        dalamModal ? 'border-0 bg-transparent p-0 shadow-none' : 'rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4'
      }`}
    >
      <style>{`
        .rekap-presensi-table { border-collapse: collapse; width: max-content; min-width: 100%; font-variant-numeric: tabular-nums; }
        .rekap-presensi-table th, .rekap-presensi-table td { border: 1px solid #cbd5e1; padding: 3px 2px; text-align: center; vertical-align: middle; }
        .rekap-presensi-table .nama-col { min-width: 12rem; padding-left: 8px; padding-right: 8px; text-align: left; }
        @media print {
          body.cetak-rekap-presensi * { visibility: hidden !important; }
          body.cetak-rekap-presensi .rekap-presensi-karyawan,
          body.cetak-rekap-presensi .rekap-presensi-karyawan * { visibility: visible !important; }
          body.cetak-rekap-presensi .rekap-presensi-karyawan {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            border: 0 !important;
            box-shadow: none !important;
          }
          body.cetak-rekap-presensi .rekap-presensi-karyawan .no-print,
          body.cetak-rekap-presensi .rekap-presensi-karyawan .no-print * { display: none !important; visibility: hidden !important; }
          body.cetak-rekap-presensi .no-print-modal-rekap,
          body.cetak-rekap-presensi .no-print-modal-rekap * { display: none !important; visibility: hidden !important; }
          body.cetak-rekap-presensi .overlay-rekap-presensi-modal { position: static !important; inset: auto !important; background: transparent !important; padding: 0 !important; overflow: visible !important; }
          body.cetak-rekap-presensi .rekap-presensi-scroll { overflow: visible !important; }
          body.cetak-rekap-presensi .rekap-presensi-table { font-size: 6.5pt; }
          body.cetak-rekap-presensi .rekap-presensi-table .nama-col { min-width: 0 !important; position: static !important; }
        }
      `}</style>

      <div className="mb-3 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        {!dalamModal ? (
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">Rekapitulasi Bulanan Presensi Karyawan</h2>
            <p className="mt-1 text-xs text-slate-500">
              Gaya SIDIA · {data?.labelBulan || bulan} · jam masuk di atas, jam pulang di bawah
              {data ? ` · ${barisEkspor.length} karyawan` : ''}
            </p>
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            {data?.labelBulan || bulan}
            {data ? ` · ${barisEkspor.length} karyawan` : ''}
          </p>
        )}
        <div className="no-print flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-600">
            Bulan & tahun
            <input
              type="month"
              value={bulan}
              onChange={(event) => setBulan(event.target.value)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs font-bold text-slate-600">
            Unit
            <select
              value={unit}
              onChange={(event) => setUnit(event.target.value as 'Semua' | KelompokSidia)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-2 text-sm"
            >
              <option value="Semua">Semua</option>
              <option value="Putra">Putra</option>
              <option value="Putri">Putri</option>
            </select>
          </label>
          <label className="text-xs font-bold text-slate-600">
            Lembaga
            <select
              value={lembaga}
              onChange={(event) => setLembaga(event.target.value)}
              className="mt-1 block max-w-[16rem] rounded-lg border border-slate-200 px-2 py-2 text-sm"
            >
              <option value="Semua">Semua</option>
              {pilihanLembaga.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() => void muat()}
            disabled={memuat}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            <RefreshCw className={`size-3.5 ${memuat ? 'animate-spin' : ''}`} />
            Muat ulang
          </button>
          <button
            type="button"
            onClick={eksporExcel}
            disabled={barisEkspor.length === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Download className="size-3.5" /> Excel
          </button>
          <button
            type="button"
            onClick={eksporCsv}
            disabled={barisEkspor.length === 0}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Download className="size-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={cetak}
            disabled={barisEkspor.length === 0}
            className="inline-flex items-center gap-1 rounded-lg bg-[#143d32] px-3 py-2 text-xs font-bold text-white disabled:opacity-40"
          >
            <Printer className="size-3.5" /> Cetak
          </button>
        </div>
      </div>

      <p className="mb-3 text-[11px] leading-relaxed text-slate-500">
        Izin dan TK (tidak masuk) ditulis singkat. Kolom Jumat dan Ahad ditandai libur. Filter lembaga diterapkan setelah data bulan terpilih dimuat.
      </p>

      {memuat ? <p className="text-sm text-slate-500">Mengambil rekap presensi bulan ini...</p> : null}
      {!memuat && galat ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p>
      ) : null}
      {!memuat && !galat && data?.catatan?.length ? (
        <ul className="mb-2 space-y-1 text-xs text-amber-800">
          {data.catatan.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ) : null}
      {!memuat && !galat && barisEkspor.length === 0 ? (
        <p className="py-4 text-center text-sm text-slate-500">Belum ada presensi karyawan pada bulan dan unit ini.</p>
      ) : null}

      {!memuat && !galat && barisEkspor.length > 0 ? (
        <div className="rekap-presensi-scroll overflow-x-auto rounded-xl border border-slate-200">
          <table className="rekap-presensi-table text-[10px] text-slate-700">
            <caption className="sr-only">Rekapitulasi bulanan presensi karyawan {data?.labelBulan}</caption>
            <thead>
              <tr className="bg-[#143d32] font-bold text-white">
                <th className="w-8">No</th>
                <th className="nama-col sticky left-0 z-20 bg-[#143d32]">Nama Karyawan</th>
                {hari.map((tanggal) => {
                  const indeks = tahunAngka && bulanAngka ? new Date(tahunAngka, bulanAngka - 1, tanggal).getDay() : -1
                  const libur = indeks === 0 || indeks === 5
                  return (
                    <th key={tanggal} className={`min-w-[2.6rem] ${libur ? 'bg-[#1f5c4c]' : ''}`}>
                      {String(tanggal).padStart(2, '0')}
                    </th>
                  )
                })}
              </tr>
              <tr className="bg-[#1a4f42] font-semibold text-white/80">
                <th />
                <th className="nama-col sticky left-0 z-20 bg-[#1a4f42]" />
                {hari.map((tanggal) => {
                  const indeks = tahunAngka && bulanAngka ? new Date(tahunAngka, bulanAngka - 1, tanggal).getDay() : -1
                  const libur = indeks === 0 || indeks === 5
                  return (
                    <th key={`hari-${tanggal}`} className={libur ? 'bg-[#1f5c4c]' : ''}>
                      {indeks >= 0 ? HARI_SINGKAT[indeks] : ''}
                    </th>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {grup.flatMap(([namaLembaga, daftar]) => {
                const awal = barisEkspor.find((baris) => baris.lembaga === namaLembaga && baris.nama === daftar[0]?.namaGuru)?.no || 1
                return [
                  <tr key={`unit-${namaLembaga}`}>
                    <td colSpan={2 + hari.length} className="bg-slate-100 px-2 py-1.5 text-left text-[11px] font-extrabold text-slate-800">
                      {namaLembaga}
                    </td>
                  </tr>,
                  ...daftar.map((item, indeks) => {
                    return (
                      <tr key={`${item.kelompok}-${namaLembaga}-${item.namaGuru}`}>
                        <td>{awal + indeks}</td>
                        <td className="nama-col sticky left-0 z-10 bg-white font-bold text-slate-900">{item.namaGuru}</td>
                        {hari.map((tanggal) => {
                          const kunci = String(tanggal).padStart(2, '0')
                          const sel = item.hari[kunci]
                          const hariMinggu = tahunAngka && bulanAngka ? new Date(tahunAngka, bulanAngka - 1, tanggal).getDay() : -1
                          const libur = hariMinggu === 0 || hariMinggu === 5
                          const isi = isiSel(sel)
                          return (
                            <td key={kunci} title={isi.judul} className={kelasSel(sel, libur)}>
                              {isi.atas ? <span className="block leading-tight">{isi.atas}</span> : libur && !sel ? '' : ''}
                              {isi.bawah ? <span className="block leading-tight">{isi.bawah}</span> : null}
                            </td>
                          )
                        })}
                      </tr>
                    )
                  }),
                ]
              })}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  )
}

export function ModalRekapBulananPresensiKaryawan({ buka, onTutup }: { buka: boolean; onTutup: () => void }) {
  useEffect(() => {
    if (!buka) return
    const padaEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onTutup()
    }
    window.addEventListener('keydown', padaEscape)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', padaEscape)
      document.body.style.overflow = overflow
    }
  }, [buka, onTutup])

  if (!buka) return null

  return (
    <div
      className="overlay-rekap-presensi-modal fixed inset-0 z-[75] flex items-end justify-center bg-slate-900/55 p-2 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-modal-rekap-presensi"
      onClick={onTutup}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-[min(100%,72rem)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="no-print-modal-rekap flex shrink-0 items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div className="min-w-0">
            <h2 id="judul-modal-rekap-presensi" className="text-sm font-extrabold text-slate-900 sm:text-base">
              Rekapitulasi Bulanan Presensi Karyawan
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">Gaya SIDIA · jam masuk di atas, jam pulang di bawah</p>
          </div>
          <button
            type="button"
            onClick={onTutup}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
            aria-label="Tutup"
          >
            <X className="size-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3 sm:px-4 sm:py-4">
          <RekapBulananPresensiKaryawan dalamModal />
        </div>
        <div className="no-print-modal-rekap shrink-0 border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onTutup}
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50 sm:w-auto"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  )
}
