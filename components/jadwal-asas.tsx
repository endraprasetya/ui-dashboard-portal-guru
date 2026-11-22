'use client'

import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, Clock } from 'lucide-react'
import {
  CATATAN_KEPULANGAN_ASAS_I,
  isoTanggalLokal,
  JADWAL_ASAS_I,
  JUDUL_JADWAL_ASAS_I,
} from '@/lib/jadwal-asas'

export function JadwalAsasI() {
  const [terbuka, setTerbuka] = useState(true)
  const hariIni = isoTanggalLokal()
  const isoBerikutnya = useMemo(
    () => JADWAL_ASAS_I.find((hari) => hari.iso >= hariIni)?.iso,
    [hariIni],
  )

  return (
    <section className="overflow-hidden rounded-2xl border border-teal-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setTerbuka((nilai) => !nilai)}
        className="flex w-full items-start justify-between gap-3 bg-teal-700 px-4 py-3 text-left text-white sm:px-5"
        aria-expanded={terbuka}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15">
            <CalendarDays className="size-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wide text-teal-100">Ujian akhir semester</p>
            <h3 className="text-sm font-extrabold leading-snug sm:text-base">{JUDUL_JADWAL_ASAS_I}</h3>
            <p className="mt-1 text-[11px] leading-4 text-teal-50/95">{CATATAN_KEPULANGAN_ASAS_I}</p>
          </div>
        </div>
        <ChevronDown className={`mt-1 size-5 shrink-0 transition ${terbuka ? 'rotate-180' : ''}`} />
      </button>

      {terbuka ? (
        <div className="max-h-[22rem] overflow-y-auto overscroll-contain p-3 sm:max-h-[28rem] sm:p-4">
          <ol className="space-y-2">
            {JADWAL_ASAS_I.map((hari) => {
              const hariIniAktif = hari.iso === hariIni
              const berikutnya = !hariIniAktif && hari.iso === isoBerikutnya
              return (
                <li
                  key={hari.iso}
                  className={`rounded-xl border px-3 py-2.5 ${
                    hariIniAktif
                      ? 'border-teal-300 bg-teal-50'
                      : berikutnya
                        ? 'border-amber-200 bg-amber-50/70'
                        : 'border-slate-100 bg-slate-50/80'
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-xs font-extrabold text-slate-900">
                      {hari.hari}, {hari.tanggalTampil}
                    </p>
                    {hariIniAktif ? (
                      <span className="rounded-full bg-teal-700 px-2 py-0.5 text-[10px] font-bold text-white">Hari ini</span>
                    ) : null}
                    {berikutnya ? (
                      <span className="rounded-full bg-amber-600 px-2 py-0.5 text-[10px] font-bold text-white">Berikutnya</span>
                    ) : null}
                  </div>
                  <ul className="mt-1.5 space-y-1">
                    {hari.sesi.map((sesi) => (
                      <li key={`${hari.iso}-${sesi.waktu}`} className="flex gap-2 text-[11px] leading-4 text-slate-700 sm:text-xs">
                        <span className="mt-0.5 inline-flex shrink-0 items-center gap-1 font-bold tabular-nums text-teal-800">
                          <Clock className="size-3" />
                          {sesi.waktu}
                        </span>
                        <span>
                          {sesi.item.map((item, indeks) => (
                            <span key={`${item.kelas}-${item.mapel}`}>
                              {indeks > 0 ? <span className="text-slate-400"> · </span> : null}
                              <span className="font-semibold text-slate-800">{item.kelas}</span>
                              {': '}
                              {item.mapel}
                            </span>
                          ))}
                          {sesi.catatan ? <span className="ml-1 italic text-slate-500">({sesi.catatan})</span> : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ol>
        </div>
      ) : null}
    </section>
  )
}
