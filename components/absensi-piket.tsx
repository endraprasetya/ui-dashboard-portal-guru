'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, ClipboardCheck } from 'lucide-react'
import {
  CATATAN_WAKTU_PIKET,
  JENIS_PIKET,
  SESI_PIKET,
  STATUS_PIKET,
  cocokGuruPiket,
  muatAbsensiPiket,
  muatJadwalPiket,
  simpanAbsensiPiket,
  labelStatusSesiPiket,
  slotUntukHari,
  tanggalHariJakarta,
  type BarisJadwalPiket,
  type IdentitasGuruPiket,
  type SesiPiket,
  type StatusPiket,
  type StatusSesiPiket,
} from '@/lib/piket-guru'
import { kanonNamaUnit } from '@/lib/siswa'

const kelasStatus: Record<StatusPiket, string> = {
  Hadir: 'bg-emerald-700 text-white',
  Izin: 'bg-amber-600 text-white',
}

export function AbsensiPiket({
  onBack,
  currentUser,
  tanpaHeader = false,
}: {
  onBack: () => void
  currentUser?: IdentitasGuruPiket | null
  /** Dipakai saat modul disematkan di dashboard Bendahara. */
  tanpaHeader?: boolean
}) {
  const hariIni = tanggalHariJakarta()
  const unit = kanonNamaUnit(currentUser?.unit)
  const [memuat, setMemuat] = useState(true)
  const [galat, setGalat] = useState('')
  const [jadwal, setJadwal] = useState<BarisJadwalPiket[]>([])
  const [menyimpan, setMenyimpan] = useState('')

  const muat = (diam = false) => {
    if (!unit) {
      setJadwal([])
      setMemuat(false)
      return
    }
    if (!diam) setMemuat(true)
    setGalat('')
    Promise.all([muatJadwalPiket(unit), muatAbsensiPiket(unit, hariIni.tanggal)])
      .then(([slot, catat]) => {
        setJadwal(slotUntukHari(slot, catat, hariIni.hari))
      })
      .catch((error: Error) => setGalat(error.message || 'Jadwal piket belum dapat dimuat.'))
      .finally(() => setMemuat(false))
  }

  useEffect(() => {
    muat()
    const pengulangan = window.setInterval(() => muat(true), 20000)
    return () => window.clearInterval(pengulangan)
    // hari dan unit menentukan jadwal yang dibaca
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit, hariIni.tanggal, hariIni.hari])

  const milikSaya = jadwal.filter((item) => cocokGuruPiket(item, currentUser))
  const statusSesi = (sesi: SesiPiket): { status: StatusSesiPiket; waktu?: string } => {
    const slot = milikSaya[0]
    if (!slot) return { status: 'Belum' }
    return sesi === 'Pagi'
      ? { status: slot.statusPagi, waktu: slot.waktuPagi }
      : { status: slot.statusSore, waktu: slot.waktuSore }
  }

  const catat = async (sesi: SesiPiket, status: StatusPiket) => {
    const slot = milikSaya[0]
    if (!slot) return
    setMenyimpan(`${sesi}:${status}`)
    setGalat('')
    try {
      await simpanAbsensiPiket({
        unit: slot.unit,
        jenis: slot.jenis,
        tanggal: hariIni.tanggal,
        id_guru: slot.id_guru,
        nama_guru: slot.nama_guru,
        sesi,
        status,
      })
      muat(true)
    } catch (error) {
      setGalat(error instanceof Error ? error.message : 'Absensi piket belum dapat disimpan.')
    } finally {
      setMenyimpan('')
    }
  }

  return (
    <div className={`mx-auto space-y-4 ${tanpaHeader ? 'max-w-none' : 'max-w-2xl'}`}>
      {tanpaHeader ? null : (
        <div className="flex items-center justify-between rounded-2xl bg-[#334155] px-6 py-4 text-white shadow-md">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white/20 px-4 py-2 text-xs font-bold hover:bg-white/30"
          >
            <ArrowLeft className="size-4" /> Kembali
          </button>
          <h2 className="text-base font-black tracking-wide">Absensi Piket</h2>
          <div className="w-16" />
        </div>
      )}

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-emerald-50 p-2 text-emerald-800">
            <ClipboardCheck className="size-5" />
          </div>
          <div>
            <p className="text-sm font-extrabold text-slate-900">{hariIni.label}</p>
            <p className="mt-1 text-xs text-slate-500">
              {unit ? `Unit ${unit}` : 'Unit akun belum terbaca'} · {hariIni.namaHari}
            </p>
          </div>
        </div>

        {galat ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900">{galat}</p> : null}
        {!unit ? (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Unit akun belum terbaca dari tabel users. Jadwal piket unit lain tidak ditampilkan.
          </p>
        ) : null}

        {memuat ? <p className="mt-4 text-sm text-slate-500">Memeriksa jadwal piket hari ini...</p> : null}

        {!memuat && milikSaya.length > 0 ? (
          <div className="mt-4 space-y-3">
            <article className="rounded-2xl border border-emerald-200 bg-emerald-50/40 p-4">
              <p className="text-sm font-extrabold text-emerald-950">
                {milikSaya.map((slot) => slot.jenis).filter((jenis, indeks, daftar) => daftar.indexOf(jenis) === indeks).join(' · ')}
              </p>
              <p className="mt-1 text-xs text-slate-600">Catat kehadiran Piket Pagi dan Piket Sore secara terpisah.</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {SESI_PIKET.map((sesi) => {
                  const sekarang = statusSesi(sesi)
                  return (
                    <div key={sesi} className="rounded-xl border border-white bg-white/80 p-3">
                      <p className="text-xs font-extrabold uppercase tracking-wide text-slate-500">Piket {sesi}</p>
                      <p className="mt-1 text-xs text-slate-600">
                        {sekarang.status === 'Belum' ? 'Belum dicatat' : `Tersimpan: ${labelStatusSesiPiket(sekarang.status, sekarang.waktu)}`}
                      </p>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {STATUS_PIKET.map((status) => {
                          const aktif = sekarang.status === status
                          const sibuk = menyimpan.startsWith(`${sesi}:`)
                          return (
                            <button
                              key={status}
                              type="button"
                              disabled={sibuk}
                              onClick={() => void catat(sesi, status)}
                              className={`rounded-xl px-3 py-3 text-sm font-extrabold transition disabled:opacity-60 ${
                                aktif ? kelasStatus[status] : 'border border-slate-200 bg-white text-slate-800 hover:border-emerald-400'
                              }`}
                            >
                              {sibuk && menyimpan.endsWith(status) ? 'Menyimpan...' : status}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </article>
          </div>
        ) : null}

        {!memuat && !galat && milikSaya.length === 0 ? (
          <button
            type="button"
            disabled
            className="mt-4 w-full cursor-not-allowed rounded-2xl bg-slate-200 px-4 py-4 text-sm font-extrabold text-slate-500"
          >
            Bukan jadwal piket Anda hari ini
          </button>
        ) : null}
      </section>

      {!memuat && unit ? (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm leading-relaxed text-sky-950">
            {CATATAN_WAKTU_PIKET}
          </p>
          <h3 className="mt-4 text-sm font-extrabold text-slate-900">Petugas piket {hariIni.namaHari} di unit {unit}</h3>
          {jadwal.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">Belum ada petugas piket pada hari ini.</p>
          ) : (
            <ul className="mt-3 divide-y divide-slate-100">
              {JENIS_PIKET.map((jenis) => {
                const daftar = jadwal.filter((item) => item.jenis === jenis)
                if (daftar.length === 0) return null
                return (
                  <li key={jenis} className="py-2">
                    <p className="text-xs font-bold uppercase text-slate-500">{jenis}</p>
                    <ul className="mt-1 space-y-1">
                      {daftar.map((item) => (
                        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-800">
                          <span>{item.nama_guru}</span>
                          <span className="text-xs text-slate-500">
                            Pagi {labelStatusSesiPiket(item.statusPagi, item.waktuPagi)} · Sore{' '}
                            {labelStatusSesiPiket(item.statusSore, item.waktuSore)}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  )
}
