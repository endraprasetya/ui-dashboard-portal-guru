'use client'

import { useEffect, useState } from 'react'
import { LogOut, Wallet } from 'lucide-react'
import { ModulKeuangan } from '@/components/kepsek/modul-keuangan'
import {
  tujuanSetelahLogin,
  validasiSesiBendahara,
  type AkunSesi,
} from '@/lib/bendahara'

export function DashboardBendahara() {
  const [siap, setSiap] = useState<'memuat' | 'siap' | 'tolak' | 'galat'>('memuat')
  const [user, setUser] = useState<AkunSesi | null>(null)
  const [galat, setGalat] = useState('')
  const [tujuan, setTujuan] = useState('/')

  useEffect(() => {
    let batal = false
    ;(async () => {
      try {
        const raw = localStorage.getItem('user_session')
        const sesi = raw ? (JSON.parse(raw) as AkunSesi) : null
        const hasil = await validasiSesiBendahara(sesi)
        if (batal) return
        if (hasil.status !== 'ok') {
          setTujuan(hasil.status === 'bukan' ? tujuanSetelahLogin(hasil.user) : '/')
          setSiap('tolak')
          return
        }
        setUser(hasil.user)
        setSiap('siap')
      } catch (error) {
        if (batal) return
        setGalat(error instanceof Error ? error.message : 'Tidak dapat memvalidasi sesi Bendahara.')
        setSiap('galat')
      }
    })()
    return () => {
      batal = true
    }
  }, [])

  useEffect(() => {
    if (siap === 'tolak') window.location.replace(tujuan)
  }, [siap, tujuan])

  const keluar = () => {
    localStorage.removeItem('user_session')
    window.location.assign('/')
  }

  if (siap === 'galat') {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="max-w-md space-y-3 text-center">
          <p className="text-sm font-semibold text-red-700">
            {galat || 'Sesi Bendahara belum dapat diverifikasi ke database.'}
          </p>
          <button type="button" onClick={keluar} className="text-xs font-bold text-emerald-800 underline">
            Kembali ke halaman masuk
          </button>
        </div>
      </main>
    )
  }

  if (siap !== 'siap' || !user) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi Bendahara...</main>
  }

  const nama = String(user.nama_lengkap || user.nama || user.username || 'Bendahara')
  const unit = String(user.unit || '').trim()
  const peran = String(user.role || 'Bendahara').trim()

  return (
    <div className="min-h-screen bg-[#f4f7f5] text-slate-800">
      <header className="border-b border-emerald-900/10 bg-[#143d32] text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-emerald-100">Dashboard Keuangan</p>
            <h1 className="text-lg font-black">Dashboard Bendahara</h1>
            <p className="text-xs text-emerald-50/80">
              {nama} · {peran}
              {unit && unit !== 'Semua Unit' ? ` · Unit ${unit}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <a href="#keuangan-tunggakan" className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
              <Wallet className="size-3.5" /> Keuangan
            </a>
            <button type="button" onClick={keluar} className="inline-flex items-center gap-1 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold">
              <LogOut className="size-3.5" /> Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-6">
        <ModulKeuangan />
      </main>
    </div>
  )
}
