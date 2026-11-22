'use client'

import { createPortal } from 'react-dom'

export function DialogKonfirmasi({
  terbuka,
  judul,
  pertanyaan,
  keterangan,
  labelYa = 'OK',
  labelTidak = 'Tidak',
  berbahaya = false,
  sedang = false,
  onYa,
  onTidak,
}: {
  terbuka: boolean
  judul?: string
  pertanyaan: string
  keterangan?: string
  labelYa?: string
  labelTidak?: string
  berbahaya?: boolean
  sedang?: boolean
  onYa: () => void
  onTidak: () => void
}) {
  if (!terbuka || typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-dialog-konfirmasi"
      aria-describedby={keterangan ? 'teks-dialog-konfirmasi' : undefined}
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
        {judul ? (
          <h2 id="judul-dialog-konfirmasi" className="text-base font-extrabold text-slate-900">
            {judul}
          </h2>
        ) : null}
        <p
          id={judul ? undefined : 'judul-dialog-konfirmasi'}
          className={`text-sm leading-relaxed text-slate-800 ${judul ? 'mt-2' : 'font-semibold'}`}
        >
          {pertanyaan}
        </p>
        {keterangan ? (
          <p id="teks-dialog-konfirmasi" className="mt-2 text-xs leading-relaxed text-slate-500">
            {keterangan}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            autoFocus
            disabled={sedang}
            onClick={onTidak}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-800 hover:bg-slate-50 disabled:opacity-50"
          >
            {labelTidak}
          </button>
          <button
            type="button"
            disabled={sedang}
            onClick={onYa}
            className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50 ${
              berbahaya ? 'bg-red-600 hover:bg-red-700' : 'bg-sky-700 hover:bg-sky-800'
            }`}
          >
            {labelYa}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
