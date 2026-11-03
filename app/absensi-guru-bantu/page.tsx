'use client'

import AbsensiGuruBantu from '@/components/guru-bantu/AbsensiGuruBantu'
import { useCurrentUser } from '@/lib/guru-bantu/useCurrentUser'
import { isAdminRole } from '@/lib/guru-bantu/utils'

export default function Page() {
  const { user, loading } = useCurrentUser()

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

  return <AbsensiGuruBantu user={user} isAdmin={isAdminRole(user.role)} />
}
