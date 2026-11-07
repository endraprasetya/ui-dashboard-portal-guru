'use client'

import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { EksporRaporMassal } from '@/components/ekspor-rapor-massal'

function IsiHalaman() {
  const params = useSearchParams()
  return <EksporRaporMassal asesmenAwal={params.get('asesmen') || undefined} />
}

export default function HalamanEksporRaporMassal() {
  return (
    <Suspense fallback={<main className="grid min-h-screen place-items-center text-sm text-slate-500">Menyiapkan ekspor rapor…</main>}>
      <IsiHalaman />
    </Suspense>
  )
}
