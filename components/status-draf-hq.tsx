'use client'

import { useEffect, useState } from 'react'
import { CloudOff, RefreshCw, Wifi } from 'lucide-react'
import {
  PERISTIWA_DRAF_HQ,
  PERISTIWA_SINKRON_HQ,
  STATUS_DRAF_HQ,
  daftarDrafHq,
  pasangPenjagaDrafHq,
  sinkronkanDrafHq,
  type DrafHq,
} from '@/lib/antrean-draf-hq'

function useDrafHq() {
  const [daftar, setDaftar] = useState<DrafHq[]>([])
  const [online, setOnline] = useState(true)
  const [menyinkron, setMenyinkron] = useState(false)
  const [notifikasi, setNotifikasi] = useState('')

  useEffect(() => {
    const lepas = pasangPenjagaDrafHq()
    const muat = () => setDaftar(daftarDrafHq())
    muat()
    const onlineUbah = () => setOnline(typeof navigator === 'undefined' ? true : navigator.onLine)
    onlineUbah()
    const sinkron = (event: Event) => {
      const detail = (event as CustomEvent<{ sukses?: number; nama?: string[] }>).detail
      const jumlah = Number(detail?.sukses || 0)
      const nama = (detail?.nama || []).filter(Boolean)
      if (jumlah <= 0) return
      setNotifikasi(
        jumlah === 1
          ? `Penilaian lokal ${nama[0] || ''} berhasil disinkronkan ke server.`
          : `${jumlah} penilaian lokal berhasil disinkronkan ke server.`,
      )
      muat()
    }
    window.addEventListener(PERISTIWA_DRAF_HQ, muat)
    window.addEventListener(PERISTIWA_SINKRON_HQ, sinkron)
    window.addEventListener('online', onlineUbah)
    window.addEventListener('offline', onlineUbah)
    return () => {
      lepas()
      window.removeEventListener(PERISTIWA_DRAF_HQ, muat)
      window.removeEventListener(PERISTIWA_SINKRON_HQ, sinkron)
      window.removeEventListener('online', onlineUbah)
      window.removeEventListener('offline', onlineUbah)
    }
  }, [])

  const kirim = async () => {
    setMenyinkron(true)
    setNotifikasi('')
    const hasil = await sinkronkanDrafHq()
    setDaftar(daftarDrafHq())
    if (hasil.sukses === 0 && hasil.sisa > 0) {
      setNotifikasi(
        typeof navigator !== 'undefined' && navigator.onLine === false
          ? 'Masih offline. Penilaian tetap tersimpan di perangkat ini.'
          : 'Sinkronisasi belum berhasil. Draf tetap menunggu di perangkat ini.',
      )
    }
    setMenyinkron(false)
  }

  return { daftar, online, menyinkron, notifikasi, kirim }
}

export function BannerDrafHq({ ringkas = false }: { ringkas?: boolean }) {
  const { daftar, online, menyinkron, notifikasi, kirim } = useDrafHq()
  if (daftar.length === 0 && !notifikasi) return null

  return (
    <div className="space-y-2">
      {daftar.length > 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-sm text-amber-950">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              {online ? <Wifi className="mt-0.5 size-4 shrink-0" /> : <CloudOff className="mt-0.5 size-4 shrink-0" />}
              <div>
                <p className="font-extrabold">{STATUS_DRAF_HQ}</p>
                <p className="mt-0.5 text-xs leading-relaxed">
                  {daftar.length} penilaian tersimpan sementara di perangkat ini
                  {ringkas ? '' : ` (${daftar.map((item) => item.namaSiswa || item.idSiswa).join(', ')})`}.
                  Akan dikirim otomatis ke server saat sinyal kembali.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void kirim()}
              disabled={menyinkron || !online}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-700 bg-white px-2.5 py-1.5 text-[11px] font-bold hover:bg-amber-100 disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${menyinkron ? 'animate-spin' : ''}`} />
              {menyinkron ? 'Mengirim…' : 'Kirim sekarang'}
            </button>
          </div>
        </div>
      ) : null}
      {notifikasi ? (
        <p className="rounded-xl bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800">{notifikasi}</p>
      ) : null}
    </div>
  )
}
