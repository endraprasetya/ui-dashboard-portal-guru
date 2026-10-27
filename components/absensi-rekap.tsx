'use client'

import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, BarChart2, CalendarDays, Printer } from 'lucide-react'
import {
  fetchJurnalRentang,
  fetchKelasDanJumlahSiswa,
  fetchSiswaKelas,
  monthRange,
  normalizeSiswaTidakHadir,
  semesterRange,
  teacherUnit,
  type SiswaKelas,
} from '@/lib/jurnal'

type Mode = 'siswa' | 'harian' | 'bulanan'

function currentMonthValue() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function labelKeterangan(value: string) {
  const key = value.toLowerCase()
  if (key.includes('sakit')) return 'sakit'
  if (key.includes('izin')) return 'izin'
  return 'alpa'
}

export function AbsensiRekap({
  onBack,
  currentUser,
}: {
  onBack: () => void
  currentUser?: any
}) {
  const unit = teacherUnit(currentUser)
  const [mode, setMode] = useState<Mode>('siswa')
  const [kelasList, setKelasList] = useState<string[]>([])
  const [kelas, setKelas] = useState('')
  const [periode, setPeriode] = useState<'bulan' | 'semester'>('bulan')
  const [bulan, setBulan] = useState(currentMonthValue())
  const [semester, setSemester] = useState('1')
  const [tahun, setTahun] = useState(String(new Date().getFullYear()))
  const [rows, setRows] = useState<any[]>([])
  const [siswa, setSiswa] = useState<SiswaKelas[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchKelasDanJumlahSiswa(currentUser).then((result) => setKelasList(result.classes))
  }, [currentUser])

  const { start, end } = useMemo(() => {
    if (periode === 'semester') return semesterRange(Number(tahun), semester)
    return monthRange(bulan)
  }, [periode, bulan, semester, tahun])

  useEffect(() => {
    async function load() {
      setLoading(true)
      setError('')
      const [{ rows: jurnalRows, error: jurnalError }, roster] = await Promise.all([
        fetchJurnalRentang({
          kelas: kelas || undefined,
          start,
          end,
          semester: periode === 'semester' ? semester : undefined,
        }),
        kelas ? fetchSiswaKelas(kelas, currentUser) : Promise.resolve([] as SiswaKelas[]),
      ])
      if (jurnalError) setError(jurnalError.message)
      setRows(jurnalRows)
      setSiswa(roster)
      setLoading(false)
    }
    load()
  }, [kelas, start, end, periode, semester, currentUser])

  const ringkasan = useMemo(() => {
    let sesi = 0
    let hadir = 0
    let sakit = 0
    let izin = 0
    let alpa = 0

    for (const row of rows) {
      sesi += 1
      hadir += Number(row.hadir) || 0
      const absen = normalizeSiswaTidakHadir(row.siswa_tidak_hadir)
      if (absen.length > 0) {
        for (const item of absen) {
          const jenis = labelKeterangan(item.keterangan)
          if (jenis === 'sakit') sakit += 1
          else if (jenis === 'izin') izin += 1
          else alpa += 1
        }
      } else {
        alpa += Number(row.tidak_hadir) || 0
      }
    }

    return { sesi, hadir, sakit, izin, alpa, tidakHadir: sakit + izin + alpa }
  }, [rows])

  const rekapSiswa = useMemo(() => {
    const sesiPerKelas = new Map<string, number>()
    const map = new Map<
      string,
      { nama: string; kelas: string; sakit: number; izin: number; alpa: number; tidakHadir: number }
    >()

    const pastikan = (key: string, nama: string, kelasSiswa: string) => {
      if (!map.has(key)) {
        map.set(key, { nama, kelas: kelasSiswa, sakit: 0, izin: 0, alpa: 0, tidakHadir: 0 })
      }
      return map.get(key)!
    }

    for (const item of siswa) {
      pastikan(item.id_siswa, item.nama_siswa, item.kelas)
    }

    for (const row of rows) {
      sesiPerKelas.set(row.kelas, (sesiPerKelas.get(row.kelas) || 0) + 1)
      for (const absen of normalizeSiswaTidakHadir(row.siswa_tidak_hadir)) {
        const key = absen.id_siswa || `${row.kelas}:${absen.nama}`
        const rec = pastikan(key, absen.nama, row.kelas)
        const jenis = labelKeterangan(absen.keterangan)
        rec.tidakHadir += 1
        if (jenis === 'sakit') rec.sakit += 1
        else if (jenis === 'izin') rec.izin += 1
        else rec.alpa += 1
      }
    }

    return Array.from(map.values())
      .map((item) => ({
        ...item,
        sesi: sesiPerKelas.get(item.kelas) || 0,
        hadir: Math.max(0, (sesiPerKelas.get(item.kelas) || 0) - item.tidakHadir),
      }))
      .sort((a, b) => a.nama.localeCompare(b.nama, 'id'))
  }, [rows, siswa])

  const rekapHarian = useMemo(() => {
    return [...rows]
      .sort((a, b) => String(a.tanggal).localeCompare(String(b.tanggal)) || Number(a.jam) - Number(b.jam))
      .map((row) => ({
        ...row,
        absen: normalizeSiswaTidakHadir(row.siswa_tidak_hadir),
      }))
  }, [rows])

  const rekapBulanan = useMemo(() => {
    const map = new Map<string, { bulan: string; sesi: number; hadir: number; sakit: number; izin: number; alpa: number }>()
    for (const row of rows) {
      const key = String(row.tanggal || '').slice(0, 7)
      if (!key) continue
      if (!map.has(key)) map.set(key, { bulan: key, sesi: 0, hadir: 0, sakit: 0, izin: 0, alpa: 0 })
      const rec = map.get(key)!
      rec.sesi += 1
      rec.hadir += Number(row.hadir) || 0
      const absen = normalizeSiswaTidakHadir(row.siswa_tidak_hadir)
      if (absen.length > 0) {
        for (const item of absen) {
          const jenis = labelKeterangan(item.keterangan)
          if (jenis === 'sakit') rec.sakit += 1
          else if (jenis === 'izin') rec.izin += 1
          else rec.alpa += 1
        }
      } else {
        rec.alpa += Number(row.tidak_hadir) || 0
      }
    }
    return Array.from(map.values()).sort((a, b) => a.bulan.localeCompare(b.bulan))
  }, [rows])

  return (
    <div className="space-y-4">
      <style>{`
        @media print {
          header, .no-print { display: none !important; }
          body { background: white !important; }
        }
      `}</style>

      <button
        type="button"
        onClick={onBack}
        className="no-print inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-bold text-white transition hover:bg-amber-600"
      >
        <ArrowLeft className="size-4" /> Kembali ke Dashboard
      </button>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-800 bg-slate-800 px-5 py-4 text-white">
          <h2 className="text-lg font-black">Rekap Absensi</h2>
          <p className="text-xs text-slate-300">
            Laporan dan analisis kehadiran dari jurnal pembelajaran
            {unit ? ` · Unit ${unit}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-5 py-4">
          <label className="text-xs font-bold text-slate-600">
            Kelas
            <select
              value={kelas}
              onChange={(e) => setKelas(e.target.value)}
              className="mt-1 block min-w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
            >
              <option value="">Semua kelas</option>
              {kelasList.map((nama) => (
                <option key={nama} value={nama}>
                  {nama}
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs font-bold text-slate-600">
            Periode
            <select
              value={periode}
              onChange={(e) => setPeriode(e.target.value as 'bulan' | 'semester')}
              className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
            >
              <option value="bulan">Bulanan</option>
              <option value="semester">Semester</option>
            </select>
          </label>

          {periode === 'bulan' ? (
            <label className="text-xs font-bold text-slate-600">
              Bulan
              <input
                type="month"
                value={bulan}
                onChange={(e) => setBulan(e.target.value)}
                className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
              />
            </label>
          ) : (
            <>
              <label className="text-xs font-bold text-slate-600">
                Semester
                <select
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                >
                  <option value="1">1 (Juli–Des)</option>
                  <option value="2">2 (Jan–Jun)</option>
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Tahun
                <input
                  type="number"
                  value={tahun}
                  onChange={(e) => setTahun(e.target.value)}
                  className="mt-1 block w-24 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold"
                />
              </label>
            </>
          )}

          <button
            type="button"
            onClick={() => window.print()}
            className="no-print inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700"
          >
            <Printer className="size-4" /> Cetak
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-slate-50 p-3">
              <p className="text-[11px] font-bold uppercase text-slate-500">Sesi jurnal</p>
              <p className="text-2xl font-black text-slate-900">{ringkasan.sesi}</p>
            </div>
            <div className="rounded-xl bg-emerald-50 p-3">
              <p className="text-[11px] font-bold uppercase text-emerald-700">Total hadir</p>
              <p className="text-2xl font-black text-emerald-800">{ringkasan.hadir}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3">
              <p className="text-[11px] font-bold uppercase text-amber-700">Sakit</p>
              <p className="text-2xl font-black text-amber-800">{ringkasan.sakit}</p>
            </div>
            <div className="rounded-xl bg-sky-50 p-3">
              <p className="text-[11px] font-bold uppercase text-sky-700">Izin</p>
              <p className="text-2xl font-black text-sky-800">{ringkasan.izin}</p>
            </div>
            <div className="rounded-xl bg-red-50 p-3">
              <p className="text-[11px] font-bold uppercase text-red-700">Alpa</p>
              <p className="text-2xl font-black text-red-800">{ringkasan.alpa}</p>
            </div>
          </div>

          <div className="no-print flex gap-2">
            {(
              [
                ['siswa', 'Rekap siswa', BarChart2],
                ['harian', 'Rekap harian', CalendarDays],
                ['bulanan', 'Rekap bulanan', BarChart2],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-bold ${
                  mode === id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                <Icon className="size-3.5" /> {label}
              </button>
            ))}
          </div>

          {error && <p className="text-xs font-bold text-red-600">{error}</p>}
          {loading && <p className="text-xs text-slate-500">Memuat rekap absensi...</p>}
          {!loading && rows.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
              Belum ada data jurnal pada periode ini. Isi presensi lewat menu Jurnal Pembelajaran.
            </p>
          )}

          {!loading && mode === 'siswa' && rekapSiswa.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Nama siswa</th>
                    <th className="p-2.5">Kelas</th>
                    <th className="p-2.5 text-center">Sesi</th>
                    <th className="p-2.5 text-center">Hadir</th>
                    <th className="p-2.5 text-center">Sakit</th>
                    <th className="p-2.5 text-center">Izin</th>
                    <th className="p-2.5 text-center">Alpa</th>
                    <th className="p-2.5 text-center">Tidak hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapSiswa.map((item) => (
                    <tr key={`${item.kelas}-${item.nama}`} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold text-slate-800">{item.nama}</td>
                      <td className="p-2.5">{item.kelas}</td>
                      <td className="p-2.5 text-center">{item.sesi}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">{item.hadir}</td>
                      <td className="p-2.5 text-center">{item.sakit}</td>
                      <td className="p-2.5 text-center">{item.izin}</td>
                      <td className="p-2.5 text-center">{item.alpa}</td>
                      <td className="p-2.5 text-center font-bold text-amber-700">{item.tidakHadir}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && mode === 'harian' && rekapHarian.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[860px] text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Tanggal</th>
                    <th className="p-2.5">Kelas</th>
                    <th className="p-2.5 text-center">Jam</th>
                    <th className="p-2.5">Mapel</th>
                    <th className="p-2.5 text-center">Hadir</th>
                    <th className="p-2.5 text-center">Tidak hadir</th>
                    <th className="p-2.5">Siswa tidak hadir</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapHarian.map((row) => (
                    <tr key={`${row.kelas}-${row.tanggal}-${row.jam}`} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap p-2.5 font-semibold">{row.tanggal}</td>
                      <td className="p-2.5">{row.kelas}</td>
                      <td className="p-2.5 text-center">{row.jam}</td>
                      <td className="p-2.5">{row.mapel || '-'}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">{row.hadir ?? 0}</td>
                      <td className="p-2.5 text-center font-bold text-amber-700">{row.tidak_hadir ?? 0}</td>
                      <td className="p-2.5 text-slate-600">
                        {row.absen.length > 0
                          ? row.absen.map((item: { nama: string; keterangan: string }) => `${item.nama} (${item.keterangan})`).join(', ')
                          : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && mode === 'bulanan' && rekapBulanan.length > 0 && (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[640px] text-left text-xs">
                <thead className="bg-slate-50 font-bold text-slate-600">
                  <tr>
                    <th className="p-2.5">Bulan</th>
                    <th className="p-2.5 text-center">Sesi</th>
                    <th className="p-2.5 text-center">Total hadir</th>
                    <th className="p-2.5 text-center">Sakit</th>
                    <th className="p-2.5 text-center">Izin</th>
                    <th className="p-2.5 text-center">Alpa</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rekapBulanan.map((item) => (
                    <tr key={item.bulan} className="hover:bg-slate-50">
                      <td className="p-2.5 font-semibold">{item.bulan}</td>
                      <td className="p-2.5 text-center">{item.sesi}</td>
                      <td className="p-2.5 text-center font-bold text-emerald-700">{item.hadir}</td>
                      <td className="p-2.5 text-center">{item.sakit}</td>
                      <td className="p-2.5 text-center">{item.izin}</td>
                      <td className="p-2.5 text-center">{item.alpa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
