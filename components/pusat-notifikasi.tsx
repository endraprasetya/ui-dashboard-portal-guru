'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Bell, BookCheck, ArrowRight } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import {
  LABEL_KATEGORI,
  bacaIdTersimpan,
  muatNotifikasi,
  simpanIdDibaca,
  type KategoriNotifikasi,
  type NotifikasiItem,
  type NotifikasiQiroah,
} from '@/lib/notifikasi'

const URUTAN: KategoriNotifikasi[] = ['pengumuman', 'qiroah', 'tahfidz', 'jurnal', 'tertib']

export function usePusatNotifikasi(currentUser?: any, penyegar = '') {
  const [semua, setSemua] = useState<NotifikasiItem[]>([])
  const [qiroah, setQiroah] = useState<NotifikasiQiroah[]>([])
  const [dibaca, setDibaca] = useState<string[]>([])
  const [memuat, setMemuat] = useState(false)

  const berjalan = useRef(false)
  const muat = useCallback(async (senyap = false) => {
    if (berjalan.current && senyap) return
    berjalan.current = true
    if (!senyap) setMemuat(true)
    setDibaca(bacaIdTersimpan())
    try {
      const hasil = await muatNotifikasi(currentUser)
      setSemua(hasil.semua)
      setQiroah(hasil.qiroah)
    } finally {
      berjalan.current = false
      if (!senyap) setMemuat(false)
    }
  }, [currentUser, penyegar])

  useEffect(() => {
    muat()
  }, [muat])

  useEffect(() => {
    const kanal = supabase
      .channel(`notifikasi-pengajuan-${Math.random().toString(36).slice(2)}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pengajuan' }, () => {
        muat(true)
      })
      .subscribe()
    const timer = window.setInterval(() => muat(true), 15000)
    return () => {
      window.clearInterval(timer)
      supabase.removeChannel(kanal)
    }
  }, [muat])

  const sudah = useCallback((id: string) => dibaca.includes(id), [dibaca])
  const belumDibaca = semua.filter((item) => !dibaca.includes(item.id)).length
  const penguji = qiroah.filter((item) => item.peran === 'penguji')
  const pengampuMenunggu = qiroah.filter((item) => item.peran === 'pengampu' && item.tahap === 'menunggu')
  const pengampu = qiroah.filter((item) => item.peran === 'pengampu' && item.tahap === 'terjadwal')

  const tandai = useCallback((id: string) => {
    setDibaca((current) => {
      if (current.includes(id)) return current
      return simpanIdDibaca([...current, id])
    })
  }, [])

  const tandaiSemua = useCallback((ids: string[]) => {
    setDibaca((current) => simpanIdDibaca([...current, ...ids]))
  }, [])

  return { semua, qiroah, penguji, pengampu, pengampuMenunggu, belumDibaca, sudah, tandai, tandaiSemua, memuat, muat }
}

export function PusatNotifikasi({
  semua,
  belumDibaca,
  sudah,
  onBuka,
  onTandaiSemua,
}: {
  semua: NotifikasiItem[]
  belumDibaca: number
  sudah: (id: string) => boolean
  onBuka: (item: NotifikasiItem) => void
  onTandaiSemua: () => void
}) {
  const [buka, setBuka] = useState(false)
  const bungkus = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!buka) return
    const tutup = (event: MouseEvent) => {
      if (!bungkus.current?.contains(event.target as Node)) setBuka(false)
    }
    const esc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setBuka(false)
    }
    document.addEventListener('mousedown', tutup)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', tutup)
      document.removeEventListener('keydown', esc)
    }
  }, [buka])

  const kelompok = useMemo(
    () => URUTAN.map((kategori) => ({ kategori, items: semua.filter((item) => item.kategori === kategori) })).filter((grup) => grup.items.length > 0),
    [semua],
  )

  return (
    <div className="relative" ref={bungkus}>
      <button
        type="button"
        aria-expanded={buka}
        aria-label={belumDibaca > 0 ? `Pusat notifikasi, ${belumDibaca} belum dibaca` : 'Pusat notifikasi'}
        onClick={() => setBuka((current) => !current)}
        className="relative flex size-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
      >
        <Bell className="size-4" />
        {belumDibaca > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
            {belumDibaca > 99 ? '99+' : belumDibaca}
          </span>
        )}
      </button>
      {buka && (
        <div className="absolute right-0 z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
            <div>
              <p className="text-sm font-extrabold text-slate-900">Pusat Notifikasi</p>
              <p className="text-[11px] text-slate-500">
                {belumDibaca > 0 ? `${belumDibaca} belum dibaca` : 'Semua sudah dibaca'}
              </p>
            </div>
            {belumDibaca > 0 && (
              <button type="button" onClick={onTandaiSemua} className="text-[11px] font-bold text-emerald-700 hover:underline">
                Tandai dibaca
              </button>
            )}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {kelompok.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">Belum ada notifikasi.</p>
            ) : (
              kelompok.map((grup) => (
                <section key={grup.kategori} className="border-b border-slate-100 last:border-b-0">
                  <p className="bg-slate-50 px-4 py-1.5 text-[10px] font-extrabold uppercase tracking-wide text-slate-500">
                    {LABEL_KATEGORI[grup.kategori]}
                  </p>
                  {grup.items.map((item) => {
                    const terbaca = sudah(item.id)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setBuka(false)
                          onBuka(item)
                        }}
                        className={`flex w-full items-start gap-2 px-4 py-2.5 text-left hover:bg-emerald-50 ${terbaca ? 'opacity-60' : ''}`}
                      >
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${terbaca ? 'bg-slate-300' : 'bg-emerald-600'}`} />
                        <span>
                          <span className="block text-xs font-bold text-slate-900">{item.judul}</span>
                          <span className="mt-0.5 block text-[11px] leading-4 text-slate-500">{item.detail}</span>
                        </span>
                      </button>
                    )
                  })}
                </section>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export function RingkasanQiroah({
  onOpen,
  onJadwalkan,
  penguji,
  pengampu,
  pengampuMenunggu = [],
}: {
  onOpen: () => void
  onJadwalkan: () => void
  penguji: NotifikasiQiroah[]
  pengampu: NotifikasiQiroah[]
  pengampuMenunggu?: NotifikasiQiroah[]
}) {
  return (
    <div className="flex flex-col self-start rounded-2xl bg-[#0284c7] p-5 text-left text-white shadow transition hover:shadow-lg">
      <button type="button" onClick={onOpen} className="text-left">
        <div className="flex items-center justify-between pb-6">
          <div className="rounded-xl bg-white/20 p-2.5">
            <BookCheck className="size-5" />
          </div>
          <ArrowRight className="size-4 opacity-75" />
        </div>
        <h3 className="text-sm font-extrabold">Qiroatul Qur&apos;an</h3>
        <p className="mt-1 text-[11px] opacity-80">Input bacaan, jilid, dan kenaikan jilid santri</p>
      </button>
      {penguji.length > 0 && (
        <button type="button" onClick={onJadwalkan} className="mt-3 rounded-xl bg-white/15 p-2.5 text-left hover:bg-white/25">
          <p className="text-[10px] font-extrabold uppercase tracking-wide">Menunggu penjadwalan</p>
          <ul className="mt-1.5 space-y-1">
            {penguji.slice(0, 3).map((item) => (
              <li key={item.id} className="text-[11px] leading-4">
                <span className="font-bold">{item.nama}</span> · {item.kelas}
              </li>
            ))}
          </ul>
          {penguji.length > 3 && <p className="mt-1 text-[10px] font-bold">+{penguji.length - 3} siswa lain</p>}
        </button>
      )}
      {pengampuMenunggu.length > 0 && (
        <div className="mt-2 rounded-xl bg-black/10 p-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide">Menunggu jadwal penguji</p>
          <ul className="mt-1.5 space-y-1">
            {pengampuMenunggu.slice(0, 3).map((item) => (
              <li key={item.id} className="text-[11px] leading-4">
                <span className="font-bold">{item.nama}</span> · {item.kelas}
              </li>
            ))}
          </ul>
          {pengampuMenunggu.length > 3 && <p className="mt-1 text-[10px] font-bold">+{pengampuMenunggu.length - 3} siswa lain</p>}
        </div>
      )}
      {pengampu.length > 0 && (
        <div className="mt-2 rounded-xl bg-black/10 p-2.5">
          <p className="text-[10px] font-extrabold uppercase tracking-wide">Jadwal ujian siswa binaan</p>
          <ul className="mt-1.5 space-y-1.5">
            {pengampu.slice(0, 3).map((item) => (
              <li key={item.id} className="text-[11px] leading-4">
                <span className="font-bold">{item.nama}</span> · {item.kelas}
                <span className="block opacity-90">
                  {item.tanggal || 'Tanggal menyusul'}
                  {item.waktu ? ` · ${item.waktu}` : ''} · {item.penguji || 'penguji'}
                </span>
              </li>
            ))}
          </ul>
          {pengampu.length > 3 && <p className="mt-1 text-[10px] font-bold">+{pengampu.length - 3} siswa lain</p>}
        </div>
      )}
    </div>
  )
}
