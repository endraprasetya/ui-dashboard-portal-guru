'use client'

import { useEffect, useState } from 'react'
import { ChevronRight, ClipboardCheck } from 'lucide-react'
import { ModalKerangka } from '@/components/kepsek/modal-kerangka'
import {
  CATATAN_WAKTU_PIKET,
  JENIS_PIKET,
  NAMA_HARI_PIKET,
  hapusJadwalPiket,
  muatAbsensiPiket,
  muatGuruUnit,
  muatJadwalPiket,
  muatRekapPiket,
  ringkasMonitor,
  simpanJadwalPiket,
  slotUntukHari,
  susunMonitorPiket,
  tanggalHariJakarta,
  type BarisJadwalPiket,
  type BarisMonitorPiket,
  type BarisRekapPiketTampil,
  type JenisPiket,
  type ModeRekapPiket,
  type StatusSesiPiket,
  labelStatusSesiPiketDetail,
} from '@/lib/piket-guru'

const kelasKartu =
  'cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700'

function lencana(status: StatusSesiPiket) {
  if (status === 'Hadir') return 'bg-emerald-100 text-emerald-800'
  if (status === 'Izin') return 'bg-amber-100 text-amber-900'
  return 'bg-slate-100 text-slate-600'
}

function rentangBulan(bulan: string) {
  const [tahun, angka] = bulan.split('-').map(Number)
  if (!tahun || !angka || angka < 1 || angka > 12) return null
  const akhir = new Date(tahun, angka, 0).getDate()
  const mm = String(angka).padStart(2, '0')
  return {
    dari: `${tahun}-${mm}-01`,
    sampai: `${tahun}-${mm}-${String(akhir).padStart(2, '0')}`,
  }
}

function RekapPiket({ unit, tanggalAwal }: { unit: string; tanggalAwal: string }) {
  const [mode, setMode] = useState<ModeRekapPiket>('tanggal')
  const [tanggal, setTanggal] = useState(tanggalAwal)
  const [bulan, setBulan] = useState(tanggalAwal.slice(0, 7))
  const [baris, setBaris] = useState<BarisRekapPiketTampil[]>([])
  const [memuat, setMemuat] = useState(false)
  const [galat, setGalat] = useState('')

  useEffect(() => {
    const rentang = mode === 'tanggal' ? (tanggal ? { dari: tanggal, sampai: tanggal } : null) : rentangBulan(bulan)
    if (!unit || !rentang) {
      setBaris([])
      return
    }
    let batal = false
    setMemuat(true)
    setGalat('')
    muatRekapPiket(unit, rentang.dari, rentang.sampai, mode)
      .then((hasil) => {
        if (!batal) setBaris(hasil)
      })
      .catch((error: Error) => {
        if (!batal) {
          setBaris([])
          setGalat(error.message || 'Rekap piket belum dapat dimuat.')
        }
      })
      .finally(() => {
        if (!batal) setMemuat(false)
      })
    return () => {
      batal = true
    }
  }, [unit, mode, tanggal, bulan])

  return (
    <section className="mt-5 rounded-2xl border border-slate-200 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900">Rekap Piket</h3>
          <p className="mt-1 text-xs text-slate-500">
            {mode === 'tanggal'
              ? 'Jam pagi dan sore adalah waktu absen pada tanggal yang dipilih.'
              : 'Rekap bulanan merangkum jumlah hadir piket pagi dan sore pada bulan tersebut.'}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="text-xs font-bold text-slate-600">
            Mode
            <select
              value={mode}
              onChange={(event) => setMode(event.target.value as ModeRekapPiket)}
              className="mt-1 block rounded-lg border border-slate-200 px-2 py-2 text-sm"
            >
              <option value="tanggal">Tanggal tertentu</option>
              <option value="bulan">Rekap bulanan</option>
            </select>
          </label>
          {mode === 'tanggal' ? (
            <label className="text-xs font-bold text-slate-600">
              Tanggal
              <input
                type="date"
                value={tanggal}
                onChange={(event) => setTanggal(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </label>
          ) : (
            <label className="text-xs font-bold text-slate-600">
              Bulan
              <input
                type="month"
                value={bulan}
                onChange={(event) => setBulan(event.target.value)}
                className="mt-1 block rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            </label>
          )}
        </div>
      </div>
      {galat ? <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p> : null}
      {memuat ? <p className="mt-3 text-sm text-slate-500">Memuat rekap piket...</p> : null}
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[36rem] text-left text-sm">
          <thead className="text-xs uppercase text-slate-500">
            <tr>
              <th className="px-2 py-2">No</th>
              <th className="px-2 py-2">Guru</th>
              <th className="px-2 py-2">Jam Piket Pagi</th>
              <th className="px-2 py-2">Jam Piket Sore</th>
              <th className="px-2 py-2">Keterangan</th>
            </tr>
          </thead>
          <tbody>
            {!memuat && baris.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-2 py-4 text-slate-500">
                  {galat ? 'Rekap piket belum dapat ditampilkan.' : 'Belum ada data piket pada filter ini.'}
                </td>
              </tr>
            ) : (
              baris.map((item, indeks) => (
                <tr key={`${item.namaGuru}-${item.keterangan}-${indeks}`} className="border-t border-slate-100">
                  <td className="px-2 py-2 text-slate-500">{indeks + 1}</td>
                  <td className="px-2 py-2 font-semibold text-slate-900">{item.namaGuru}</td>
                  <td className="px-2 py-2 font-mono text-xs">{item.jamPagi}</td>
                  <td className="px-2 py-2 font-mono text-xs">{item.jamSore}</td>
                  <td className="px-2 py-2 text-slate-600">{item.keterangan}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function LencanaSesi({ sesi, status, waktu }: { sesi: 'Pagi' | 'Sore'; status: StatusSesiPiket; waktu?: string }) {
  const teks = labelStatusSesiPiketDetail(sesi, status, waktu)
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-bold leading-snug ${lencana(status)}`}>
      {teks}
    </span>
  )
}

export function MonitoringPiketHariIni({ unit }: { unit: string }) {
  const hariIni = tanggalHariJakarta()
  const [buka, setBuka] = useState(false)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [jadwal, setJadwal] = useState<BarisJadwalPiket[]>([])
  const [monitor, setMonitor] = useState<BarisMonitorPiket[]>([])
  const [guru, setGuru] = useState<{ id: string; nama: string }[]>([])
  const [jenis, setJenis] = useState<JenisPiket>(JENIS_PIKET[0])
  const [hari, setHari] = useState(hariIni.hari)
  const [idGuru, setIdGuru] = useState('')
  const [menyimpan, setMenyimpan] = useState(false)

  const muat = (diam = false) => {
    if (!unit) {
      setJadwal([])
      setMonitor([])
      setMemuat(false)
      return
    }
    if (!diam) setMemuat(true)
    setGalat('')
    const jadwalTugas = Promise.all([muatJadwalPiket(unit), muatAbsensiPiket(unit, hariIni.tanggal)])
    const guruTugas = muatGuruUnit(unit).catch(() => [] as { id: string; nama: string }[])
    Promise.all([jadwalTugas, guruTugas])
      .then(([[slot, absensi], daftarGuru]) => {
        setJadwal(slot)
        setMonitor(susunMonitorPiket(slotUntukHari(slot, absensi, hariIni.hari), absensi))
        setGuru(daftarGuru)
        setIdGuru((sekarang) => (daftarGuru.some((item) => item.id === sekarang) ? sekarang : daftarGuru[0]?.id || ''))
      })
      .catch((error: Error) => {
        setJadwal([])
        setMonitor([])
        setGalat(error.message || 'Monitoring piket belum dapat dimuat.')
      })
      .finally(() => {
        guruTugas.then((daftarGuru) => {
          setGuru(daftarGuru)
          setIdGuru((sekarang) => (daftarGuru.some((item) => item.id === sekarang) ? sekarang : daftarGuru[0]?.id || ''))
        })
        setMemuat(false)
      })
  }

  useEffect(() => {
    muat()
    const pengulangan = window.setInterval(() => muat(true), 20000)
    return () => window.clearInterval(pengulangan)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, hariIni.tanggal, hariIni.hari])

  const ringkas = ringkasMonitor(monitor)

  const tambah = async () => {
    const orang = guru.find((item) => item.id === idGuru)
    if (!orang) return
    setMenyimpan(true)
    setGalat('')
    try {
      await simpanJadwalPiket({ unit, jenis, hari, id_guru: orang.id, nama_guru: orang.nama })
      muat()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Jadwal piket belum dapat disimpan.')
    } finally {
      setMenyimpan(false)
    }
  }

  const hapus = async (id: string) => {
    setGalat('')
    try {
      await hapusJadwalPiket(id, unit)
      muat()
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Jadwal piket belum dapat dihapus.')
    }
  }

  return (
    <>
      <article role="button" tabIndex={0} className={`${kelasKartu} no-print`} onClick={() => setBuka(true)} onKeyDown={(e) => e.key === 'Enter' && setBuka(true)}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-emerald-900">
            <ClipboardCheck className="size-4" />
            <h2 className="text-sm font-extrabold">Monitoring Piket Hari Ini</h2>
          </div>
          <ChevronRight className="size-4 text-slate-400" />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Unit {unit || 'belum diatur'} · {hariIni.namaHari}
        </p>
        {memuat ? <p className="mt-3 text-sm text-slate-500">Memuat jadwal piket...</p> : null}
        {!memuat && galat ? <p className="mt-3 text-sm text-amber-800">{galat}</p> : null}
        {!memuat && !galat ? (
          <div className="mt-3 space-y-2 text-sm text-slate-800">
            <p>
              <strong>{ringkas.total}</strong> petugas
            </p>
            <p>
              Pagi: <strong className="text-emerald-800">{ringkas.pagiHadir} hadir</strong> ·{' '}
              <strong className="text-amber-800">{ringkas.pagiIzin} izin</strong> · {ringkas.pagiBelum} belum absen
            </p>
            <p>
              Sore: <strong className="text-emerald-800">{ringkas.soreHadir} hadir</strong> ·{' '}
              <strong className="text-amber-800">{ringkas.soreIzin} izin</strong> · {ringkas.soreBelum} belum absen
            </p>
            <div>
              <p className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-xs leading-relaxed text-sky-950">{CATATAN_WAKTU_PIKET}</p>
              <p className="mt-3 text-xs font-extrabold uppercase text-slate-500">Petugas piket hari ini</p>
              {monitor.length === 0 ? (
                <p className="mt-1 text-xs text-slate-500">Belum ada petugas piket pada hari ini.</p>
              ) : (
                <ul className="mt-1 max-h-40 space-y-1 overflow-y-auto">
                  {JENIS_PIKET.map((jenis) => {
                    const daftar = monitor.filter((item) => item.jenis === jenis)
                    if (daftar.length === 0) return null
                    return (
                      <li key={jenis}>
                        <p className="text-[11px] font-bold text-slate-500">{jenis}</p>
                        {daftar.map((item) => (
                          <p key={`${item.jenis}-${item.id_guru}`} className="text-xs text-slate-700">
                            {item.nama_guru} · {labelStatusSesiPiketDetail('Pagi', item.statusPagi, item.waktuPagi)} ·{' '}
                            {labelStatusSesiPiketDetail('Sore', item.statusSore, item.waktuSore)}
                          </p>
                        ))}
                      </li>
                    )
                  })}
                </ul>
              )}
            </div>
          </div>
        ) : null}
        <p className="mt-2 text-[11px] text-slate-400">Ketuk untuk rincian kehadiran, rekap tanggal tertentu, dan rekap bulanan.</p>
      </article>

      {buka ? (
        <ModalKerangka
          judul="Monitoring Piket Hari Ini"
          keterangan={`${hariIni.label} · Unit ${unit}`}
          onTutup={() => setBuka(false)}
          lebar="max-w-5xl"
        >
          <p className="mb-3 rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm leading-relaxed text-sky-950">{CATATAN_WAKTU_PIKET}</p>
          {galat ? <p className="mb-3 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p> : null}
          <div className="mb-3 grid gap-2 sm:grid-cols-2">
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              Piket Pagi: <strong className="text-emerald-800">{ringkas.pagiHadir} hadir</strong> · {ringkas.pagiIzin} izin · {ringkas.pagiBelum} belum
            </p>
            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm">
              Piket Sore: <strong className="text-emerald-800">{ringkas.soreHadir} hadir</strong> · {ringkas.soreIzin} izin · {ringkas.soreBelum} belum
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[36rem] text-left text-sm">
              <thead className="text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-2 py-2">Nama</th>
                  <th className="px-2 py-2">Jenis piket</th>
                  <th className="px-2 py-2">Pagi</th>
                  <th className="px-2 py-2">Sore</th>
                </tr>
              </thead>
              <tbody>
                {monitor.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-2 py-4 text-slate-500">
                      {galat
                        ? 'Daftar petugas belum dapat ditampilkan sebelum tabel piket tersedia.'
                        : `Belum ada petugas piket untuk ${hariIni.namaHari} di unit ${unit}.`}
                    </td>
                  </tr>
                ) : (
                  monitor.map((baris) => (
                    <tr key={`${baris.jenis}-${baris.id_guru}`} className="border-t border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-900">{baris.nama_guru}</td>
                      <td className="px-2 py-2">{baris.jenis}</td>
                      <td className="px-2 py-2">
                        <LencanaSesi sesi="Pagi" status={baris.statusPagi} waktu={baris.waktuPagi} />
                      </td>
                      <td className="px-2 py-2">
                        <LencanaSesi sesi="Sore" status={baris.statusSore} waktu={baris.waktuSore} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <RekapPiket unit={unit} tanggalAwal={hariIni.tanggal} />

          <div className="mt-5 rounded-2xl border border-slate-200 p-3">
            <h3 className="text-sm font-extrabold text-slate-900">Jadwal piket mingguan</h3>
            <p className="mt-1 text-xs text-slate-500">Hari yang dipilih disimpan pada tanggal pekan ini di tabel_piket_guru. Itulah yang mengaktifkan tombol absensi guru.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-4">
              <label className="text-xs font-bold text-slate-600">
                Jenis
                <select value={jenis} onChange={(e) => setJenis(e.target.value as JenisPiket)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm">
                  {JENIS_PIKET.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600">
                Hari
                <select value={hari} onChange={(e) => setHari(Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm">
                  {NAMA_HARI_PIKET.map((nama, indeks) => (
                    <option key={nama} value={indeks}>
                      {nama}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-bold text-slate-600 sm:col-span-2">
                Guru
                <select value={idGuru} onChange={(e) => setIdGuru(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm">
                  {guru.length === 0 ? <option value="">Belum ada guru di unit ini</option> : null}
                  {guru.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="button"
              onClick={() => void tambah()}
              disabled={menyimpan || !idGuru}
              className="mt-3 rounded-xl bg-[#143d32] px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {menyimpan ? 'Menyimpan...' : 'Tambahkan ke jadwal'}
            </button>
            <ul className="mt-3 max-h-48 space-y-1 overflow-y-auto text-sm">
              {jadwal.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-lg bg-slate-50 px-2 py-1.5">
                  <span>
                    {NAMA_HARI_PIKET[item.hari]} {item.tanggal} · {item.jenis} · {item.nama_guru}
                  </span>
                  <button type="button" onClick={() => void hapus(item.id)} className="text-xs font-bold text-rose-700">
                    Hapus
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </ModalKerangka>
      ) : null}
    </>
  )
}
