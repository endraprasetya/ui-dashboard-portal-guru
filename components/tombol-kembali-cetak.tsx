'use client'

import { ArrowLeft } from 'lucide-react'
import { kembaliSatuLangkah } from '@/lib/kembali-tampilan'

export function TombolKembaliCetak({
  cadangan,
  className,
  anak = 'Kembali',
}: {
  cadangan: string
  className: string
  anak?: string
}) {
  return (
    <button type="button" onClick={() => kembaliSatuLangkah(cadangan)} className={className}>
      <ArrowLeft className="size-3.5" /> {anak}
    </button>
  )
}
