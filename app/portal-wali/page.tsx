'use client'

import { useEffect, useState } from 'react'
import { Login } from '@/components/login'
import { PortalWali } from '@/components/portal-wali'
import { tujuanSetelahLogin } from '@/lib/bendahara'
import { isPortalWali } from '@/lib/portal-wali'

/** Rute aktif Parent Portal — `/portal-wali` */
export default function HalamanPortalWali() {
  const [user, setUser] = useState<Record<string, unknown> | null>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session')
      const sesi = raw ? JSON.parse(raw) : null
      if (sesi && !isPortalWali(sesi)) {
        window.location.replace(tujuanSetelahLogin(sesi))
        return
      }
      if (sesi) setUser(sesi)
    } catch {
      localStorage.removeItem('user_session')
    }
    setSiap(true)
  }, [])

  const logout = () => {
    localStorage.removeItem('user_session')
    setUser(null)
    window.location.href = '/portal-wali'
  }

  if (!siap) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memuat Portal Wali…</main>
  }

  if (!user) {
    return (
      <Login
        judulPortal="Portal Wali"
        subjudul="SD Islam Terpadu Al Madinah — untuk orang tua / wali murid"
        tombolMasuk="Masuk ke Portal Wali"
        onLoginSuccess={(akun) => {
          if (!isPortalWali(akun)) {
            const tujuan = tujuanSetelahLogin(akun)
            if (tujuan !== '/') {
              window.location.assign(tujuan)
              return
            }
            localStorage.removeItem('user_session')
            window.alert('Akun ini bukan Portal Wali. Gunakan halaman utama untuk login guru.')
            window.location.replace('/')
            return
          }
          setUser(akun)
        }}
      />
    )
  }

  return <PortalWali currentUser={user} onLogout={logout} />
}
