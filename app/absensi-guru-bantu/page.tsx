'use client'

import { useEffect } from 'react'
import AbsensiGuruBantu from '@/components/guru-bantu/AbsensiGuruBantu'
import { useCurrentUser } from '@/lib/guru-bantu/useCurrentUser'
import { isAdminRole, isGuruBantuRole } from '@/lib/guru-bantu/utils'

export default function Page() {
  const { user, loading } = useCurrentUser()

  useEffect(() => {
    if (loading || !user) return
    if (!isGuruBantuRole(user.role)) {
      window.location.replace('/')
    }
  }, [loading, user])

  if (loading) return <p className="p-6 text-sm text-slate-500">Memuat…</p>
  if (!user) {
    return (
      <p className="p-6 text-sm text-slate-600">
        Silakan{' '}
        <a href="/" className="font-semibold text-teal-700 underline">
          login
        </a>{' '}
        untuk membuka menu ini.
      </p>
    )
  }

  if (!isGuruBantuRole(user.role)) {
    return (
      <p className="p-6 text-sm text-amber-800">
        Halaman ini hanya untuk Guru Bantu.{' '}
        <a href="/" className="font-semibold underline">
          Kembali ke Portal Guru
        </a>
      </p>
    )
  }

  return <AbsensiGuruBantu user={user} isAdmin={isAdminRole(user.role)} />
}
