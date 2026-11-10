'use client'

import { useEffect, useMemo, useState } from 'react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import type { LaporanKepsek } from '@/lib/kepala-sekolah'
import {
  muatAbsensiGuruBantuKepsek,
  muatRekapBulananGuruBantuKepsek,
  type RekapAbsensiGuruBantuKepsek,
  type RekapBulananGuruBantuKepsek,
} from '@/lib/kepsek-guru-bantu'
import { todayInputValue } from '@/lib/jurnal'
import { formatTanggalID } from '@/lib/guru-bantu/utils'
import {
  PILIHAN_ASESMEN_RAPOR_HQ,
  hitungPemantauanRaporHq,
  type KodeAsesmenRaporHq,
} from '@/lib/kepsek-rapor-hq'

function BadgeStatus({ teks }: { teks: string }) {
  const sudah = teks === 'Sudah Menyetorkan'
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sudah ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}
    >
      {teks}
    </span>
  )
}

function BadgeAbsen({ status }: { status: string }) {
  const teks = String(status || '').trim()
  const lower = teks.toLowerCase()
  let kelas = 'bg-slate-100 text-slate-600'
  if (teks === 'Hadir') kelas = 'bg-emerald-100 text-emerald-800'
  else if (teks === 'Terlambat') kelas = 'bg-amber-100 text-amber-900'
  else if (lower.includes('sakit') || lower.includes('kesehatan')) kelas = 'bg-orange-100 text-orange-900'
  else if (lower.includes('izin') || lower.includes('cuti') || lower.includes('tugas')) kelas = 'bg-sky-100 text-sky-800'
  else if (lower.includes('alpa')) kelas = 'bg-rose-100 text-rose-800'
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${kelas}`}>{teks || '—'}</span>
}

function ThumbnailFoto({ url, label }: { url: string | null; label: string }) {
  if (!url) return <span className="text-xs text-slate-400">—</span>
  return (
    <a href={url} target="_blank" rel="noreferrer" className="inline-flex flex-col items-center gap-1">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={label} className="size-12 rounded-lg border border-slate-200 object-cover" />
      <span className="text-[10px] font-bold text-emerald-800 underline">{label}</span>
    </a>
  )
}

export function ModalRaporHq({ laporan, onTutup }: { laporan: LaporanKepsek; onTutup: () => void }) {
  const [asesmen, setAsesmen] = useState<KodeAsesmenRaporHq>(laporan.raporHqRingkas.asesmen)
  const baris = useMemo(
    () => hitungPemantauanRaporHq(laporan.raporHqMentah, asesmen),
    [laporan.raporHqMentah, asesmen],
  )
  const { tahunAjaran, semester } = laporan.raporHqMentah

  return (
    <ModalKerangka
      judul="Pemantauan Rapor HQ"
      keterangan={`Unit ${laporan.unit} · ${semester} ${tahunAjaran}. Status menyetorkan nilai ujian tahfidz per kelas binaan.`}
      onTutup={onTutup}
      lebar="max-w-4xl"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {PILIHAN_ASESMEN_RAPOR_HQ.map((item) => (
          <button
            key={item.kode}
            type="button"
            onClick={() => setAsesmen(item.kode)}
            className={`rounded-lg px-3 py-1.5 text-xs font-bold ${
              asesmen === item.kode ? 'bg-[#143d32] text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
      {baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada kombinasi guru–kelas binaan di unit ini.</p>
      ) : (
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="border-b p-2">Nama guru</th>
              <th className="border-b p-2">Kelas</th>
              <th className="border-b p-2">Status asesmen</th>
            </tr>
          </thead>
          <tbody>
            {baris.map((row) => (
              <tr key={`${row.namaGuru}-${row.kelas}`}>
                <td className="border-b p-2 font-bold">{row.namaGuru}</td>
                <td className="border-b p-2">{row.kelas}</td>
                <td className="border-b p-2">
                  <BadgeStatus teks={row.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </ModalKerangka>
  )
}

export function ModalGuruBantu({
  rekap,
  unit,
  onTutup,
}: {
  rekap: RekapAbsensiGuruBantuKepsek
  unit: string
  onTutup: () => void
}) {
  const hariIni = todayInputValue()
  const [tanggal, setTanggal] = useState(rekap.tanggal || hariIni)
  const [bulan, setBulan] = useState((rekap.tanggal || hariIni).slice(0, 7))
  const [harian, setHarian] = useState(rekap)
  const [bulanan, setBulanan] = useState<RekapBulananGuruBantuKepsek | null>(null)
  const [memuatHarian, setMemuatHarian] = useState(false)
  const [memuatBulanan, setMemuatBulanan] = useState(true)
  const [galatHarian, setGalatHarian] = useState('')
  const [galatBulanan, setGalatBulanan] = useState('')

  useEffect(() => {
    let batal = false
    if (tanggal === rekap.tanggal) {
      setHarian(rekap)
      setMemuatHarian(false)
      return
    }
    setMemuatHarian(true)
    muatAbsensiGuruBantuKepsek(tanggal)
      .then((hasil) => {
        if (!batal) {
          setHarian(hasil)
          setGalatHarian('')
        }
      })
      .catch((error: Error) => {
        if (!batal) setGalatHarian(error.message || 'Absensi harian belum dapat dimuat.')
      })
      .finally(() => {
        if (!batal) setMemuatHarian(false)
      })
    return () => {
      batal = true
    }
  }, [tanggal, rekap])

  useEffect(() => {
    let batal = false
    setMemuatBulanan(true)
    muatRekapBulananGuruBantuKepsek(bulan)
      .then((hasil) => {
        if (!batal) {
          setBulanan(hasil)
          setGalatBulanan('')
        }
      })
      .catch((error: Error) => {
        if (!batal) setGalatBulanan(error.message || 'Rekap bulanan belum dapat dimuat.')
      })
      .finally(() => {
        if (!batal) setMemuatBulanan(false)
      })
    return () => {
      batal = true
    }
  }, [bulan])

  const pilihTanggal = (nilai: string) => {
    setTanggal(nilai)
    const bulanTanggal = nilai.slice(0, 7)
    if (bulanTanggal && bulanTanggal !== bulan) setBulan(bulanTanggal)
  }

  return (
    <ModalKerangka
      judul="Absensi guru bantu"
      keterangan={`Unit ${unit} · ${formatTanggalID(harian.tanggal)}`}
      onTutup={onTutup}
      lebar="max-w-5xl"
    >
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-xs font-bold text-slate-600">
          Tanggal absensi
          <input
            type="date"
            value={tanggal}
            max={hariIni}
            onChange={(e) => pilihTanggal(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          Bulan rekap
          <input
            type="month"
            value={bulan}
            max={hariIni.slice(0, 7)}
            onChange={(e) => setBulan(e.target.value)}
            className="mt-1 block rounded-lg border border-slate-200 px-2 py-1.5 text-sm font-normal"
          />
        </label>
      </div>

      {galatHarian ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{galatHarian}</p>
      ) : null}
      {galatBulanan ? (
        <p className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{galatBulanan}</p>
      ) : null}

      <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Absensi harian</h3>
      <p className="mb-3 mt-1 text-sm text-slate-700">
        {memuatHarian ? (
          'Memuat absensi tanggal terpilih…'
        ) : (
          <>
            {harian.sudahAbsen} dari {harian.total} guru sudah absen:{' '}
            <strong className="text-emerald-800">{harian.hadir} Hadir</strong>,{' '}
            <strong className="text-amber-800">{harian.terlambat} Terlambat</strong>,{' '}
            <strong className="text-sky-800">{harian.izin ?? 0} Izin</strong>,{' '}
            <strong className="text-orange-800">{harian.sakit ?? 0} Sakit</strong>,{' '}
            <strong className="text-rose-800">{harian.alpa ?? 0} Alpa</strong>
          </>
        )}
      </p>
      {harian.baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada akun guru bantu di unit ini.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="border-b p-2">Nama guru</th>
                <th className="border-b p-2">Jam hadir</th>
                <th className="border-b p-2">Status</th>
                <th className="border-b p-2">Jam pulang</th>
                <th className="border-b p-2">Foto</th>
              </tr>
            </thead>
            <tbody>
              {harian.baris.map((row) => (
                <tr key={row.id_induk}>
                  <td className="border-b p-2 font-bold">{row.nama}</td>
                  <td className="border-b p-2 tabular-nums">{row.jam_masuk || '—'}</td>
                  <td className="border-b p-2">
                    <BadgeAbsen status={row.status === 'Belum absen' ? 'Tidak Hadir' : row.status} />
                  </td>
                  <td className="border-b p-2 tabular-nums">{row.jam_pulang || '—'}</td>
                  <td className="border-b p-2">
                    <div className="flex flex-wrap gap-3">
                      <ThumbnailFoto url={row.foto_masuk} label="Masuk" />
                      <ThumbnailFoto url={row.foto_pulang} label="Pulang" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className="mt-6 text-xs font-extrabold uppercase tracking-wide text-slate-500">
        Rekap bulanan absensi guru bantu
      </h3>
      <p className="mt-1 text-xs text-slate-500">
        {bulanan
          ? `${bulanan.labelBulan} · ${bulanan.hariKerja} hari kerja (Senin–Kamis & Sabtu, sampai hari ini). Kehadiran mencakup Hadir dan Terlambat.`
          : 'Menghitung total kehadiran, izin, sakit, dan alpa per guru selama satu bulan.'}
      </p>
      {memuatBulanan ? (
        <p className="py-6 text-sm text-slate-500">Memuat rekap bulanan…</p>
      ) : !bulanan || bulanan.baris.length === 0 ? (
        <p className="py-6 text-sm text-slate-500">Belum ada akun guru bantu di unit ini.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-900">
              {bulanan.total.hadir} <span className="font-normal">hadir</span>
            </p>
            <p className="rounded-xl bg-sky-50 px-3 py-2 text-sm font-bold text-sky-900">
              {bulanan.total.izin} <span className="font-normal">izin</span>
            </p>
            <p className="rounded-xl bg-orange-50 px-3 py-2 text-sm font-bold text-orange-900">
              {bulanan.total.sakit} <span className="font-normal">sakit</span>
            </p>
            <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-bold text-rose-900">
              {bulanan.total.alpa} <span className="font-normal">alpa</span>
            </p>
          </div>
          <table className="w-full min-w-[560px] border-collapse text-left text-sm">
            <thead>
              <tr className="text-xs text-slate-500">
                <th className="border-b p-2">Nama guru</th>
                <th className="border-b p-2 text-right">Hadir</th>
                <th className="border-b p-2 text-right">Izin</th>
                <th className="border-b p-2 text-right">Sakit</th>
                <th className="border-b p-2 text-right">Alpa</th>
              </tr>
            </thead>
            <tbody>
              {bulanan.baris.map((row) => (
                <tr key={row.id_induk}>
                  <td className="border-b p-2 font-bold">{row.nama}</td>
                  <td className="border-b p-2 text-right tabular-nums text-emerald-800">{row.hadir}</td>
                  <td className="border-b p-2 text-right tabular-nums text-sky-800">{row.izin}</td>
                  <td className="border-b p-2 text-right tabular-nums text-orange-800">{row.sakit}</td>
                  <td className="border-b p-2 text-right tabular-nums text-rose-800">{row.alpa}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-slate-50 text-xs font-extrabold text-slate-700">
                <td className="p-2">Total</td>
                <td className="p-2 text-right tabular-nums">{bulanan.total.hadir}</td>
                <td className="p-2 text-right tabular-nums">{bulanan.total.izin}</td>
                <td className="p-2 text-right tabular-nums">{bulanan.total.sakit}</td>
                <td className="p-2 text-right tabular-nums">{bulanan.total.alpa}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </ModalKerangka>
  )
}
