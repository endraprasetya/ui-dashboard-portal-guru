'use client'

import { X } from 'lucide-react'
import type { ReactNode } from 'react'

export function ModalKerangka({
  judul,
  keterangan,
  onTutup,
  children,
  lebar = 'max-w-3xl',
}: {
  judul: string
  keterangan?: string
  onTutup: () => void
  children: ReactNode
  lebar?: string
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/45 p-3 sm:p-4" onClick={onTutup}>
      <div
        role="dialog"
        aria-modal="true"
        className={`max-h-[90vh] w-full ${lebar} overflow-hidden rounded-2xl bg-white shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
          <div>
            <h2 className="text-sm font-extrabold text-slate-900">{judul}</h2>
            {keterangan ? <p className="mt-0.5 text-xs text-slate-500">{keterangan}</p> : null}
          </div>
          <button type="button" onClick={onTutup} className="rounded-lg p-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">
            <X className="size-4" />
          </button>
        </div>
        <div className="max-h-[calc(90vh-4rem)] overflow-y-auto px-4 py-3">{children}</div>
      </div>
    </div>
  )
}
