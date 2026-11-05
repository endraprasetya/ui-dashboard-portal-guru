"use client";

import type { ReactNode } from "react";

/** Modal informasi resmi dengan isi teks panjang (scroll). */
export function ModalInformasiTeks({
  terbuka,
  onTutup,
  judul,
  subjudul,
  keterangan,
  children,
}: {
  terbuka: boolean;
  onTutup: () => void;
  judul: string;
  subjudul?: string;
  keterangan?: string;
  children: ReactNode;
}) {
  if (!terbuka) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="judul-modal-informasi"
      onClick={onTutup}
    >
      <div
        className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 id="judul-modal-informasi" className="text-center text-base font-extrabold uppercase tracking-wide text-emerald-900">
            {judul}
          </h2>
          {subjudul ? (
            <p className="mt-1 text-center text-xs font-bold uppercase tracking-wide text-slate-700">{subjudul}</p>
          ) : null}
          {keterangan ? <p className="mt-1 text-center text-xs font-semibold text-slate-600">{keterangan}</p> : null}
        </div>
        <div className="overflow-y-auto px-5 py-4 text-sm leading-relaxed text-slate-800">{children}</div>
        <div className="border-t border-slate-100 px-5 py-3">
          <button
            type="button"
            autoFocus
            onClick={onTutup}
            className="w-full rounded-xl bg-emerald-700 py-2.5 text-sm font-bold text-white hover:bg-emerald-800"
          >
            Saya Mengerti
          </button>
        </div>
      </div>
    </div>
  );
}
