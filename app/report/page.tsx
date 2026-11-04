'use client'

import { useEffect, useState } from 'react'
import { PilihRaporSiswa } from '@/components/pilih-rapor-siswa'

export default function HalamanDaftarRapor() {
  const [user, setUser] = useState<any>(null)
  const [siap, setSiap] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user_session')
      const sesi = raw ? JSON.parse(raw) : null
      if (!sesi) {
        window.location.replace('/')
        return
      }
      setUser(sesi)
      setSiap(true)
    } catch {
      window.location.replace('/')
    }
  }, [])

  if (!siap) {
    return <main className="grid min-h-screen place-items-center text-sm text-slate-500">Memeriksa sesi…</main>
  }

  return (
    <main className="min-h-screen bg-[#f4f7f5] px-4 py-6">
      <PilihRaporSiswa currentUser={user} />
    </main>
  )
}
